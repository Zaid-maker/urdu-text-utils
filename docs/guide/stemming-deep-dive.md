# Morphological Analysis: Stemming & Affix Breakdown

The Urdu stemmer reduces an inflected word to its root so that different surface forms of the same word can be treated as one. It is the layer between raw text and anything you want to count, index, or embed: search, TF-IDF, keyword extraction, and RAG preprocessing all start here.

This page is the companion to the [quick start](/guide/stemming). Read this one when you need to decide whether stemming is the right tool, understand why a stem looks the way it does, or wire the stemmer into a pipeline.

## What it actually does

Most Urdu words change shape when they carry grammatical information: plurals, case markers, tense, negation, and derivational suffixes built from Arabic and Persian loan morphology. The stemmer strips those in a fixed order — suffixes first, then prefixes — and restores vowel and letter mutations that the inflected form obscures.

```ts
import { stemUrdu, stemUrduText, getAffixes } from "urdu-text-utils";

stemUrdu("کتابیں");     // "کتاب"   -- plural ending removed
stemUrdu("لڑکیاں");     // "لڑکی"   -- final ی restored after -یں
stemUrdu("دعاؤں");      // "دعا"    -- plural ending removed, base restored
stemUrdu("بےوقوف");     // "وقوف"   -- prefix بے stripped
stemUrdu("نااہل");      // "اہل"    -- prefix نا stripped
stemUrdu("دکاندار");    // "دکان"   -- derivational suffix -دار stripped
stemUrdu("پڑھتے");      // "پڑھ"    -- verbal inflection stripped
stemUrdu("پڑھیںگے");    // "پڑھ"    -- compound future tense reduced
stemUrdu("خوبصورت ترین"); // "خوبصورت" -- superlative suffix removed
```

The function is deterministic and pure: same input always gives the same stem, and nothing outside the word is needed. That makes it safe to run during indexing, on every request, or in a build step.

## When stemming helps

Stemming is most useful when you care about the word rather than the word form. A few concrete cases:

- **Search indexing.** Index `کتاب`, `کتابیں`, `کتابوں` under the same token so a query for one matches all of them.
- **Term frequency counts.** Counting "how often does this root appear" is more meaningful than counting literal tokens, because Urdu writes most short vowels and a lot of inflection is morphological.
- **Keyword extraction.** Reduce a paragraph to its roots, then rank the frequent ones. Stop words still need to be removed separately — the stemmer does not know which roots are meaningless in context.
- **Embeddings and RAG preprocessing.** A chunk represented by stemmed tokens is less sensitive to inflectional variation, which can improve retrieval when the query and the document use different forms of the same word.

When stemming is the wrong tool: when you need the exact surface form back (never stem the stored text, only the index), when the root itself is ambiguous without context (a rule stemmer cannot decide between senses), or when you are working with proper nouns and fixed terms that should never be broken — for those, see the protection rules below.

## The two affix layers

Urdu morphology is layered. The stemmer models two layers explicitly: prefixes (سابقے) applied before the base, and suffixes (لاحقے) applied after. They are stripped in a fixed order so the result is stable regardless of how many affixes a word carries.

```ts
getAffixes("بےوقوف");
// { prefix: "بے", stem: "وقوف", suffix: undefined }

getAffixes("کتابیں");
// { prefix: undefined, stem: "کتاب", suffix: "یں" }

getAffixes("دکاندار");
// { prefix: undefined, stem: "دکان", suffix: "دار" }

getAffixes("غیرملکیوں");
// { prefix: "غیر", stem: "ملکی", suffix: "یوں" }
```

The exported lists are canonical, not exhaustive. `URDU_PREFIXES` and `URDU_SUFFIXES` are the rules the stemmer applies by default; if your domain has a suffix the list does not cover, add it with `customSuffixes` rather than editing the canonical set. The shapes the stemmer works with are the exported types — `StemmerOptions` for configuration and `AffixBreakdown` for the result of `getAffixes` — and custom prefix lists live on `customPrefixes`.

```ts
import { URDU_PREFIXES, URDU_SUFFIXES } from "urdu-text-utils";

URDU_PREFIXES; // ["غیر", "خود", "اہل", "بے", "نا", "لا", "بد", "کم", "ان", "ہم", "با", "پُر"]
URDU_SUFFIXES; // ["یںگے", "داری", "کاری", "ترین", "دار", "یاں", ...]
```

## Why the stem is not always the literal remainder

Urdu words mutate when they inflect, so stripping the ending is not enough — the stem has to be restored. Three restoration rules handle the common cases.

