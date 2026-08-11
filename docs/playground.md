# Playground

Every panel below runs the real library in your browser — same code that ships on npm, no server round trip. Edit the input and the output updates as you type.

<Playground />

## What to try

- Paste text copied out of a PDF or an older Urdu website into **Normalize**. Presentation forms and Arabic letter shapes fold back to ordinary Urdu letters.
- Type `محمد` as the query in **Search** and watch it match `مُحَمَّد علی`.
- Compare **Sort** against `Array.prototype.sort()` in your console: `["گل", "آم", "بادام"].sort()` returns the wrong order, because it compares codepoints.
- In **Romanize**, try a word the dictionary has never seen. Dictionary hits are exact; rule output is an approximation, and the difference is visible.
