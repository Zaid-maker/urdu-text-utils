---
layout: home

hero:
  name: urdu-text-utils
  text: Urdu text, handled properly
  tagline: Normalize, detect, search, sort and analyze Urdu in JavaScript and TypeScript. Zero dependencies, ESM + CJS, fully typed.
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

features:
  - icon: 🔤
    title: Unicode that actually matches
    details: Folds Arabic ي ك ه to Urdu ی ک ہ, applies NFKC, strips tatweel and bidi controls. Text from Arabic keyboards and legacy CMSes stops failing equality checks.
    link: /guide/normalization
    linkText: Normalization
  - icon: 🔍
    title: Search that ignores diacritics
    details: محمد matches مُحَمَّد and Arabic-spelled محمد. Optional fuzzy matching, ranked results, and highlighting that keeps the original spelling intact.
    link: /guide/search
    linkText: Search
  - icon: 🔡
    title: Real Urdu collation
    details: An explicit ا آ ب پ ت ٹ alphabet table, because Intl.Collator("ur") falls back to Arabic root collation and misorders ک گ ٹ ڈ ڑ ں ے.
    link: /guide/sorting
    linkText: Sorting
  - icon: '۱۲۳'
    title: Both digit systems
    details: Urdu ۰-۹ and Arabic-Indic ٠-٩ live in different Unicode blocks. Convert either way, parse ٫ decimals and ٬ separators, spell numbers with lakh and crore.
    link: /guide/numbers
    linkText: Numbers
  - icon: 📊
    title: Statistics for editors
    details: Words, sentences, paragraphs, diacritic and digit counts, script percentage and reading time — the numbers a CMS word-count widget needs.
    link: /guide/statistics
    linkText: Statistics
  - icon: ⚡
    title: Zero dependencies
    details: Around 22 kB, pure and synchronous, side-effect free and tree-shakeable. Ships ESM, CJS and its own type declarations. Published with provenance.
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
