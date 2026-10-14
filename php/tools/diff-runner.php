<?php

declare(strict_types=1);

namespace UrduTextUtils\Tools;

use DateTime;
use DateTimeInterface;
use DateTimeZone;
use Throwable;
use UrduTextUtils\Date;
use UrduTextUtils\Numbers;

/**
 * Differential-testing runner: executes a batch of cases against the real PHP
 * port and prints the results as JSON for scripts/diff-php.mjs to diff against
 * the real TypeScript implementation.
 *
 * This is the half that cannot be faked in JavaScript. A JS re-implementation
 * of the PHP algorithms (scripts/verify-php-parity.mjs) validates the intended
 * semantics, but only executing PHP can catch PHP's own behaviour — the
 * DateTime::createFromFormat token rules, int-vs-float casts, PCRE. The
 * differential harness is what compares the two languages' ACTUAL output.
 *
 * Protocol: reads { "cases": [ { "id", "fn", "args", "options" } ] } on stdin,
 * writes { "php", "timezone", "results": [ { "id", "v" } | { "id", "err" } ] }.
 *
 * Numbers reach the port through JSON, which cannot carry NaN or Infinity, so
 * "NAN" / "INF" / "-INF" are spelled out — the same encoding the generated
 * fixtures use (see php/tests/NumbersTest.php).
 *
 * Not part of the published package (see /php/tools in .gitattributes).
 */

// Warnings must never land on stdout: that stream carries the JSON protocol.
ini_set('display_errors', 'stderr');
error_reporting(E_ALL);

// Both runtimes are pinned to UTC so wall-clock components mean the same thing
// on each side. The JS harness sets process.env.TZ=UTC and asserts this value.
date_default_timezone_set('UTC');

$root = dirname(__DIR__);
$autoload = $root . '/vendor/autoload.php';
if (is_file($autoload)) {
    require $autoload;
} else {
    // Work without `composer install`: the port is a flat set of classes.
    foreach (glob($root . '/src/UrduTextUtils/*.php') ?: [] as $file) {
        require_once $file;
    }
}

/**
 * Decode a JSON scalar into the value the port expects. `float|int` parameters
 * accept either; the string spellings cover the values JSON cannot express.
 */
function decodeNumber(string|int|float $value): float|int
{
    if ($value === 'NAN') {
        return NAN;
    }
    if ($value === 'INF') {
        return INF;
    }
    if ($value === '-INF') {
        return -INF;
    }

    return $value;
}

/** Normalize an outcome for JSON: NaN/Infinity are not representable. */
function encodeResult(mixed $value): mixed
{
    if (is_float($value)) {
        if (is_nan($value)) {
            return 'NAN';
        }
        if (is_infinite($value)) {
            return $value > 0 ? 'INF' : '-INF';
        }
    }

    return $value;
}

/**
 * A DateTime as wall-clock components, the same shape the formatUrduDate cases
 * take as input — so the two sides compare components, not absolute instants.
 *
 * @return array{y: int, m: int, d: int, hh: int, mm: int, ss: int}|null
 */
function componentsOf(?DateTimeInterface $date): ?array
{
    if ($date === null) {
        return null;
    }

    return [
        'y' => (int) $date->format('Y'),
        'm' => (int) $date->format('n') - 1,
        'd' => (int) $date->format('j'),
        'hh' => (int) $date->format('G'),
        'mm' => (int) $date->format('i'),
        'ss' => (int) $date->format('s'),
    ];
}

/** Build a DateTime from wall-clock components in UTC. */
function dateFromComponents(array $comps): DateTime
{
    $built = DateTime::createFromFormat(
        'Y-m-d H:i:s',
        sprintf(
            '%04d-%02d-%02d %02d:%02d:%02d',
            $comps['y'],
            $comps['m'] + 1,
            $comps['d'],
            $comps['hh'] ?? 0,
            $comps['mm'] ?? 0,
            $comps['ss'] ?? 0
        ),
        new DateTimeZone('UTC')
    );
    if ($built === false) {
        throw new \RuntimeException('unbuildable components ' . json_encode($comps));
    }

    return $built;
}

/**
 * Execute one case against the real port.
 *
 * @param array{id: int, fn: string, args: list<mixed>, options: array<string, mixed>} $case
 */
function run(array $case): mixed
{
    $fn = $case['fn'];
    $args = $case['args'];
    $options = $case['options'] ?? [];

    return match ($fn) {
        'toUrduDigits' => Numbers::toUrduDigits($args[0]),
        'toEnglishDigits' => Numbers::toEnglishDigits($args[0]),
        'toArabicIndicDigits' => Numbers::toArabicIndicDigits($args[0]),
        'convertNumbers' => Numbers::convertNumbers($args[0], $args[1] ?? 'urdu'),
        'parseUrduNumber' => encodeResult(Numbers::parseUrduNumber($args[0])),
        'numberToUrduWords' => Numbers::numberToUrduWords(decodeNumber($args[0])),
        'formatUrduNumber' => Numbers::formatUrduNumber(decodeNumber($args[0]), $options),
        'formatUrduCurrency' => Numbers::formatUrduCurrency(decodeNumber($args[0]), $options),
        'toUrduOrdinal' => Numbers::toUrduOrdinal(decodeNumber($args[0]), $options),
        'getUrduMonthName' => Date::getUrduMonthName($args[0], $args[1] ?? 'gregorian'),
        'getUrduWeekdayName' => Date::getUrduWeekdayName($args[0]),
        'formatUrduDate' => Date::formatUrduDate(
            dateFromComponents($args[0]),
            $args[1] ?? 'DD MMMM YYYY',
            $options
        ),
        'parseUrduDate' => componentsOf(Date::parseUrduDate($args[0], $options)),
        'timeAgoUrdu' => Date::timeAgoUrdu(
            new DateTime('@' . ($args[0]['baseSec'] + $args[0]['offsetSeconds'])),
            new DateTime('@' . $args[0]['baseSec']),
            $options
        ),
        default => throw new \RuntimeException("unknown case function {$fn}"),
    };
}

$raw = stream_get_contents(STDIN);
if ($raw === false || trim($raw) === '') {
    fwrite(STDERR, "diff-runner: no input on stdin\n");
    exit(2);
}

try {
    $payload = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
} catch (\JsonException $e) {
    fwrite(STDERR, 'diff-runner: invalid JSON input: ' . $e->getMessage() . "\n");
    exit(2);
}

$results = [];
foreach ($payload['cases'] as $case) {
    try {
        $results[] = ['id' => $case['id'], 'v' => run($case)];
    } catch (Throwable $e) {
        // Error parity is itself a differential property: the harness checks
        // that both languages reject the same inputs.
        $name = $e::class;
        $pos = strrpos($name, '\\');
        $results[] = ['id' => $case['id'], 'err' => $pos === false ? $name : substr($name, $pos + 1)];
    }
}

echo json_encode(
    [
        'php' => PHP_VERSION,
        'timezone' => date_default_timezone_get(),
        'results' => $results,
    ],
    JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
);
