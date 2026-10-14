# Urdu Dates & Relative Time

`urdu-text-utils` provides formatting for dates, timestamps, and natural relative time (*"time ago"*) in Urdu, with built-in support for Urdu numerals (`۰-۹`), Gregorian and Hijri calendar month names, Urdu weekdays, and day period indicators.

## Quick start

```ts
import {
  formatUrduDate,
  parseUrduDate,
  timeAgoUrdu,
  getUrduMonthName,
  getUrduWeekdayName,
} from "urdu-text-utils";

// Format current date
formatUrduDate(new Date(), "DD MMMM YYYY");
// "۲۲ اگست ۲۰۲۶"

// Date with weekday and 12-hour time
formatUrduDate(new Date(), "dddd، D MMMM YYYY، hh:mm A");
// "ہفتہ، ۲۲ اگست ۲۰۲۶، ۰۲:۳۰ دوپہر"

// Relative time / Time ago
timeAgoUrdu(Date.now() - 5 * 60 * 1000);   // "۵ منٹ پہلے"
timeAgoUrdu(Date.now() - 3 * 3600 * 1000); // "۳ گھنٹے پہلے"
timeAgoUrdu(Date.now() - 86400 * 1000);    // "کل"
timeAgoUrdu(Date.now() - 2 * 86400 * 1000);// "پرسوں"
```

## `formatUrduDate(date, pattern?, options?)`

Formats any `Date`, ISO string, or timestamp into an Urdu formatted string.

### Supported Tokens

| Token | Description | Example (Urdu) | Example (English digits) |
| --- | --- | --- | --- |
| `YYYY` | 4-digit year | `۲۰۲۶` | `2026` |
| `YY` | 2-digit year | `۲۶` | `26` |
| `MMMM` | Full month name | `اگست` | `اگست` |
| `MM` | 2-digit month (01-12) | `۰۸` | `08` |
| `M` | 1-digit month (1-12) | `۸` | `8` |
| `DD` | 2-digit day of month | `۰۵` | `05` |
| `D` | 1-digit day of month | `۵` | `5` |
| `dddd` | Full day of the week | `ہفتہ`, `جمعہ` | `ہفتہ` |
| `HH` | 24-hour hour (00-23) | `۱۴` | `14` |
| `H` | 24-hour hour (0-23) | `۱۴` | `14` |
| `hh` | 12-hour hour (01-12) | `۰۲` | `02` |
| `h` | 12-hour hour (1-12) | `۲` | `2` |
| `mm` | Minute (00-59) | `۳۰` | `30` |
| `ss` | Second (00-59) | `۴۵` | `45` |
| `A` | Urdu day period | `صبح`, `دوپہر`, `شام`, `رات` | — |
| `a` | Short day period | `صبح`, `شام`, `رات` | — |

### Options

```ts
interface FormatUrduDateOptions {
  /**
   * Digit style for numeric tokens.
   * @default "urdu"
   */
  digits?: "urdu" | "english";

  /**
   * Month naming scheme for MMMM / MMM.
   * @default "gregorian"
   */
  calendar?: "gregorian" | "hijri";
}
```

### Examples

```ts
const date = new Date(2026, 7, 22, 14, 30);

// Default (DD MMMM YYYY)
formatUrduDate(date);
// "۲۲ اگست ۲۰۲۶"

// English numerals
formatUrduDate(date, "D MMMM YYYY", { digits: "english" });
// "22 اگست 2026"

// Hijri month names
formatUrduDate(date, "D MMMM YYYY", { calendar: "hijri" });
// "۲۲ شعبان ۲۰۲۶"
```

---

## `timeAgoUrdu(date, relativeTo?, options?)`

Calculates the time difference and returns a localized, human-friendly relative time string in Urdu.

```ts
const now = Date.now();

timeAgoUrdu(now - 20 * 1000);              // "ابھی"
timeAgoUrdu(now - 1 * 60 * 1000);          // "ایک منٹ پہلے"
timeAgoUrdu(now - 15 * 60 * 1000);         // "۱۵ منٹ پہلے"
timeAgoUrdu(now - 1 * 3600 * 1000);        // "ایک گھنٹہ پہلے"
timeAgoUrdu(now - 4 * 3600 * 1000);        // "۴ گھنٹے پہلے"
timeAgoUrdu(now - 24 * 3600 * 1000);       // "کل"
timeAgoUrdu(now - 48 * 3600 * 1000);       // "پرسوں"
timeAgoUrdu(now - 5 * 24 * 3600 * 1000);   // "۵ دن پہلے"
timeAgoUrdu(now - 14 * 24 * 3600 * 1000);  // "۲ ہفتے پہلے"
timeAgoUrdu(now - 60 * 24 * 3600 * 1000);  // "۲ ماہ پہلے"
timeAgoUrdu(now - 365 * 24 * 3600 * 1000); // "ایک سال پہلے"
```

### Future Dates

