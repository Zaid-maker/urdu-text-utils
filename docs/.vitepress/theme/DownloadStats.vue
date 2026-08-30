<script setup lang="ts">
import { ref, onMounted } from "vue";

interface DownloadData {
  downloads: number;
  package: string;
  start: string;
  end: string;
}

const weeklyDownloads = ref<number | null>(null);
const monthlyDownloads = ref<number | null>(null);
const loading = ref(true);
const error = ref(false);

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
}

onMounted(async () => {
  try {
    const [weekRes, monthRes] = await Promise.all([
      fetch("https://api.npmjs.org/downloads/point/last-week/urdu-text-utils"),
      fetch("https://api.npmjs.org/downloads/point/last-month/urdu-text-utils"),
    ]);

    if (weekRes.ok && monthRes.ok) {
      const weekData: DownloadData = await weekRes.json();
      const monthData: DownloadData = await monthRes.json();
      weeklyDownloads.value = weekData.downloads;
      monthlyDownloads.value = monthData.downloads;
    } else {
      error.value = true;
    }
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div v-if="!loading && !error" class="download-stats">
    <div class="stat">
      <span class="stat-value">{{ formatNumber(weeklyDownloads!) }}</span>
      <span class="stat-label">weekly downloads</span>
    </div>
    <div class="stat-divider">·</div>
    <div class="stat">
      <span class="stat-value">{{ formatNumber(monthlyDownloads!) }}</span>
      <span class="stat-label">monthly downloads</span>
    </div>
  </div>
</template>

<style scoped>
.download-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin: 16px 0 24px;
  font-size: 14px;
}

.stat {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.stat-value {
  font-weight: 600;
  font-size: 16px;
  color: var(--vp-c-brand-1);
}

.stat-label {
  color: var(--vp-c-text-2);
}

.stat-divider {
  color: var(--vp-c-text-3);
  font-size: 18px;
}
</style>