### Feminine plurals: -یاں and -یوں

These plurals end in a long vowel that is not part of the base. When the plural ending is removed, the final `ی` of the base is restored.

```ts
stemUrdu("لڑکیاں"); // "لڑکی"   -- لڑکی + یں
stemUrdu("کہانیاں"); // "کہانی"  -- کہانی + یں
stemUrdu("گاڑیوں"); // "گاڑی"   -- گاڑی + وں
```

### Hamza plurals: -ئیں and -ؤں

Some roots end in a vowel that is written with a hamza. The plural ending displaces it; removing the ending must restore the base vowel so the stem is a real word.

```ts
stemUrdu("دعائیں"); // "دعا"   -- دعا + ئیں
stemUrdu("دعاؤں");  // "دعا"   -- دعا + ؤں
stemUrdu("خوشبوئیں"); // "خوشبو" -- خوشبو + ئیں
stemUrdu("خوشبوؤں");  // "خوشبو" -- خوشبو + ؤں
```

### Sound plurals: -ات and -جات

Arabic and Persian loanwords frequently form plurals this way. The stemmer strips the ending and leaves what is left.

```ts
stemUrdu("تعلیمات"); // "تعلیم"
stemUrdu("احساسات"); // "احساس"
stemUrdu("معلومات");  // "معلوم"
```

These rules are why `stemUrdu("لڑکیاں")` returns `لڑکی` rather than `لڑک`. Without the restoration, the stem would not be a word a reader recognizes, and downstream indexing would treat it as something different from the base.

## What the stemmer does not do

- **It does not disambiguate senses.** ` divisive morphology` — one written form, two meanings — is not resolved. A rule stemmer only strips form, never chooses meaning.
- **It does not hand-build exceptions for every word.** The protected-word list prevents the most common false breaks, and the `exceptions` option handles the rest on a per-project basis.
- **It does not preserve the original form.** Once stemmed, you cannot reliably get the surface form back. If you need the original text for display, keep it alongside the index, not inside it.
- **It is not a parser.** The result is a root or near-root, not a linguistically annotated token. If you need part-of-speech or dependency structure, that is a different tool.

## Constraining the stemmer

The defaults are tuned for ordinary prose. The options exist because real projects vary.

### Shorter or longer stems

`minStemLength` stops the stemmer from chewing a short word down to almost nothing.

```ts
stemUrdu("کتاب", { minStemLength: 3 }); // "کتاب"
stemUrdu("کتاب", { minStemLength: 2 }); // "کتاب"
```

Raise it when your text is full of short roots you do not want broken; lower it when you want more aggressive reduction.

### Disabling one layer

If you only want suffixes stripped — for example, when prefixes are meaningful in your domain — turn the other off.

```ts
stemUrdu("بےوقوف", { stripPrefixes: false }); // "بےوقوف"
stemUrdu("کتابیں", { stripSuffixes: false }); // "کتابیں"
```

### Custom affix lists

When the canonical list misses a suffix your corpus uses, add it locally.

```ts
stemUrdu("خوبصورتی", {
  customSuffixes: ["صورتی"],
});
```

Custom lists replace the canonical ones for that call; they do not extend them. Pass both lists if you need the canonical rules plus a project-specific addition — but in practice it is cleaner to add to the canonical list upstream than to repeat it per call.

### Per-word exceptions

When a word's stem is not what the rules produce — a borrowed term, a fixed technical term, a proper noun — map it directly.

```ts
stemUrdu("خصوصی", {
  exceptions: {
    خصوصی: "خاص",
  },
});
// "خاص"
```

The `exceptions` map is matched before any stripping, so it wins over the rules. Use it sparingly: a long exception list is usually a sign that the rules should be adjusted rather than worked around.

## Protected words

Some short words look like they contain a prefix or suffix but are actually irreducible. The protected-word list is the safety net that keeps the stemmer from breaking them.

```ts
import { PROTECTED_WORDS } from "urdu-text-utils";

// These stay intact even though they look strippable
stemUrdu("نام");   // "نام"
stemUrdu("کار");   // "کار"
stemUrdu("باغ");   // "باغ"
stemUrdu("ہاتھ");  // "ہاتھ"
```

The canonical list covers common cases across everyday text. If your domain introduces a new one — a technical term that is also a valid word shape — add it to `exceptions` for that project rather than editing the shared list.

## A real pipeline: index a document

A minimal indexing pipeline for Urdu text. This is the shape most projects actually want — it is not the only one, but it covers the common case of "normalize, clean, stem, tokenize, store."

