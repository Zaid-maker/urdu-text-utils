---
layout: home

hero:
  name: urdu-text-utils
  text: The Urdu Text Processing Toolkit for JavaScript & TypeScript
  tagline: A lightweight, zero-dependency Urdu NLP and text processing library. Unicode normalization, Roman Urdu transliteration, stop words, digits, diacritics, collation, search and stats.
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: Playground
      link: /playground
    - theme: alt
      text: GitHub
      link: https://github.com/Zaid-maker/urdu-text-utils

# VitePress renders a string icon with v-html, so inline SVG works and themes
# itself through currentColor. Emoji were the alternative, but the digits icon
# has no emoji and rendered as a missing-glyph box.
features:
  - icon: |
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6c5.5 0 4.5 6 9 6"/><path d="M3 18c5.5 0 4.5-6 9-6"/><path d="M12 12h7"/><path d="m16 9 3 3-3 3"/></svg>
    title: Unicode that actually matches
    details: Folds Arabic <bdi>ي ك ه</bdi> to Urdu <bdi>ی ک ہ</bdi>, applies NFKC, strips tatweel and bidi controls. Text from Arabic keyboards and legacy CMSes stops failing equality checks.
    link: /guide/normalization
    linkText: Normalization
  - icon: |
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/></svg>
    title: Search that ignores diacritics
    details: <bdi>محمد</bdi> matches <bdi>مُحَمَّد</bdi> and Arabic-spelled <bdi>محمد</bdi>. Optional fuzzy matching, ranked results, and highlighting that keeps the original spelling intact.
    link: /guide/search
    linkText: Search
  - icon: |
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h9"/><path d="M4 12h6"/><path d="M4 18h3"/><path d="M18 4v16"/><path d="m15 17 3 3 3-3"/></svg>
    title: Real Urdu collation
    details: An explicit <bdi>ا آ ب پ ت ٹ</bdi> alphabet table, because Intl.Collator("ur") falls back to Arabic root collation and misorders <bdi>ک گ ٹ ڈ ڑ ں ے</bdi>.
    link: /guide/sorting
    linkText: Sorting
  - icon: |
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3 8 21"/><path d="M17 3l-2 18"/><path d="M4 9h16"/><path d="M3 15h16"/></svg>
    title: Both digit systems
    details: Urdu digits <bdi>۴۵۶</bdi> (U+06F0) and Arabic-Indic <bdi>٤٥٦</bdi> (U+0660) live in different Unicode blocks — four, five and six are where the two sets visibly diverge. Convert either way, parse the Urdu decimal and thousands separators, spell numbers with lakh and crore.
    link: /guide/numbers
    linkText: Numbers
  - icon: |
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20h18"/><path d="M6 20v-6"/><path d="M12 20V6"/><path d="M18 20v-9"/></svg>
    title: Statistics for editors
    details: Words, sentences, paragraphs, diacritic and digit counts, script percentage and reading time — the numbers a CMS word-count widget needs.
    link: /guide/statistics
    linkText: Statistics
  - icon: |
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4.6 13.4H11l-1 8.6L19.4 10H13z"/></svg>
    title: Zero dependencies
    details: About 11 kB min+gzip, pure and synchronous, side-effect free and tree-shakeable. Ships ESM, CJS and its own type declarations. Published with provenance.
    link: /guide/getting-started
    linkText: Install
---

<div class="home-demo">

## Try it

<Playground />

</div>

<style scoped>
.home-demo {
  max-width: 1152px;
  margin: 8px auto 64px;
  padding: 0 24px;
}

.home-demo h2 {
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.02em;
  border: 0;
  margin: 0 0 4px;
  padding: 0;
}
</style>
