<script setup lang="ts">
defineProps<{
  label: string
  value: string
  detail?: string
}>()
</script>

<template>
  <article class="stat-card">
    <span class="stat-label">{{ label }}</span>
    <strong class="stat-value">{{ value }}</strong>
    <span v-if="detail" class="stat-detail">{{ detail }}</span>
  </article>
</template>
