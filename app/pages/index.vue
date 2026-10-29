<script setup lang="ts">
import type { GenerateResult, PreviewResult } from '#shared/types/dataset'

const preview = ref<PreviewResult | null>(null)
const lastResult = ref<PreviewResult | null>(null)
const lastUpload = ref<{ file: File; topic: string } | null>(null)
const submitting = ref(false)
const generating = ref(false)
const transportError = ref('')
const generationError = ref('')
const existingReportUrl = ref('')
const generationStage = ref<'idle' | 'checking' | 'generating' | 'saving'>('idle')

const generationStageLabel = computed(() => ({
  idle: 'Ready to generate',
  checking: 'Checking CSV',
  generating: 'Generating copy',
  saving: 'Saving report',
}[generationStage.value]))

const defaultDescription = 'Upload a company dataset to preview verified fundraising statistics, validation results and a reusable SEO-oriented report structure.'

useHead(() => ({
  title: preview.value?.copy ? `${preview.value.copy.title} | SeedRank` : 'SeedRank — Company data, clear insights',
  meta: [
    {
      name: 'description',
      content: preview.value?.copy?.metaDescription ?? defaultDescription,
    },
    { property: 'og:title', content: preview.value?.copy?.title ?? 'SeedRank — Company data, clear insights' },
    { property: 'og:description', content: preview.value?.copy?.metaDescription ?? defaultDescription },
    { name: 'twitter:card', content: 'summary' },
  ],
}))

async function handleSubmit(payload: { file: File; topic: string }): Promise<void> {
  submitting.value = true
  transportError.value = ''
  generationError.value = ''
  lastUpload.value = payload
  preview.value = null

  const formData = new FormData()
  formData.append('topic', payload.topic)
  formData.append('file', payload.file)

  try {
    const response = await $fetch<PreviewResult>('/api/preview', {
      method: 'POST',
      body: formData,
    })
    lastResult.value = response
    if (response.ok) preview.value = response
  } catch (error: unknown) {
    const response = (error as { data?: PreviewResult }).data
    if (response) {
      lastResult.value = response
    } else {
      transportError.value = 'The preview service could not be reached. Please try again.'
      lastResult.value = null
    }
  } finally {
    submitting.value = false
  }
}

function uploadFingerprint(upload: { file: File; topic: string }): string {
  return `${upload.topic.trim().toLowerCase()}::${upload.file.name}::${upload.file.size}::${upload.file.lastModified}`
}

async function generateReport(force = false): Promise<void> {
  if (!lastUpload.value || !preview.value?.ok) return

  generating.value = true
  generationError.value = ''
  existingReportUrl.value = ''

  try {
    const fingerprint = uploadFingerprint(lastUpload.value)
    const cached = JSON.parse(sessionStorage.getItem('seedrank:last-report') || 'null') as { fingerprint?: string; reportUrl?: string } | null
    if (!force && cached?.fingerprint === fingerprint && cached.reportUrl) {
      existingReportUrl.value = cached.reportUrl
      generationError.value = 'A saved report already exists for this file and topic.'
      return
    }
    generationStage.value = 'checking'
    const checkData = new FormData()
    checkData.append('topic', lastUpload.value.topic)
    checkData.append('file', lastUpload.value.file)
    const checked = await $fetch<PreviewResult>('/api/preview', { method: 'POST', body: checkData })
    lastResult.value = checked
    if (!checked.ok) {
      preview.value = null
      generationError.value = 'Please fix the CSV issues above before generating the blog.'
      return
    }
    preview.value = checked

    generationStage.value = 'generating'
    const formData = new FormData()
    formData.append('topic', lastUpload.value.topic)
    formData.append('file', lastUpload.value.file)
    const response = await $fetch<GenerateResult>('/api/generate', {
      method: 'POST',
      body: formData,
    })
    if (response.ok && response.reportUrl) {
      generationStage.value = 'saving'
      sessionStorage.setItem('seedrank:last-report', JSON.stringify({ fingerprint, reportUrl: response.reportUrl }))
      await navigateTo(response.reportUrl)
      return
    }
    generationError.value = response.message ?? 'The report could not be generated.'
  } catch (error: unknown) {
    const response = (error as { data?: GenerateResult }).data
    generationError.value = response?.message ?? 'The report could not be generated. Please try again.'
  } finally {
    generating.value = false
    generationStage.value = 'idle'
  }
}
</script>

