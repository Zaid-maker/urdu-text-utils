<?php

declare(strict_types=1);

namespace UrduTextUtils\Tests;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use UrduTextUtils\Collator;

final class CollatorTest extends TestCase
{
    public static function cases(): array
    {
        $fixtures = json_decode((string) file_get_contents(__DIR__ . '/fixtures/collate.json'), true, 512, JSON_THROW_ON_ERROR);
        return array_map(static fn ($case) => [$case], $fixtures);
    }

    #[DataProvider('cases')]
    public function testMatchesTypeScriptFixture(array $case): void
    {
        $expected = $case['expected'];
        $actual = match ($case['fn']) {
            'compareUrdu' => Collator::compareUrdu($case['args'][0], $case['args'][1]),
            'sortUrdu' => Collator::sortUrdu($case['args'][0], $case['options']),
        };
        $this->assertSame($expected, $actual, $case['fn'] . ' ' . json_encode($case['args'], JSON_UNESCAPED_UNICODE));
    }
}
