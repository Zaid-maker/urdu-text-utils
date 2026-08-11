# Statistics

```ts
import { analyzeUrdu, countWords, countSentences, splitWords, splitSentences } from "urdu-text-utils";

analyzeUrdu("پاکستان ایک خوبصورت ملک ہے۔ اس کی آبادی زیادہ ہے۔");
```

```json
{
  "characters": 49,
  "charactersNoSpaces": 40,
  "words": 10,
  "sentences": 2,
  "paragraphs": 1,
  "urduPercentage": 100,
  "diacritics": 0,
  "digits": 0,
  "averageWordsPerSentence": 5,
  "readingTimeMinutes": 0.1
}
```

## Counting words

```ts
countWords("پاکستان ایک خوبصورت ملک ہے");  // 5
countWords("پاکستان ایک خوبصورت ملک ہے۔"); // 5 — the ۔ is not a word
countWords("آپ کیسے ہیں؟");                // 3
```

Splitting on `/\s+/` alone leaves `ہے۔` attached and counts Urdu punctuation as part of the word. The split here covers whitespace plus Urdu punctuation (`،` `؛` `؟` `۔` `٫` `٬`) and the ASCII set.

`splitWords(text)` returns the tokens themselves — the starting point for an index, a tag extractor or a highlighter.

## Counting sentences

```ts
countSentences("یہ پہلا جملہ ہے۔ یہ دوسرا ہے۔"); // 2
countSentences("آپ کیسے ہیں؟ میں ٹھیک ہوں۔");    // 2
countSentences("ایک جملہ۔");                      // 1 — no phantom empty sentence
```

Terminators are `۔` (U+06D4), `؟` (U+061F), `!`, `.` and `…`. Note the Urdu full stop is a distinct character from the ASCII period — splitting on `.` alone finds nothing in real Urdu text.

## Fields

| Field | Notes |
| --- | --- |
| `characters` | Every codepoint, including spaces and diacritics |
| `charactersNoSpaces` | Whitespace removed |
| `words` | Same as `countWords` |
| `sentences` | Same as `countSentences` |
| `paragraphs` | Blocks separated by a blank line |
| `urduPercentage` | Arabic-script letters as a share of all letters, 0–100 |
| `diacritics` | Combining marks present |
| `digits` | Digits in any of the three systems |
| `averageWordsPerSentence` | Rounded to one decimal |
| `readingTimeMinutes` | At 180 words per minute |

Reading speed is set at 180 wpm rather than the ~230 wpm usually quoted for English: the script is denser and short vowels are inferred rather than read. Treat it as an editorial estimate.

`urduPercentage` is a useful moderation signal — a submission at 20% in an Urdu-only form is probably English with a few pasted words.

## Try it

<Playground />