<template>
  <main id="main-content" class="page-frame">
    <section class="hero-grid" aria-labelledby="page-title">
      <div class="hero-copy">
        <div class="eyebrow">A data-backed blog builder</div>
        <h1 id="page-title">Read the dataset before you write the story.</h1>
        <p class="hero-lede">SeedRank turns a company CSV into a transparent industry report. Every row is checked, the figures stay visible and the editorial layer is grounded in the uploaded evidence.</p>
        <div class="hero-meta" aria-label="Report status">
          <span><i class="meta-dot meta-dot-live" aria-hidden="true" /> Verified data</span>
          <span><i class="meta-dot meta-dot-live" aria-hidden="true" /> Editorial copy</span>
          <span><i class="meta-dot meta-dot-live" aria-hidden="true" /> Saved reports</span>
        </div>
      </div>
      <aside class="hero-brief" aria-label="Report summary">
        <span class="brief-index">REPORT</span>
        <p>One upload in.<br>One saved report out.</p>
        <span class="brief-rule" aria-hidden="true" />
        <small>Evidence-led industry reports</small>
        <NuxtLink class="example-link" to="/reports/fintech-c8ec7f36">View fintech example ↗</NuxtLink>
      </aside>
    </section>

    <section class="workspace-grid" aria-label="Dataset workspace">
      <DatasetUpload :busy="submitting" @submit="handleSubmit" />
      <div class="results-column">
        <div v-if="transportError" class="transport-error" role="alert">{{ transportError }}</div>
        <ValidationSummary
          v-if="lastResult"
          :errors="lastResult.errors"
          :warnings="lastResult.warnings"
          :ready="lastResult.ok"
          :rows-found="lastResult.rows.length"
          :generating="generating"
          :headers="lastResult.headers"
          :file-name="lastResult.fileName"
          @generate="generateReport()"
        />
        <div v-else class="empty-validation">
          <div class="eyebrow">02 / Validation</div>
          <h2>Waiting for a source file.</h2>
          <p>Required fields, data quality and row-level issues will appear here after the server receives the CSV.</p>
        </div>
      </div>
    </section>

    <ReportPreview v-if="preview" :preview="preview" />

    <section v-if="preview && lastUpload" class="generation-panel" aria-labelledby="generation-heading" :aria-busy="generating">
      <div>
        <div class="eyebrow">04 / Editorial layer</div>
        <h2 id="generation-heading">The numbers are ready. Write the story.</h2>
        <p>The report is rechecked before editorial copy is generated. This can take around one minute; verified facts and relationships are checked again before the complete report is saved.</p>
      </div>
      <div class="generation-action">
        <button class="primary-button" type="button" :disabled="generating" aria-describedby="generation-help" @click="generateReport">
          <span>{{ generating ? `${generationStageLabel}…` : 'Generate blog' }}</span>
          <span aria-hidden="true">↗</span>
        </button>
        <p id="generation-help" class="rate-limit-note">This writes and saves the article. It may take around one minute; the button is disabled while it runs.</p>
        <p v-if="generating" class="generation-status" role="status" aria-live="polite">{{ generationStageLabel }}. Your selected file and topic are preserved.</p>
        <div v-if="generationError && !generating" class="generation-recovery">
          <NuxtLink v-if="existingReportUrl" class="secondary-button" :to="existingReportUrl">Open existing report</NuxtLink>
          <button class="secondary-button" type="button" @click="generateReport(Boolean(existingReportUrl))">{{ existingReportUrl ? 'Regenerate blog' : 'Retry generation' }}</button>
        </div>
        <p v-if="generationError" class="inline-error" role="alert" aria-live="assertive">{{ generationError }}</p>
      </div>
    </section>

    <section v-else class="report-placeholder" aria-labelledby="report-heading">
      <div class="eyebrow">Your report</div>
      <h2 id="report-heading">Your report will keep the evidence in view.</h2>
      <div class="placeholder-lines" aria-hidden="true"><span /><span /><span /></div>
      <p>The blog template pairs SEO-friendly editorial copy with deterministic statistics and every validated company row. No market-wide claim is made from an upload alone.</p>
    </section>
  </main>
</template>
