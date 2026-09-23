<?php

declare(strict_types=1);

namespace UrduTextUtils\Tests;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use UrduTextUtils\Date;

final class DateTest extends TestCase
{
    public static function cases(): array
    {
        $fixtures = json_decode((string) file_get_contents(__DIR__ . '/fixtures/date.json'), true, 512, JSON_THROW_ON_ERROR);

        return array_map(static fn ($case) => [$case], $fixtures);
    }

    #[DataProvider('cases')]
    public function testMatchesTypeScriptFixture(array $case): void
    {
        $expected = $case['expected'];
        $actual = match ($case['fn']) {
            'getUrduMonthName' => Date::getUrduMonthName($case['args'][0], $case['args'][1] ?? 'gregorian'),
            'getUrduWeekdayName' => Date::getUrduWeekdayName($case['args'][0]),
            'formatUrduDate' => Date::formatUrduDate(
                self::dateInput($case['args'][0]),
                $case['args'][1] ?? 'DD MMMM YYYY',
                $case['options']
            ),
            'timeAgoUrdu' => Date::timeAgoUrdu(
                self::epochInput($case['args'][0]['baseSec'], $case['args'][0]['offsetSeconds']),
                self::epochInput($case['args'][0]['baseSec'], 0),
                $case['options']
            ),
        };
        $this->assertSame($expected, $actual, $case['fn'] . ' ' . json_encode($case['args'], JSON_UNESCAPED_UNICODE));
    }

    /**
     * formatUrduDate fixtures carry wall-clock components; the DateTime is
     * built in THIS runtime's default zone, mirroring how the TS generator
     * built its Date in its own local zone.
     *
     * @param array{y: int, m: int, d: int, hh?: int, mm?: int, ss?: int} $comps
     */
    private static function dateInput(array $comps): \DateTime
    {
        return new \DateTime(sprintf(
            '%04d-%02d-%02d %02d:%02d:%02d',
            $comps['y'],
            $comps['m'] + 1,
            $comps['d'],
            $comps['hh'] ?? 0,
            $comps['mm'] ?? 0,
            $comps['ss'] ?? 0
        ));
    }

    /** timeAgoUrdu fixtures carry epoch seconds only — no wall clock involved. */
    private static function epochInput(int $baseSec, int $offsetSeconds): \DateTime
    {
        return \DateTime::createFromFormat('U', (string) ($baseSec + $offsetSeconds))
            ->setTimezone(new \DateTimeZone(date_default_timezone_get()));
    }
}
