# Urdu Stemmer & Morphological Affix Stripping

`urdu-text-utils` includes a rule-based **Urdu Stemmer** designed to strip grammatical inflections (plurals, case markers, tense indicators, negation prefixes, and adjectival suffixes) while applying morphological restoration rules.

Stemming is essential for **search engine indexing**, **TF-IDF scoring**, **keyword extraction**, and **AI/LLM embeddings preprocessing** (RAG pipelines).

## Quick start

```ts
import { stemUrdu, stemUrduText, getAffixes } from "urdu-text-utils";

// Plurals & case inflections
stemUrdu("کتابیں");     // "کتاب"
stemUrdu("کتابوں");     // "کتاب"
stemUrdu("خبریں");      // "خبر"

// Morphological vowel/letter restoration
stemUrdu("لڑکیاں");     // "لڑکی" (restores final ی)
stemUrdu("کہانیاں");    // "کہانی"
stemUrdu("دعائیں");      // "دعا"
stemUrdu("دعاؤں");      // "دعا"
stemUrdu("خوشبوئیں");   // "خوشبو"

// Prefixes (سابقے)
stemUrdu("بےوقوف");     // "وقوف"
stemUrdu("نااہل");      // "اہل"
stemUrdu("غیرملکی");    // "ملکی"
stemUrdu("ہمسفر");      // "سفر"

// Derivational suffixes (لاحقے)
stemUrdu("دکاندار");    // "دکان"
stemUrdu("وفاداری");    // "وفا"
stemUrdu("مددگار");     // "مدد"
stemUrdu("ضرورتمند");   // "ضرورت"

// Verb inflections
stemUrdu("پڑھتے");      // "پڑھ"
stemUrdu("کھاتی");      // "کھا"
stemUrdu("پڑھیںگے");    // "پڑھ"
```

## `stemUrduText(text, options?)`

Stems all words in a sentence or document while preserving whitespace, line breaks, and punctuation.

```ts
const text = "طلباء کتابیں پڑھتے ہیں اور کہانیاں سنتے ہیں۔";
stemUrduText(text);
// "طلباء کتاب پڑھ ہیں اور کہانی سن ہیں۔"
```

## `getAffixes(word, options?)`

Breaks an Urdu word down into its prefix, stem, and suffix components.

```ts
getAffixes("بےوقوف");
// { prefix: "بے", stem: "وقوف", suffix: undefined }

getAffixes("کتابیں");
// { prefix: undefined, stem: "کتاب", suffix: "یں" }

getAffixes("دکاندار");
// { prefix: undefined, stem: "دکان", suffix: "دار" }

getAffixes("لڑکیاں");
// { prefix: undefined, stem: "لڑکی", suffix: "یاں" }
```

## Morphological Restoration Rules

Urdu words undergo vowel and letter mutations when inflected. `urdu-text-utils` restores base roots:

1. **Feminine Plurals (`-یاں` / `-یوں`)**: Restores final `ی` (*لڑکیاں* → *لڑکی*, *کہانیاں* → *کہانی*, *روٹیاں* → *روٹی*, *گاڑیاں* → *گاڑی*).
2. **Hamza Plurals (`-ئیں` / `-ؤں`)**: Restores base vowel (*دعائیں* / *دعاؤں* → *دعا*, *ہوائیں* / *ہواؤں* → *ہوا*, *خوشبوئیں* / *خوشبوؤں* → *خوشبو*).
3. **Sound Plurals (`-ات` / `-جات`)**: Strips plural markers from Arabic/Persian loans (*تعلیمات* → *تعلیم*, *احساسات* → *احساس*, *معلومات* → *معلوم*).

## Options

```ts
interface StemmerOptions {
  /**
   * Whether to strip canonical Urdu prefixes (e.g. بے-, نا-, غیر-, لا-).
   * @default true
   */
  stripPrefixes?: boolean;

  /**
   * Whether to strip canonical Urdu suffixes (e.g. -وں, -یں, -یاں, -دار, -تے).
   * @default true
   */
  stripSuffixes?: boolean;

  /**
   * Minimum character length of the remaining root word.
   * Prevents over-stemming of short roots.
   * @default 2
   */
  minStemLength?: number;

  /**
   * Custom list of prefixes to strip.
   */
  customPrefixes?: string[];

  /**
   * Custom list of suffixes to strip.
   */
  customSuffixes?: string[];

  /**
   * Map of exact exception words to their canonical stems.
   */
  exceptions?: Record<string, string>;
}
```

### Disabling Prefix or Suffix Stripping

```ts
// Only strip suffixes (keep prefixes intact)
stemUrdu("بےوقوف", { stripPrefixes: false }); // "بےوقوف"

// Only strip prefixes (keep suffixes intact)
stemUrdu("کتابیں", { stripSuffixes: false }); // "کتابیں"
```

### Custom Exceptions Dictionary

```ts
stemUrdu("خصوصی", {
  exceptions: {
    خصوصی: "خاص",
  },
});
// "خاص"
```

## Constants

```ts
import { URDU_PREFIXES, URDU_SUFFIXES } from "urdu-text-utils";

URDU_PREFIXES; // ["غیر", "خود", "اہل", "بے", "نا", "لا", ...]
URDU_SUFFIXES; // ["یںگے", "داری", "کاری", "ترین", "دار", "یاں", ...]
```
