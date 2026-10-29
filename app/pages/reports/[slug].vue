<script setup lang="ts">
import type { PreviewResult, SavedReport } from '#shared/types/dataset'
import { REPORT_STORAGE_UNAVAILABLE_ERROR, toReportPageError } from '#shared/utils/report-error'

const route = useRoute()
const slug = String(route.params.slug)
const { data, error } = await useFetch<SavedReport>(`/api/reports/${encodeURIComponent(slug)}`)

if (error.value) throw createError(toReportPageError(error.value))
if (!data.value) throw createError(REPORT_STORAGE_UNAVAILABLE_ERROR)

const report = data.value
const copied = ref(false)

async function copyReportLink(): Promise<void> {
  await navigator.clipboard.writeText(window.location.href)
  copied.value = true
  window.setTimeout(() => { copied.value = false }, 2200)
}

const preview: PreviewResult = {
  ok: true,
  fileName: report.fileName,
  topic: report.topic,
  headers: [],
  rows: report.rows,
  stats: report.stats,
  errors: [],
  warnings: [],
  copy: report.copy,
}

useHead(() => ({
  title: `${report.copy.title} | SeedRank`,
  meta: [
    { name: 'description', content: report.copy.metaDescription },
    { property: 'og:title', content: report.copy.title },
    { property: 'og:description', content: report.copy.metaDescription },
    { property: 'og:type', content: 'article' },
    { name: 'twitter:card', content: 'summary' },
  ],
}))
</script>

<template>
  <main id="main-content" class="page-frame saved-report-page">
    <div class="saved-report-nav">
      <NuxtLink class="back-link" to="/">← Create another report</NuxtLink>
      <button class="copy-link-button" type="button" @click="copyReportLink">{{ copied ? 'Report link copied' : 'Copy report link' }}</button>
    </div>
    <ReportPreview :preview="preview" :created-at="report.createdAt" />
  </main>
</template>