```ts
import {
  normalizeUrdu,
  removeDiacritics,
  stemUrduText,
  splitWords,
  filterStopWords,
  foldUrdu,
} from "urdu-text-utils";

function indexDocument(raw: string) {
  const normalized = normalizeUrdu(raw);
  const clean = removeDiacritics(normalized);
  const stemmed = stemUrduText(clean);
  const tokens = splitWords(stemmed);
  const meaningful = filterStopWords(tokens);
  const folded = meaningful.map(foldUrdu);
  return new Set(folded);
}

const doc = "طلباء کتابیں پڑھتے ہیں اور کہانیاں سنتے ہیں۔";
const index = indexDocument(doc);
// Set holding stemmed, folded, stop-word-free tokens
```

Notice what is layered here and why each step is separate: normalization handles script variance, diacritic removal handles harakat, stemming handles inflection, tokenization splits on word boundaries, stop-word removal drops the high-frequency function words that dominate counts, and folding produces the comparison key used at query time. You can drop any of these steps when the project does not need it — they compose because each one is pure.

For the matching side at query time, fold the query the same way and compare against the stored set. For ranked search, use `searchUrdu` or `searchUrduRanked` instead of rolling your own; they already fold and score for you.

## For embeddings and RAG

When preparing Urdu text for a downstream model or a retrieval index, the common goal is fewer surface-form variants and more stable tokens. The same pipeline above applies, with two pragmatic notes:

- **Stem before tokenization** so the tokenizer sees fewer distinct forms. `stemUrduText` preserves punctuation and whitespace, so it is safe to run on a chunk before splitting.
- **Keep the original text** for retrieval display and for any human review. The stem is an index form, not a display form.

If the downstream model already does its own subword tokenization, stemming is less important and sometimes counterproductive — a model trained on Urdu surface forms may not benefit from pre-stemming. Test on your own data before assuming the stemmer helps.

## A real pipeline: extract candidate keywords

A simple keyword extractor from a block of Urdu text.

```ts
import { analyzeUrdu, stemUrduText, splitWords, filterStopWords, urduRatio } from "urdu-text-utils";

function candidateKeywords(raw: string, top: number = 10) {
  const stats = analyzeUrdu(raw);
  if (stats.words === 0) return [];

  const clean = stemUrduText(removeDiacritics(normalizeUrdu(raw)));
  const tokens = splitWords(clean);
  const meaningful = filterStopWords(tokens);

  const counts = new Map<string, number>();
  for (const t of meaningful) {
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, top)
    .map(([word]) => word);
}

candidateKeywords("پاکستان ایک خوبصورت ملک ہے۔ اس کی تاریخ پرانی ہے۔ اس کی آبادی زیادہ ہے۔");
// a few stemmed, stop-word-free candidates, ranked by frequency
```

This is a starting heuristic, not a production ranking. Real keyword extraction usually adds IDF across a corpus, length filters, and a notion of what counts as a "term" in your domain. The stemmer's job here is only to reduce the token set so the ranker sees fewer near-duplicates.

## Troubleshooting

**The stem looks wrong.** Check whether the word is actually in the protected list, whether an exception would be clearer than a rule change, and whether the "wrong" stem is a sense the rules cannot distinguish. If the word is a proper noun or fixed term, protect it rather than trying to make the stemmer smarter.

**The stem is empty or too short.** Lower the aggressiveness: raise `minStemLength`, disable one of the two layers, or add the word to exceptions. The default `minStemLength` of 2 is conservative; if you are seeing over-stemming on short roots, raising it almost always helps.

**A word I expected to stem did not.** It is probably either protected, too short, or not matching any rule in the list. Log the result of `getAffixes` on that word — it tells you exactly which layer did nothing.

**The index and query do not match.** The most common cause is that they were prepared differently. Make sure both sides run the same sequence — normalize, remove diacritics, stem, fold — and that neither side is accidentally skipping a step.

## Where this sits in the toolkit

The stemmer is one piece of a text-processing chain, not a standalone product. The parts it relies on are the same functions used elsewhere in the library: normalization for script variance, diacritic removal for harakat, tokenization for splitting, stop-word lists for the high-frequency noise, and folding for comparison. The stemmer adds one more step — morphological reduction — on top of that chain.

The constants it exports (`URDU_PREFIXES`, `URDU_SUFFIXES`, `PROTECTED_WORDS`) are also consumed by the PHP port through generated tables, so the same affix lists apply on both sides. If you change the stemmer's rules, regenerate the tables.
