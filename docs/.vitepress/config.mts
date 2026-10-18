import { defineConfig } from "vitepress";
import { fileURLToPath, URL } from "node:url";
import { readFileSync } from "node:fs";

// The nav badge would silently go stale every release if hand-edited, so it
// reads the version straight from package.json at config time.
const version: string = JSON.parse(
  readFileSync(fileURLToPath(new URL("../../package.json", import.meta.url)), "utf8"),
).version;

const siteOrigin = "https://zaid-maker.github.io";
const siteBase = "/urdu-text-utils/";
const pageDescriptions: Record<string, string> = {
  "index": "Explore urdu-text-utils, a zero-dependency Urdu text processing toolkit for JavaScript and TypeScript, with a live playground.",
  "api/index": "Complete API reference for urdu-text-utils: normalization, search, transliteration, dates, numbers, statistics, stemming and more.",
  "playground": "Try Urdu text normalization, search, sorting, transliteration and other urdu-text-utils functions in your browser.",
  "guide/getting-started": "Install urdu-text-utils and start using Urdu normalization, search, sorting, statistics and digit conversion in JavaScript or PHP.",
  "guide/why": "Learn why Urdu text needs Unicode-aware normalization, script-specific collation and dedicated search utilities.",
  "guide/normalization": "Learn how urdu-text-utils normalizes Arabic and Urdu letter forms, diacritics, Unicode presentation forms and invisible controls.",
  "guide/detection": "Detect Arabic-script and Urdu-specific text with urdu-text-utils, and understand script-ratio thresholds and limitations.",
  "guide/numbers": "Convert Urdu and Arabic-Indic digits, parse localized numbers, format currency and spell numbers in Urdu.",
  "guide/search": "Build Urdu search with normalization, diacritic-insensitive matching, fuzzy matching, ranking and highlighting.",
  "guide/sorting": "Sort Urdu text using a dedicated Urdu alphabet collation rather than Unicode codepoint or Arabic-root ordering.",
  "guide/statistics": "Count Urdu words and sentences and calculate paragraph, script, digit and reading-time statistics.",
  "guide/stemming": "Use the Urdu stemmer to strip common prefixes, suffixes and inflections for search and text analysis.",
  "guide/stemming-deep-dive": "Explore Urdu stemming rules, morphological restoration, affixes, exceptions and known linguistic tradeoffs.",
  "guide/date-time": "Format, parse and display Urdu dates, Gregorian and Hijri month names, digits and relative times.",
  "guide/transliteration": "Transliterate Urdu to Roman Urdu, convert Roman Urdu to Urdu and generate URL slugs with clear limitations.",
  "guide/php": "Install and use the native PHP port of urdu-text-utils, with shared tables and TypeScript-verified parity fixtures.",
  "guide/use-cases": "Practical Urdu text processing recipes for search autocomplete, CMS content, form validation and URL slugs.",
  "guide/performance": "Review urdu-text-utils performance benchmarks, bundle sizes and guidance for running the measurements.",
};

