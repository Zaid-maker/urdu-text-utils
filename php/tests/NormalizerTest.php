<?php

declare(strict_types=1);

namespace UrduTextUtils\Tests;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use UrduTextUtils\Normalizer;

final class NormalizerTest extends TestCase
{
    public static function cases(): array
    {
        $fixtures = json_decode((string) file_get_contents(__DIR__ . '/fixtures/normalize.json'), true, 512, JSON_THROW_ON_ERROR);
        return array_map(static fn ($case) => [$case], $fixtures);
    }

    #[DataProvider('cases')]
    public function testMatchesTypeScriptFixture(array $case): void
    {
        $expected = $case['expected'];
        $actual = match ($case['fn']) {
            'normalizeUrdu' => Normalizer::normalizeUrdu($case['args'][0], $case['options']),
            'removeDiacritics' => Normalizer::removeDiacritics($case['args'][0]),
            'foldUrdu' => Normalizer::foldUrdu($case['args'][0]),
        };
        $this->assertSame($expected, $actual, $case['fn'] . ' ' . json_encode($case['args'], JSON_UNESCAPED_UNICODE));
    }
}
