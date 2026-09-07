<?php

declare(strict_types=1);

namespace UrduTextUtils\Tests;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use UrduTextUtils\Search;

final class SearchTest extends TestCase
{
    public static function cases(): array
    {
        $fixtures = json_decode((string) file_get_contents(__DIR__ . '/fixtures/search.json'), true, 512, JSON_THROW_ON_ERROR);
        return array_map(static fn ($case) => [$case], $fixtures);
    }

    #[DataProvider('cases')]
    public function testMatchesTypeScriptFixture(array $case): void
    {
        $expected = $case['expected'];
        $actual = match ($case['fn']) {
            'searchUrduRanked' => Search::searchUrduRanked($case['args'][0], $case['args'][1], $case['options']),
            'editDistance' => Search::editDistance($case['args'][0], $case['args'][1], $case['args'][2] ?? INF),
            'highlightUrdu' => Search::highlightUrdu($case['args'][0], $case['args'][1]),
        };

        if ($case['fn'] === 'editDistance' && $expected === 'NAN') {
            $this->assertTrue(is_nan($actual));
            return;
        }
        if ($case['fn'] === 'searchUrduRanked') {
            // Scores are floats; compare with tolerance via assertEquals.
            $this->assertEquals($expected, $actual, 'searchUrduRanked ' . json_encode($case['args'], JSON_UNESCAPED_UNICODE));
            return;
        }
        $this->assertSame($expected, $actual, $case['fn'] . ' ' . json_encode($case['args'], JSON_UNESCAPED_UNICODE));
    }
}
