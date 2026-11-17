<script setup lang="ts">
import { ref } from "vue";

const command = "npm install urdu-text-utils";
const copyState = ref<"idle" | "copied" | "error">("idle");

async function copyCommand() {
  if (!navigator.clipboard) {
    copyState.value = "error";
    return;
  }

  try {
    await navigator.clipboard.writeText(command);
    copyState.value = "copied";
  } catch (error) {
    console.error("Could not copy the install command.", error);
    copyState.value = "error";
  }
}
</script>

<template>
  <section class="home-install-card" aria-labelledby="home-install-title">
    <div class="home-install-heading">
      <div>
        <p class="home-install-eyebrow">Get started</p>
        <h2 id="home-install-title">Install in seconds</h2>
      </div>
      <span class="home-install-manager">npm</span>
    </div>

    <div class="home-install-command">
      <code>{{ command }}</code>
      <button type="button" @click="copyCommand">
        {{ copyState === "copied" ? "Copied" : "Copy" }}
      </button>
    </div>
    <p class="home-install-status" aria-live="polite">
      <template v-if="copyState === 'error'">
        Copy unavailable — select the command to copy it.
      </template>
      <template v-else>
        Then import what you need:
      </template>
    </p>
    <pre class="home-install-import"><code>import { normalizeUrdu } from "urdu-text-utils";</code></pre>
  </section>
</template>
