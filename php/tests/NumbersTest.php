<?php

declare(strict_types=1);

namespace UrduTextUtils\Tests;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use UrduTextUtils\Numbers;

final class NumbersTest extends TestCase
{
    public static function cases(): array
    {
        $fixtures = json_decode((string) file_get_contents(__DIR__ . '/fixtures/numbers.json'), true, 512, JSON_THROW_ON_ERROR);
        return array_map(static fn ($case) => [$case], $fixtures);
    }

    #[DataProvider('cases')]
    public function testMatchesTypeScriptFixture(array $case): void
    {
        $expected = $case['expected'];
        $actual = match ($case['fn']) {
            'toUrduDigits' => Numbers::toUrduDigits($case['args'][0]),
            'toEnglishDigits' => Numbers::toEnglishDigits($case['args'][0]),
            'toArabicIndicDigits' => Numbers::toArabicIndicDigits($case['args'][0]),
            'convertNumbers' => Numbers::convertNumbers($case['args'][0], $case['args'][1] ?? 'urdu'),
            'parseUrduNumber' => Numbers::parseUrduNumber($case['args'][0]),
            'numberToUrduWords' => Numbers::numberToUrduWords(self::arg($case['args'][0])),
        };

        if ($expected === 'NAN') {
            $this->assertTrue(is_nan($actual), $case['fn'] . ' expected NaN for ' . json_encode($case['args']));
            return;
        }
        if ($case['fn'] === 'parseUrduNumber') {
            // Parse results are floats; the fixtures carry JSON numbers.
            $this->assertEquals($expected, $actual, 'parseUrduNumber ' . json_encode($case['args']));
            return;
        }
        $this->assertSame($expected, $actual, $case['fn'] . ' ' . json_encode($case['args']));
    }

    /** JSON cannot carry NaN/Infinity, so fixtures spell them out. */
    private static function arg(string|int|float $value): float
    {
        if ($value === 'NAN') {
            return NAN;
        }
        if ($value === 'INF') {
            return INF;
        }
        return (float) $value;
    }
}
