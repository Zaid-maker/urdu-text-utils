import { defineConfig } from "vitepress";
import { fileURLToPath, URL } from "node:url";

const description =
  "Urdu text processing toolkit for JavaScript and TypeScript: normalization, Roman Urdu transliteration, stop words, detection, digits, diacritics, collation, search and statistics. Zero dependencies.";

export default defineConfig({
  title: "urdu-text-utils",
  titleTemplate: ":title | Urdu Text Processing Toolkit for JavaScript & TypeScript",
  description,
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
    ["link", { rel: "canonical", href: "https://zaid-maker.github.io/urdu-text-utils/" }],
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
    ["meta", { property: "og:title", content: "urdu-text-utils — Urdu Text Processing Toolkit for JavaScript & TypeScript" }],
    ["meta", { property: "og:description", content: description }],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:url", content: "https://zaid-maker.github.io/urdu-text-utils/" }],
    ["meta", { property: "og:site_name", content: "urdu-text-utils" }],
    ["meta", { name: "twitter:card", content: "summary_large_image" }],
    ["meta", { name: "twitter:title", content: "urdu-text-utils — Urdu Text Processing Toolkit" }],
    ["meta", { name: "twitter:description", content: description }],
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
        text: "0.1.9",
        items: [
          { text: "v0.1.10-alpha.0 (pre-release)", link: "https://github.com/Zaid-maker/urdu-text-utils/releases/tag/v0.1.10-alpha.0" },
          { text: "Changelog", link: "https://github.com/Zaid-maker/urdu-text-utils/blob/main/CHANGELOG.md" },
          { text: "npm", link: "https://www.npmjs.com/package/urdu-text-utils" },
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
