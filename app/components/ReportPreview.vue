<script setup lang="ts">
import type { PreviewResult } from '#shared/types/dataset'
import { fundingShareWording, reportInsightWording } from '#shared/utils/report-wording'

const props = defineProps<{
  preview: PreviewResult
  createdAt?: string
}>()

const searchQuery = ref('')
const regionFilter = ref('')
const fundingShare = computed(() => props.preview.stats ? fundingShareWording(props.preview.stats) : null)
const displayInsights = computed(() => {
  const insights = props.preview.copy?.insights ?? []
  return props.preview.stats ? reportInsightWording(insights, props.preview.stats) : insights
})

const displayTitle = computed(() => {
  const title = props.preview.copy?.title ?? `${props.preview.topic} report`
  const match = title.match(/^.+? Dataset Report: Analysis of (.+)$/i)
  if (match?.[1]) {
    const topic = props.preview.topic.charAt(0).toUpperCase() + props.preview.topic.slice(1)
    return `${topic} · ${match[1]}`
  }
  return title
})

const regionOptions = computed(() => Object.keys(props.preview.stats?.locationCounts ?? {}).sort((a, b) => a.localeCompare(b)))

const filteredRows = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return props.preview.rows.filter((row) => {
    const matchesSearch = !query || [row.company, row.description, row.region, row.stage].some((value) => value.toLowerCase().includes(query))
    const matchesRegion = !regionFilter.value || (row.region || 'Unknown') === regionFilter.value
    return matchesSearch && matchesRegion
  })
})

const filtersActive = computed(() => Boolean(searchQuery.value.trim() || regionFilter.value))

const fundingByRegion = computed(() => {
  const totals = new Map<string, number>()
  for (const row of props.preview.rows) {
    const region = row.region || 'Unknown'
    totals.set(region, (totals.get(region) ?? 0) + row.totalRaised)
  }
  return Array.from(totals, ([region, total]) => ({ region, total })).sort((a, b) => b.total - a.total).slice(0, 8)
})

const maxRegionalFunding = computed(() => fundingByRegion.value[0]?.total || 1)

const insightHeadings = computed(() => {
  const topLocation = Object.entries(props.preview.stats?.locationCounts ?? {}).sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'The leading region'
  const topStage = Object.entries(props.preview.stats?.stageBreakdown ?? {}).sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'The leading stage'
  const highestFundraisingCompany = props.preview.stats?.highestFundraising?.company ?? 'One company'
  return [
    `${topLocation} leads this dataset`,
    `${highestFundraisingCompany} raised the most funding`,
    `${topStage} is the dominant stage`,
    'The highest-funded companies’ share',
  ]
})

function resetFilters(): void {
  searchQuery.value = ''
  regionFilter.value = ''
}

watch(() => props.preview.fileName, resetFilters)

const currency = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 2,
})

const wholeCurrency = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0,
})

function formatCurrency(value: number): string {
  return currency.format(value)
}

function formatWholeCurrency(value: number): string {
  return wholeCurrency.format(value)
}

function formatCount(value: number): string {
  return new Intl.NumberFormat('en-GB').format(value)
}

function topEntries(values: Record<string, number>, limit = 3): string {
  return Object.entries(values)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([label, count]) => `${label} (${count})`)
    .join(' · ')
}
</script>

