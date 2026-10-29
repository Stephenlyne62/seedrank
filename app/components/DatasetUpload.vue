<script setup lang="ts">
const props = defineProps<{
  busy: boolean
}>()

const emit = defineEmits<{
  submit: [payload: { file: File; topic: string }]
}>()

const selectedFile = ref<File | null>(null)
const topic = ref('')
const localError = ref('')

function onFileChange(event: Event): void {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  localError.value = ''

  if (file && !file.name.toLowerCase().endsWith('.csv')) {
    selectedFile.value = null
    input.value = ''
    localError.value = 'Please choose a file with a .csv extension.'
    return
  }

  selectedFile.value = file
}

function submit(): void {
  if (!selectedFile.value || !topic.value.trim()) {
    localError.value = 'Choose a CSV file and enter an industry or topic.'
    return
  }

  localError.value = ''
  emit('submit', { file: selectedFile.value, topic: topic.value.trim() })
}
</script>

<template>
  <form class="intake-sheet" @submit.prevent="submit">
    <div class="eyebrow">01 / Source intake</div>
    <div class="intake-heading">
      <h2>Start with the rows.</h2>
      <p>Bring one company dataset. SeedRank checks the structure and shows the evidence before editorial copy is added.</p>
      <p class="intake-constraints"><strong>Required:</strong> Rank, Company, Region, Stage, Employees and Total Raised. <strong>Optional:</strong> Description, Website and Industries. CSV up to 5 MiB (5,242,880 bytes); funding must be finite GBP amounts.</p>
    </div>

    <div class="field-stack">
      <label class="field-label" for="topic">Industry or topic <span aria-hidden="true">*</span></label>
      <input
        id="topic"
        v-model="topic"
        name="topic"
        type="text"
        maxlength="80"
        placeholder="e.g. fintech, healthtech or climate software"
        autocomplete="off"
        aria-describedby="topic-help"
      >
      <span id="topic-help" class="field-help">This label shapes the report wording. The dataset remains the source of truth.</span>
    </div>

    <div class="field-stack">
      <span class="field-label">CSV dataset <span aria-hidden="true">*</span></span>
      <label class="file-drop" for="csv-file" aria-describedby="file-help">
        <span class="file-drop-icon" aria-hidden="true">＋</span>
        <span>
          <strong>{{ selectedFile ? selectedFile.name : 'Choose a CSV file' }}</strong>
          <small>{{ selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB selected` : 'Required columns and GBP values are checked on the server' }}</small>
        </span>
        <span class="file-browse">Browse</span>
      </label>
      <input id="csv-file" class="visually-hidden" type="file" accept=".csv,text/csv" @change="onFileChange">
      <span id="file-help" class="field-help">Maximum file size: 5 MiB. Use GBP for Total Raised; dollar and euro values are rejected.</span>
    </div>

    <p v-if="localError" class="inline-error" role="alert">{{ localError }}</p>

    <div class="intake-actions">
      <button class="primary-button" type="submit" :disabled="props.busy">
        <span>{{ props.busy ? 'Checking dataset…' : 'Preview verified figures' }}</span>
        <span aria-hidden="true">↗</span>
      </button>
      <a class="sample-link" href="/sample.csv" download>Download a tiny sample CSV</a>
    </div>
  </form>
</template>
