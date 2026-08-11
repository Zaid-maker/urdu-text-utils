<script setup lang="ts">
import { computed, ref } from "vue";
import {
  analyzeUrdu,
  convertNumbers,
  isUrdu,
  normalizeUrdu,
  removeDiacritics,
  romanToUrdu,
  romanize,
  searchUrdu,
  sortUrdu,
  urduRatio,
  urduSlug,
} from "urdu-text-utils";

type ToolId =
  | "normalize"
  | "diacritics"
  | "detect"
  | "numbers"
  | "search"
  | "sort"
  | "stats"
  | "romanize"
  | "romanToUrdu"
  | "slug";

interface Tool {
  id: ToolId;
  label: string;
  call: string;
  sample: string;
  /** Roman Urdu input rather than Urdu script, so the box switches to LTR. */
  ltr?: boolean;
  /** One item per line instead of free text. */
  list?: boolean;
}

const TOOLS: Tool[] = [
  { id: "normalize", label: "Normalize", call: "normalizeUrdu(text)", sample: "كيا حال ہے" },
  { id: "diacritics", label: "Remove diacritics", call: "removeDiacritics(text)", sample: "مُحَمَّد" },
  { id: "detect", label: "Detect Urdu", call: "isUrdu(text)", sample: "آپ کیسے ہیں؟" },
  {
    id: "numbers",
    label: "Digits",
    call: "convertNumbers(text, style)",
    sample: "سال 2024 میں 12345 لوگ",
  },
  {
    id: "stats",
    label: "Statistics",
    call: "analyzeUrdu(text)",
    sample: "پاکستان ایک خوبصورت ملک ہے۔ اس کی آبادی زیادہ ہے۔",
  },
  {
    id: "romanize",
    label: "Romanize",
    call: "romanize(text)",
    sample: "کراچی میں بارش کے بعد سڑکیں بند ہیں",
  },
  {
    id: "romanToUrdu",
    label: "Roman → Urdu",
    call: "romanToUrdu(text)",
    sample: "mera naam zaid hai",
    ltr: true,
  },
  { id: "slug", label: "Slug", call: "urduSlug(text)", sample: "میرا پہلا مضمون" },
  {
    id: "search",
    label: "Search",
    call: "searchUrdu(query, items)",
    sample: "مُحَمَّد علی\nاحمد\nمحمد خان\nپاکستان",
    list: true,
  },
  {
    id: "sort",
    label: "Sort",
    call: "sortUrdu(items)",
    sample: "گل\nآم\nبادام\nٹماٹر\nکتاب",
    list: true,
  },
];

const active = ref<ToolId>("normalize");
const tool = computed(() => TOOLS.find((t) => t.id === active.value)!);

const inputs = ref<Record<ToolId, string>>(
  Object.fromEntries(TOOLS.map((t) => [t.id, t.sample])) as Record<ToolId, string>,
);
const text = computed({
  get: () => inputs.value[active.value],
  set: (value: string) => (inputs.value[active.value] = value),
});

const stripDiacritics = ref(false);
const digitStyle = ref<"urdu" | "english">("urdu");
const query = ref("محمد");
const fuzzy = ref(false);

function reset() {
  inputs.value[active.value] = tool.value.sample;
}

const items = computed(() =>
  text.value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean),
);

const result = computed<string>(() => {
  const value = text.value;
  try {
    switch (active.value) {
      case "normalize":
        return normalizeUrdu(value, { stripDiacritics: stripDiacritics.value });
      case "diacritics":
        return removeDiacritics(value);
      case "detect":
        return JSON.stringify(
          { isUrdu: isUrdu(value), urduRatio: Math.round(urduRatio(value) * 100) / 100 },
          null,
          2,
        );
      case "numbers":
        return convertNumbers(value, digitStyle.value);
      case "stats":
        return JSON.stringify(analyzeUrdu(value), null, 2);
      case "romanize":
        return romanize(value);
      case "romanToUrdu":
        return romanToUrdu(value);
      case "slug":
        return urduSlug(value);
      case "search": {
        const hits = searchUrdu(query.value, items.value, { fuzzy: fuzzy.value });
        return hits.length ? hits.join("\n") : "— no matches —";
      }
      case "sort":
        return sortUrdu(items.value).join("\n");
      default:
        return "";
    }
  } catch (error) {
    return `Error: ${(error as Error).message}`;
  }
});

