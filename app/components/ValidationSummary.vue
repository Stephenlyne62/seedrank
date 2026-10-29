<script setup lang="ts">
import type { ValidationIssue } from '#shared/types/dataset'
import { validationCheckStatus } from '#shared/utils/validation-evidence'

const props = defineProps<{
  errors: ValidationIssue[]
  warnings: ValidationIssue[]
  ready: boolean
  rowsFound: number
  generating: boolean
  headers: string[]
  fileName: string
}>()

const emit = defineEmits<{ generate: [] }>()
const checks = computed(() => validationCheckStatus(props.headers, props.errors))
</script>

<template>
  <section class="validation-panel" aria-labelledby="validation-heading">
    <div class="eyebrow">02 / Validation</div>
    <div class="validation-heading-row">
      <h2 id="validation-heading">Dataset checks</h2>
      <span v-if="ready" class="status-pill status-ready"><span aria-hidden="true">●</span> Ready to preview</span>
      <span v-else class="status-pill status-blocked"><span aria-hidden="true">●</span> Needs attention</span>
    </div>

    <div v-if="errors.length" class="issue-group issue-errors" role="alert">
      <div class="issue-title"><span aria-hidden="true">!</span> Blocking errors <span class="issue-count">{{ errors.length }}</span></div>
      <ul>
        <li v-for="(error, index) in errors.slice(0, 8)" :key="`${error.code}-${index}`">
          <span>{{ error.message }}</span>
          <small v-if="error.row || error.field">{{ [error.row ? `row ${error.row}` : '', error.field].filter(Boolean).join(' · ') }}</small>
        </li>
      </ul>
      <p v-if="errors.length > 8" class="issue-more">{{ errors.length - 8 }} more blocking errors are hidden.</p>
    </div>

    <div v-if="warnings.length" class="issue-group issue-warnings">
      <div class="issue-title"><span aria-hidden="true">△</span> Warnings <span class="issue-count">{{ warnings.length }}</span></div>
      <ul>
        <li v-for="(warning, index) in warnings.slice(0, 8)" :key="`${warning.code}-${index}`">
          <span>{{ warning.message }}</span>
          <small v-if="warning.row || warning.field">{{ [warning.row ? `row ${warning.row}` : '', warning.field].filter(Boolean).join(' · ') }}</small>
        </li>
      </ul>
      <p v-if="warnings.length > 8" class="issue-more">{{ warnings.length - 8 }} more warnings are hidden.</p>
    </div>

    <p v-if="!errors.length && !warnings.length" class="validation-clear">All checks passed. {{ rowsFound }} compan{{ rowsFound === 1 ? 'y is' : 'ies are' }} ready to preview.</p>
    <p v-else-if="!errors.length" class="validation-clear">Warnings do not prevent the report preview. Empty optional values use a visible fallback.</p>
    <div v-if="ready" class="validation-generate">
      <button class="primary-button" type="button" :disabled="generating" @click="emit('generate')">
        <span>{{ generating ? 'Generating blog…' : 'Generate blog now' }}</span>
        <span aria-hidden="true">↗</span>
      </button>
      <span>Or review the verified preview below first.</span>
    </div>
    <details class="validation-details">
      <summary>What was checked</summary>
      <dl class="validation-evidence">
        <div><dt>Companies ready</dt><dd>{{ rowsFound }}</dd></div>
        <div><dt>Columns found</dt><dd>{{ headers.length }}</dd></div>
        <div><dt>Blocking errors</dt><dd>{{ errors.length }}</dd></div>
        <div><dt>Required columns</dt><dd>{{ checks.requiredColumns }}</dd></div>
        <div><dt>Rank values</dt><dd>{{ checks.rankValues }}</dd></div>
        <div><dt>Total Raised values</dt><dd>{{ checks.fundingValues }}</dd></div>
        <div class="validation-evidence-file"><dt>Uploaded file</dt><dd>{{ fileName }}</dd></div>
      </dl>
    </details>
  </section>
</template>
