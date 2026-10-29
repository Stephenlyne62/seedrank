<script setup lang="ts">
import type { SavedReportSummary } from '#shared/types/dataset'

const { data: reports, error } = await useFetch<SavedReportSummary[]>('/api/reports')
useHead({
  title: 'Reports | SeedRank',
  meta: [{ name: 'description', content: 'Explore saved SeedRank industry reports built from company datasets.' }],
})
</script>

<template>
  <main id="main-content" class="page-frame reports-index-page">
    <div class="saved-report-nav">
      <NuxtLink class="back-link" to="/">← Create another report</NuxtLink>
    </div>
    <header class="reports-index-header">
      <p class="eyebrow">Published reports</p>
      <h1>Company data, clear insights.</h1>
      <p>Explore saved industry reports, each grounded in its uploaded company dataset.</p>
    </header>
    <p v-if="error" class="inline-error" role="alert">Saved reports are temporarily unavailable.</p>
    <div v-else-if="!reports?.length" class="empty-validation"><h2>No reports yet.</h2><p>Create the first report from the homepage.</p></div>
    <div v-else class="reports-index-list">
      <NuxtLink v-for="report in reports" :key="report.slug" class="report-index-card" :to="`/reports/${report.slug}`">
        <span class="eyebrow">{{ report.topic }} · {{ new Date(report.createdAt).toLocaleDateString('en-GB') }}</span>
        <h2>{{ report.title }}</h2>
        <p>{{ report.metaDescription }}</p>
        <span class="report-index-arrow" aria-hidden="true">Open report ↗</span>
      </NuxtLink>
    </div>
  </main>
</template>
