<script setup lang="ts">
if (import.meta.server) setResponseStatus(404)
</script>

<template>
  <main class="page-frame error-page" aria-labelledby="error-title">
    <p class="eyebrow">404 / Not found</p>
    <h1 id="error-title">This report has moved or does not exist.</h1>
    <p>Check the report link or return to SeedRank to create a new company report.</p>
    <NuxtLink class="primary-button" to="/">Return to SeedRank <span aria-hidden="true">↗</span></NuxtLink>
  </main>
</template>
