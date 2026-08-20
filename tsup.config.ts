import { defineConfig } from "tsup";

export default defineConfig([
  // Node.js / bundler builds
  {
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    outExtension: ({ format }) => ({ js: format === "cjs" ? ".cjs" : ".js" }),
    dts: true,
    clean: true,
    treeshake: true,
    target: "es2020",
    sourcemap: true,
  },
  // Browser / CDN build — exposes window.UrduTextUtils
  {
    entry: ["src/index.ts"],
    format: ["iife"],
    globalName: "UrduTextUtils",
    outExtension: () => ({ js: ".iife.js" }),
    minify: true,
    treeshake: true,
    target: "es2020",
    sourcemap: true,
  },
]);
