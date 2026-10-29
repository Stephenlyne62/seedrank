<script setup lang="ts">
const props = defineProps<{
  error: { statusCode?: number; statusMessage?: string; message?: string }
}>()

const isNotFound = computed(() => props.error.statusCode === 404)

function returnHome() {
  clearError({ redirect: '/' })
}
</script>

<template>
  <main class="page-frame error-page" aria-labelledby="error-title">
    <p class="eyebrow">{{ isNotFound ? '404 / Not found' : 'Something went wrong' }}</p>
    <h1 id="error-title">{{ isNotFound ? 'This report has moved or does not exist.' : 'The page could not be loaded.' }}</h1>
    <p>{{ isNotFound ? 'Check the report link or return to SeedRank to create a new company report.' : (error.statusMessage || error.message || 'Please try again.') }}</p>
    <NuxtLink class="primary-button" to="/" @click.prevent="returnHome">Return to SeedRank <span aria-hidden="true">↗</span></NuxtLink>
  </main>
</template>