<template>
  <article class="report-preview" aria-labelledby="report-title">
    <header class="report-header">
      <div class="report-copy">
        <p class="report-kicker">{{ preview.topic }} / fundraising index</p>
        <component :is="createdAt ? 'h1' : 'h2'" id="report-title">{{ displayTitle }}</component>
        <p class="report-introduction">{{ preview.copy?.introduction }}</p>
        <a class="jump-link" href="#company-rankings">Jump to company rankings ↓</a>
      </div>
      <div class="report-source-meta" aria-label="Report metadata">
        <span v-if="createdAt" class="saved-date">Saved report · {{ new Date(createdAt).toLocaleDateString('en-GB') }}</span>
        <span class="source-chip">Source: {{ preview.fileName }}</span>
      </div>
    </header>

    <section class="insight-section" aria-labelledby="insights-heading">
      <div class="section-heading">
        <span class="section-number">A</span>
        <div>
          <p class="eyebrow">Key figures</p>
          <h3 id="insights-heading">Funding overview</h3>
        </div>
      </div>
      <div v-if="preview.stats" class="stat-grid">
        <StatCard label="Companies" :value="formatCount(preview.stats.companyCount)" detail="Full dataset" />
        <StatCard label="Total funding raised" :value="formatWholeCurrency(preview.stats.combinedFundraising)" detail="Full dataset" />
        <StatCard label="Median funding raised" :value="formatCurrency(preview.stats.medianFundraising)" detail="Full dataset" />
        <StatCard
          label="Most funding raised"
          :value="preview.stats.highestFundraising ? formatWholeCurrency(preview.stats.highestFundraising.totalRaised) : '—'"
          :detail="`${preview.stats.highestFundraising?.company ?? 'No company'} · full dataset`"
        />
      </div>
      <p v-if="filtersActive" class="filter-note" role="status" aria-live="polite">Headline figures cover the full dataset. Showing {{ formatCount(filteredRows.length) }} of {{ formatCount(preview.rows.length) }} companies below.</p>
      <div v-if="preview.stats" class="insight-notes">
        <p><strong>Stage breakdown.</strong> {{ topEntries(preview.stats.stageBreakdown) || 'No stage values supplied.' }}</p>
        <p><strong>Regional distribution.</strong> {{ topEntries(preview.stats.locationCounts) || 'No region values supplied.' }}</p>
        <p><strong>{{ fundingShare?.label }}</strong> {{ fundingShare?.sentence }}</p>
        <p><strong>Employees.</strong> Employee counts are reported as ranges where supplied; {{ preview.stats.unknownEmployeeCount }} compan{{ preview.stats.unknownEmployeeCount === 1 ? 'y has' : 'ies have' }} no employee data.</p>
      </div>
      <div v-if="displayInsights.length" class="ai-insights" aria-label="Key insights">
        <article v-for="(insight, index) in displayInsights" :key="index">
          <h4>{{ insightHeadings[index] ?? 'Key finding' }}</h4>
          <p><span aria-hidden="true">↗</span>{{ insight }}</p>
        </article>
      </div>
      <div v-if="fundingByRegion.length" class="region-chart" aria-labelledby="funding-region-heading">
        <div class="chart-heading">
          <div>
            <p class="eyebrow">Full dataset</p>
            <h4 id="funding-region-heading">Funding by region</h4>
          </div>
          <span class="chart-note">Top regions by total funding</span>
        </div>
        <div class="region-bars">
          <div v-for="entry in fundingByRegion" :key="entry.region" class="region-bar">
            <div class="region-bar-label"><span>{{ entry.region }}</span><strong>{{ formatWholeCurrency(entry.total) }}</strong></div>
            <div class="region-bar-track"><span :style="{ width: `${(entry.total / maxRegionalFunding) * 100}%` }" /></div>
          </div>
        </div>
      </div>
    </section>

    <section id="company-rankings" class="ranking-section" aria-labelledby="ranking-heading">
      <div class="section-heading">
        <span class="section-number">B</span>
        <div>
          <p class="eyebrow">Company rankings</p>
          <h3 id="ranking-heading">{{ preview.copy?.sectionHeading }}</h3>
        </div>
      </div>
      <div class="ranking-tools" role="search" aria-label="Filter company rankings">
        <label>
          <span>Search companies</span>
          <input v-model="searchQuery" type="search" placeholder="Search by name, stage or region">
        </label>
        <label>
          <span>Region</span>
          <select v-model="regionFilter">
            <option value="">All regions</option>
            <option v-for="region in regionOptions" :key="region" :value="region">{{ region }}</option>
          </select>
        </label>
        <div class="ranking-tool-status">
          <span>{{ formatCount(filteredRows.length) }} matching compan{{ filteredRows.length === 1 ? 'y' : 'ies' }}</span>
          <button v-if="filtersActive" class="reset-button" type="button" @click="resetFilters">Reset filters</button>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <caption class="visually-hidden">{{ preview.copy?.title }}</caption>
          <thead>
            <tr>
              <th scope="col">Rank</th>
              <th scope="col">Company</th>
              <th scope="col">Region</th>
              <th scope="col">Stage</th>
              <th scope="col">Employees</th>
          <th scope="col" class="numeric">Funding raised</th>
              <th scope="col">Website</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in filteredRows" :key="`${row.rank}-${row.company}`">
              <td class="rank-cell">{{ row.rank }}</td>
              <th scope="row">
                <span class="company-name">{{ row.company }}</span>
                <span class="company-description">{{ row.description }}</span>
              </th>
              <td>{{ row.region || 'Unknown' }}</td>
              <td><span class="stage-tag">{{ row.stage || 'Unknown' }}</span></td>
              <td>{{ row.employees || 'Unknown' }}</td>
              <td class="numeric raised-cell">{{ formatWholeCurrency(row.totalRaised) }}</td>
              <td>
                <a v-if="row.website" class="table-link" :href="row.website" target="_blank" rel="noreferrer">Visit ↗</a>
                <span v-else class="muted-value">Not supplied</span>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="!filteredRows.length" class="no-results">No companies match these filters. <button class="inline-reset" type="button" @click="resetFilters">Reset filters</button></p>
      </div>
    </section>

    <footer class="report-conclusion">
      <p class="eyebrow">About this data</p>
      <p>{{ preview.copy?.conclusion }}</p>
      <details class="methodology-details">
        <summary>How these figures are calculated</summary>
        <div>
          <p>Funding totals and rankings use finite GBP values from the <strong>Total Raised</strong> column. The median is the middle funding value after sorting the companies; with an even number of companies, it averages the two middle values. Regional funding is summed from the full dataset.</p>
          <p>Companies with equal funding keep a stable source-rank order, so display ranks remain deterministic without inventing shared ranks.</p>
          <p>Employee counts are shown as supplied. Ranges are not added as exact totals, and missing employee values are reported explicitly. Search and region filters affect the table only; headline figures remain full-dataset metrics.</p>
          <p>Required columns are Rank, Company, Region, Stage, Employees and Total Raised. Description, Website and Industries are optional. Findings describe this dataset and do not establish a wider market ranking.</p>
        </div>
      </details>
    </footer>
  </article>
</template>
