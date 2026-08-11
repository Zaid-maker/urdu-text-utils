# Transliteration and slugs

::: warning Experimental
Read this page before putting transliteration in front of users. The limits are inherent to the writing system, not a missing feature.
:::

```ts
import { romanize, romanToUrdu, urduSlug } from "urdu-text-utils";

romanize("آپ کیسے ہیں");        // "aap kaisay hain"
romanToUrdu("mera naam zaid hai"); // "میرا نام زید ہے"
urduSlug("میرا پہلا مضمون");     // "mera-pehla-mazmoon"
```

## Why it cannot be exact

Urdu does not write short vowels. `کتب` is `k-t-b` on the page and a reader supplies the vowels from context: it is `kitab` or `kutub` depending on the sentence. No rule table can make that call, and neither direction is a function in the mathematical sense.

Going back is worse. Roman Urdu has no standard orthography — `hai`, `hay`, `he`, `hei` are all the same word, and people spell the same name four ways in one thread.

## How it works

Two layers.

**A dictionary of ~650 words** covering high-frequency vocabulary, function words, oblique verb forms (`کرنے`, `رہنے`), news and public-life vocabulary, English loanwords (`سکول`, `کمپیوٹر`) and the Roman spelling variants people actually type. Dictionary hits are exact.

**A rule fallback** for everything else:

| Rule | Example |
| --- | --- |
| Consonant + ھ is one aspirated sound | `چھوٹا` → `chh…` |
| Word-initial `و` and `ی` are consonants | `والا` → `wala`, not `oala` |
| `ی` is `e` inside a word, `i` at the end | `کھیل` → `khel`, `پڑھی` → `parhi` |
| Final `یں` is the plural ending | `سڑکیں` → `sarkein` |
| Final `ہ` is `-a`, not an audible h | `کمرہ` → `kamra` |
| One schwa after an initial consonant cluster | `رہنے` → `rehne`, not `rhne` |

The schwa is inserted once, not cascaded, so a guess never compounds across the rest of the word.

Real sentence, no dictionary gaps visible:

```ts
romanize("کراچی میں بارش کے بعد سڑکیں بند ہیں");
// "karachi mein barish ke baad sarkein band hain"
```

Known rule-layer misses: vowel quality in unseen words (`حصہ` → `hasa`, properly `hissa`) and `و` as `au` (`دوڑتا` → `dorta`, properly `daurta`). Only a lexicon fixes that class.

## Slugs

```ts
urduSlug("میرا پہلا مضمون");                        // "mera-pehla-mazmoon"
urduSlug("آپ کیسے ہیں؟");                           // "aap-kaisay-hain"
urduSlug("میرا پہلا مضمون", { separator: "_" });    // "mera_pehla_mazmoon"
urduSlug("میرا پہلا مضمون", { maxLength: 12 });     // "mera-pehla" — cut at a word boundary
urduSlug("میرا پہلا مضمون", { preserveUrdu: true }); // "میرا-پہلا-مضمون"
```

### Which mode for permanent URLs

`preserveUrdu: true` is **lossless**. The slug percent-encodes in a URL but displays as readable Urdu in browsers and is stable forever, because no dictionary is involved.

The transliterating mode is prettier in a Latin address bar but its output **can change between versions** — a word added to the dictionary changes what that word transliterates to. If you use it:

- Generate the slug once, store it on the record, and never recompute it.
- Or pin the version and accept that upgrading may need a redirect table.

This is why `urduSlug` is marked experimental while `sortUrdu` and `searchUrdu` are not: only this one has output that is allowed to drift.

## Try it

<Playground />
