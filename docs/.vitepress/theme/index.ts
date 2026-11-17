import DefaultTheme from "vitepress/theme";
import type { Theme } from "vitepress";
import Layout from "./Layout.vue";
import Playground from "./Playground.vue";
import DownloadStats from "./DownloadStats.vue";
import "./custom.css";

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    // Registered globally so any markdown page can drop in <Playground />.
    app.component("Playground", Playground);
    app.component("DownloadStats", DownloadStats);
  },
} satisfies Theme;
