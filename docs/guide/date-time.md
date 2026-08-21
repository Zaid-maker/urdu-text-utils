# Urdu Dates & Relative Time

`urdu-text-utils` provides formatting for dates, timestamps, and natural relative time (*"time ago"*) in Urdu, with built-in support for Urdu numerals (`۰-۹`), Gregorian and Hijri calendar month names, Urdu weekdays, and day period indicators.

## Quick start

```ts
import {
  formatUrduDate,
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