Future dates automatically use the *"بعد"* (after/in) suffix:

```ts
timeAgoUrdu(now + 10 * 60 * 1000);  // "۱۰ منٹ بعد"
timeAgoUrdu(now + 2 * 3600 * 1000); // "۲ گھنٹے بعد"
```

### Options

```ts
// English numerals in relative strings
timeAgoUrdu(now - 5 * 60 * 1000, now, { digits: "english" });
// "5 منٹ پہلے"

// Omit suffix ("پہلے" / "بعد")
timeAgoUrdu(now - 5 * 60 * 1000, now, { addSuffix: false });
// "۵ منٹ"
```

---

## `parseUrduDate(input, options?)`

`formatUrduDate` has an inverse. Anything it can produce parses back to the same wall-clock moment, which makes the pair safe for round-tripping stored text.

```ts
const d = new Date(2026, 7, 22, 14, 30);
const text = formatUrduDate(d, "dddd، D MMMM YYYY، hh:mm A");
// "ہفتہ، ۲۲ اگست ۲۰۲۶، ۰۲:۳۰ دوپہر"

parseUrduDate(text)?.getHours();
// 14
```

### Accepted input

```ts
// Urdu or English month names, Urdu, Arabic-Indic or ASCII digits
parseUrduDate("۲۲ اگست ۲۰۲۶");    // Date(2026, 7, 22)
parseUrduDate("22 اگست 2026");
parseUrduDate("22 August 2026");
parseUrduDate("Aug 22, 2026");

// Day-first numeric, matching Pakistani convention
parseUrduDate("۲۲/۰۸/۲۰۲۶");      // 22 August, not 8 February
parseUrduDate("22-08-2026");
parseUrduDate("22/08/26");         // 00-69 -> 20xx, 70-99 -> 19xx

// ISO, with the `T` form but no timezone offset
parseUrduDate("2026-08-22");
parseUrduDate("2026-08-22T14:30");

// An optional leading weekday (ignored) and an optional time
parseUrduDate("ہفتہ، ۲۲ اگست ۲۰۲۶، ۰۲:۳۰ دوپہر")?.getHours(); // 14
parseUrduDate("۲۲ اگست ۲۰۲۶ ۱۱:۳۰ pm")?.getHours();           // 23

// Month precision resolves to the first of the month;
// a missing year needs a default or falls back to the current one
parseUrduDate("جنوری ۲۰۲۶");                          // Date(2026, 0, 1)
parseUrduDate("5 جنوری", { defaultYear: 1999 });     // Date(1999, 0, 5)
```

The day period words are the inverse of the `A` token: `صبح`, `دوپہر`, `شام` and `رات`, plus `am`/`pm`. `رات` is the awkward one — it covers both 00:00–03:59 and 20:00–23:59, so `۱۲:۰۰ رات` is midnight and `۱۱:۰۰ رات` is 23:00. Both halves resolve correctly, and every hour of a formatted date round-trips.

### Deliberately rejected

`parseUrduDate` returns `null` rather than guessing:

```ts
parseUrduDate("۳۱ فروری ۲۰۲۶");          // null — that date does not exist
parseUrduDate("2026-08-22T14:30:00Z");   // null — an absolute instant
parseUrduDate("۱ رمضان المبارک ۱۴۴۷");    // null — Hijri month names
parseUrduDate("پاکستان");                // null
```

Three of those are deliberate rather than missing features:

- **No timezone conversion.** A `Z` or `+05:00` suffix names an absolute instant, which this function has no timezone to resolve into. It builds wall-clock time in the runtime's own zone, exactly as `formatUrduDate` reads it with `getFullYear()` and friends.
- **No Hijri names.** `صفر` is both a Hijri month and the Urdu word for zero, so a bare `صفر` would be genuinely ambiguous. Hijri *formatting* still works through `formatUrduDate`'s `calendar: "hijri"` option.
- **No roll-over.** `۳۱ فروری` is rejected instead of silently becoming 3 March.

Unknown words are tolerated rather than fatal, so a decorated string like `بتاریخ ۲۲ اگست ۲۰۲۶` still parses.

---

## Month & Weekday Constants

```ts
import {
  URDU_MONTHS_GREGORIAN,
  URDU_MONTHS_HIJRI,
  URDU_WEEKDAYS,
  getUrduMonthName,
  getUrduWeekdayName,
} from "urdu-text-utils";

URDU_MONTHS_GREGORIAN[0]; // "جنوری"
URDU_MONTHS_GREGORIAN[7]; // "اگست"

URDU_MONTHS_HIJRI[8]; // "رمضان المبارک"
URDU_MONTHS_HIJRI[9]; // "شوال"

URDU_WEEKDAYS[0]; // "اتوار"
URDU_WEEKDAYS[5]; // "جمعہ"

getUrduMonthName(7); // "اگست"
getUrduMonthName(8, "hijri"); // "رمضان المبارک"
getUrduWeekdayName(5); // "جمعہ"
```