export default defineConfig({
  title: "urdu-text-utils",
  titleTemplate: ":title | Urdu Text Processing Toolkit for JavaScript & TypeScript",
  lang: "en-US",
  cleanUrls: true,
  lastUpdated: true,
  sitemap: {
    hostname: "https://zaid-maker.github.io/urdu-text-utils/",
  },

  // The site is served from https://zaid-maker.github.io/urdu-text-utils/, so
  // every asset and link needs the repository name as a prefix. Without this the
  // pages render but load their CSS and JS from the domain root and 404.
  base: "/urdu-text-utils/",

  head: [
    ["link", { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" }],
    // Nastaliq is how Urdu is actually set. Loaded with display=swap so the page
    // never blocks on it, and applied only to Urdu text via the .urdu class.
    ["link", { rel: "preconnect", href: "https://fonts.googleapis.com" }],
    ["link", { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" }],
    [
      "link",
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;600&display=swap",
      },
    ],
    ["meta", { name: "keywords", content: "urdu text processing toolkit javascript, urdu text processing, urdu nlp javascript, urdu typescript, urdu text utils, roman urdu transliteration, urdu stopwords, urdu normalization, urdu sorting, urdu search, urdu digits" }],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:site_name", content: "urdu-text-utils" }],
    ["meta", { name: "twitter:card", content: "summary_large_image" }],
    [
      "script",
      { type: "application/ld+json" },
      JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareSourceCode",
        name: "urdu-text-utils",
        description: "Urdu text processing toolkit for JavaScript and TypeScript",
        programmingLanguage: ["JavaScript", "TypeScript"],
        codeRepository: "https://github.com/Zaid-maker/urdu-text-utils",
        license: "https://opensource.org/licenses/MIT",
        author: {
          "@type": "Person",
          name: "Zaid-maker",
          url: "https://github.com/Zaid-maker",
        },
        keywords: "urdu, urdu text processing toolkit, javascript, typescript, nlp, roman urdu transliteration, urdu normalization",
      }),
    ],
  ],

  transformPageData(pageData) {
    const pageKey = pageData.relativePath.replace(/\\/gu, "/").replace(/\.md$/u, "");
    const route = pageKey.replace(/(?:^|\/)index$/u, (match) => (match === "index" ? "" : "/"));
    const canonical = new URL(route, `${siteOrigin}${siteBase}`).href;
    const title = pageData.title || "urdu-text-utils";
    const pageDescription =
      pageDescriptions[pageKey] ??
      pageData.frontmatter.description ??
      `${title} — documentation for the Urdu text processing toolkit urdu-text-utils.`;
    const socialTitle = title === "urdu-text-utils" ? title : `${title} | urdu-text-utils`;

    pageData.description = pageDescription;
    pageData.frontmatter.head = [
      ...(pageData.frontmatter.head ?? []),
      ["link", { rel: "canonical", href: canonical }],
      ["meta", { property: "og:title", content: socialTitle }],
      ["meta", { property: "og:description", content: pageDescription }],
      ["meta", { property: "og:url", content: canonical }],
      ["meta", { name: "twitter:title", content: socialTitle }],
      ["meta", { name: "twitter:description", content: pageDescription }],
    ];
  },

  vite: {
    resolve: {
      alias: {
        // The playground imports the real library from source, so the docs can
        // never demonstrate behaviour the published package does not have.
        "urdu-text-utils": fileURLToPath(new URL("../../src/index.ts", import.meta.url)),
      },
    },
  },

  themeConfig: {
    logo: undefined,
    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      { text: "API", link: "/api/" },
      { text: "Playground", link: "/playground" },
      {
        text: version,
        items: [
          { text: "Changelog", link: "https://github.com/Zaid-maker/urdu-text-utils/blob/main/CHANGELOG.md" },
          { text: "npm", link: "https://www.npmjs.com/package/urdu-text-utils" },
          { text: "Packagist (PHP)", link: "https://packagist.org/packages/urdu-text-utils/urdu-text-utils" },
        ],
      },
    ],

    sidebar: [
      {
        text: "Guide",
        items: [
          { text: "Getting started", link: "/guide/getting-started" },
          { text: "Why this exists", link: "/guide/why" },
          { text: "Normalization", link: "/guide/normalization" },
          { text: "Detection", link: "/guide/detection" },
          { text: "Numbers", link: "/guide/numbers" },
          { text: "Search", link: "/guide/search" },
          { text: "Sorting", link: "/guide/sorting" },
          { text: "Statistics", link: "/guide/statistics" },
          { text: "Stemming", link: "/guide/stemming" },
          { text: "Date & Time", link: "/guide/date-time" },
          { text: "Transliteration", link: "/guide/transliteration" },
          { text: "PHP package", link: "/guide/php" },
          { text: "Use Cases & Recipes", link: "/guide/use-cases" },
          { text: "Performance", link: "/guide/performance" },
        ],
      },
      {
        text: "Reference",
        items: [
          { text: "API", link: "/api/" },
          { text: "Playground", link: "/playground" },
        ],
      },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/Zaid-maker/urdu-text-utils" },
      { icon: "npm", link: "https://www.npmjs.com/package/urdu-text-utils" },
    ],

    search: { provider: "local" },

    editLink: {
      pattern: "https://github.com/Zaid-maker/urdu-text-utils/edit/main/docs/:path",
      text: "Edit this page on GitHub",
    },

    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © 2026 Zaid-maker",
    },
  },
});