/** Some tools answer in Urdu script, others in Latin or JSON — direction follows. */
const outputIsUrdu = computed(() =>
  ["normalize", "diacritics", "numbers", "search", "sort", "romanToUrdu"].includes(active.value),
);
</script>

<template>
  <div class="pg">
    <div class="pg-tabs" role="tablist">
      <button
        v-for="t in TOOLS"
        :key="t.id"
        class="pg-tab"
        :class="{ 'pg-tab-active': t.id === active }"
        role="tab"
        :aria-selected="t.id === active"
        @click="active = t.id"
      >
        {{ t.label }}
      </button>
    </div>

    <div class="pg-bar">
      <code class="pg-call">{{ tool.call }}</code>

      <label v-if="active === 'normalize'" class="pg-opt">
        <input v-model="stripDiacritics" type="checkbox" />
        stripDiacritics
      </label>

      <label v-if="active === 'numbers'" class="pg-opt">
        style
        <select v-model="digitStyle">
          <option value="urdu">urdu</option>
          <option value="english">english</option>
        </select>
      </label>

      <label v-if="active === 'search'" class="pg-opt">
        query
        <input v-model="query" class="pg-query" dir="rtl" />
      </label>

      <label v-if="active === 'search'" class="pg-opt">
        <input v-model="fuzzy" type="checkbox" />
        fuzzy
      </label>

      <button class="pg-reset" @click="reset">Reset</button>
    </div>

    <div class="pg-panes">
      <div class="pg-pane">
        <div class="pg-label">{{ tool.list ? "Items (one per line)" : "Input" }}</div>
        <textarea
          v-model="text"
          class="pg-io urdu"
          :dir="tool.ltr ? 'ltr' : 'rtl'"
          spellcheck="false"
          rows="6"
        />
      </div>

      <div class="pg-pane">
        <div class="pg-label">Output</div>
        <pre
          class="pg-io pg-out"
          :class="{ urdu: outputIsUrdu }"
          :dir="outputIsUrdu ? 'rtl' : 'ltr'"
        >{{ result }}</pre>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pg {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  overflow: hidden;
  background: var(--vp-c-bg-soft);
  margin: 24px 0;
}

.pg-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 10px;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
}

.pg-tab {
  font-size: 13px;
  font-weight: 500;
  padding: 5px 11px;
  border-radius: 999px;
  color: var(--vp-c-text-2);
  transition:
    background-color 0.2s,
    color 0.2s;
}

.pg-tab:hover {
  background: var(--vp-c-default-soft);
  color: var(--vp-c-text-1);
}

.pg-tab-active,
.pg-tab-active:hover {
  background: var(--vp-c-brand-1);
  color: var(--vp-c-bg);
}

.pg-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--vp-c-divider);
  font-size: 13px;
}

.pg-call {
  font-family: var(--vp-font-family-mono);
  font-size: 12.5px;
  color: var(--vp-c-brand-1);
  background: none;
  padding: 0;
}

.pg-opt {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--vp-c-text-2);
  cursor: pointer;
}

.pg-opt select,
.pg-query {
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  padding: 2px 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 13px;
}

.pg-query {
  width: 120px;
}

.pg-reset {
  margin-inline-start: auto;
  font-size: 12px;
  color: var(--vp-c-text-2);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  padding: 3px 10px;
}

.pg-reset:hover {
  color: var(--vp-c-text-1);
  border-color: var(--vp-c-brand-1);
}

.pg-panes {
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.pg-pane + .pg-pane {
  border-inline-start: 1px solid var(--vp-c-divider);
}

.pg-label {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
  padding: 10px 14px 0;
}

.pg-io {
  display: block;
  width: 100%;
  min-height: 150px;
  padding: 10px 14px 16px;
  background: transparent;
  border: 0;
  resize: vertical;
  font-size: 16px;
  line-height: 1.9;
  color: var(--vp-c-text-1);
  white-space: pre-wrap;
  word-break: break-word;
}

.pg-io:focus {
  outline: none;
}

.pg-out {
  margin: 0;
  overflow-x: auto;
}

/* Latin and JSON output reads better monospaced; Urdu output keeps the Urdu face. */
.pg-out:not(.urdu) {
  font-family: var(--vp-font-family-mono);
  font-size: 13.5px;
  line-height: 1.7;
}

@media (max-width: 720px) {
  .pg-panes {
    grid-template-columns: 1fr;
  }

  .pg-pane + .pg-pane {
    border-inline-start: 0;
    border-top: 1px solid var(--vp-c-divider);
  }
}
</style>
