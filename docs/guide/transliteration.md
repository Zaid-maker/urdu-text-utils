# Roman Urdu, transliteration & slugs

Use the function that matches the job. **Spelling normalization is not translation**, and transliteration cannot recover vowels or meaning that the source text does not contain.

| You want to… | Use | Example |
| --- | --- | --- |
| Standardize known Roman Urdu spelling variants | `normalizeRomanUrdu` | `hay` → `hai` |
| Write Urdu-script text in Latin letters | `romanize` | `آپ` → `aap` |
| Convert Roman Urdu into Urdu script | `romanToUrdu` | `mera` → `میرا` |
| Make a URL slug from an Urdu title | `urduSlug` | `میرا مضمون` → `mera-mazmoon` |

```ts
import { normalizeRomanUrdu, romanize, romanToUrdu, urduSlug } from "urdu-text-utils";

normalizeRomanUrdu("Hay, kese ho?"); // "Hai, kaisay ho?"
romanize("آپ کیسے ہیں");              // "aap kaisay hain"
romanToUrdu("mera naam zaid hai");   // "میرا نام زید ہے"
urduSlug("میرا پہلا مضمون");          // "mera-pehla-mazmoon"
```

## Normalize Roman Urdu spelling

`normalizeRomanUrdu` replaces known Roman Urdu spellings with the package's preferred Roman spelling. Unknown words are left alone.

```ts
normalizeRomanUrdu("kia haal hai?"); // "kya haal hai?"
normalizeRomanUrdu("Hay, kese ho?"); // "Hai, kaisay ho?"
normalizeRomanUrdu("ap ne kia kaha?"); // "ap ne kya kaha?"
```

It preserves punctuation and spacing. Matching is case-insensitive; all-caps and title-case words keep that casing in the result. Other matched variants use the canonical spelling's lowercase form.

### Add spellings for your data

Short spellings are intentionally excluded from the built-in aliases because they can be ordinary English words. Add or override them only when you know the input is Roman Urdu:

```ts
normalizeRomanUrdu("ap ne kia kaha?", {
  customVariants: {
    ap: "aap",
    kese: "kaise",
  },
});
// "aap ne kya kaha?"
```

`customVariants` is a case-insensitive map from an observed spelling to the spelling you want to keep. This is useful for choosing a house style or handling common spellings in your own messages and corpus. It does not infer a word's meaning, translate it, or convert it to Urdu script.

::: tip Keep mixed-language text safe
Apply the normalizer to text you have identified as Roman Urdu. A Latin word can be English or Roman Urdu depending on context; use custom variants for known data rather than broadly rewriting every English message.
:::

## Transliteration is approximate

Urdu script omits short vowels. `کتب` can be read as *kitab* or *kutub*, depending on context, so no character-by-character mapping can always choose correctly. The reverse direction is also ambiguous: Roman Urdu has no standard spelling, and `hai`, `hay`, `he`, and `hei` can represent the same Urdu word.

`romanize` uses a dictionary of common words, then applies spelling rules to words it does not know. `romanToUrdu` uses the same dictionary and its known spelling variants, then falls back to approximate letter rules. Treat both as best-effort tools, not language translation or spell correction.

Some rules used by `romanize`:

| Urdu pattern | Example |
| --- | --- |
| Aspirated consonants (`چھ`, `کھ`) | `چھوٹا` → `chh…` |
| Word-initial `و` and `ی` are consonants | `والا` → `wala`, `یار` → `yaar` |
| `ی` varies by position | `کھیل` → `khel`, `پڑھی` → `parhi` |
| Word-final `یں` | `سڑکیں` → `sarkein` |
| Word-final `ہ` | `کمرہ` → `kamra` |

```ts
romanize("کراچی میں بارش کے بعد سڑکیں بند ہیں");
// "karachi mein barish ke baad sarkein band hain"
```

Unseen words can have the wrong vowel: `حصہ` may come out `hasa` instead of `hissa`, and `دوڑتا` may come out `dorta` instead of `daurta`. Review output before showing it to users or using it in permanent identifiers.

### Search is not cross-script

`searchUrdu` folds Urdu-script spelling variants and diacritics. It does not transliterate Roman Urdu queries or automatically match Roman Urdu text against Urdu-script records. If you convert text for indexing, keep the original value and validate conversions against your data; transliteration is lossy.

## Urdu URL slugs

```ts
urduSlug("میرا پہلا مضمون");                          // "mera-pehla-mazmoon"
urduSlug("آپ کیسے ہیں؟");                             // "aap-kaisay-hain"
urduSlug("میرا پہلا مضمون", { separator: "_" });      // "mera_pehla_mazmoon"
urduSlug("میرا پہلا مضمون", { maxLength: 12 });       // "mera-pehla"
urduSlug("میرا پہلا مضمون", { preserveUrdu: true });  // "میرا-پہلا-مضمون"
```

For permanent URLs, `preserveUrdu: true` is lossless and does not depend on the transliteration dictionary. Otherwise, generate a slug once and store it: a future dictionary improvement may change the Roman spelling. If slugs are recomputed, keep redirects for old URLs.

## Try it

<Playground />
