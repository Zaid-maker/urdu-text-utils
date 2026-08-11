import { defineConfig } from "vitepress";
import { fileURLToPath, URL } from "node:url";

const description =
  "Urdu text processing toolkit for JavaScript and TypeScript: normalization, detection, digits, diacritics, collation, search and statistics. Zero dependencies.";

export default defineConfig({
  title: "urdu-text-utils",
  description,
  lang: "en-US",
  cleanUrls: true,
  lastUpdated: true,

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
    ["meta", { property: "og:title", content: "urdu-text-utils" }],
    ["meta", { property: "og:description", content: description }],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { name: "twitter:card", content: "summary" }],
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
        text: "0.1.2",
        items: [
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
          { text: "Transliteration", link: "/guide/transliteration" },
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
