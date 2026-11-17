<script setup lang="ts">
import DefaultTheme from "vitepress/theme";
import { useData } from "vitepress";
import InstallCard from "./InstallCard.vue";

const { frontmatter } = useData();
</script>

<template>
  <DefaultTheme.Layout>
    <template #home-hero-actions-after>
      <div
        v-if="frontmatter.layout === 'home'"
        class="home-compatibility"
        role="group"
        aria-label="Supported platforms and formats"
      >
        <span class="home-compatibility-label">Works with</span>
        <span class="home-compatibility-badge">Node.js 18+</span>
        <span class="home-compatibility-badge">Browsers</span>
        <span class="home-compatibility-badge">TypeScript</span>
        <span class="home-compatibility-badge">ESM + CommonJS</span>
        <span class="home-compatibility-badge">PHP 8.1+</span>
      </div>
    </template>
    <template #home-hero-image>
      <InstallCard v-if="frontmatter.layout === 'home'" />
    </template>
  </DefaultTheme.Layout>
</template>
