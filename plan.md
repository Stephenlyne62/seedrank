# SeedRank implementation plan

## Scope for this milestone

SeedRank is a reusable Nuxt.js implementation for the technical assessment's AI-powered SEO blog generator. The current milestone covers the deterministic data layer, server-side AI generation, Supabase persistence and the saved SSR report route:

- accept one CSV upload and an industry/topic field;
- parse and validate the dataset on the server;
- distinguish blocking errors from non-blocking warnings;
- calculate statistics from the uploaded rows without assuming a fixed company count or stage;
- preserve employee ranges and unknown values without summing ranges as exact totals;
- render a server-visible, SEO-oriented preview with metadata fields, headings, editorial placeholders and a complete ranking table;
- revalidate the original CSV before generation, send verified facts to Gemini, validate structured copy and relationship-aware numerical claims;
- save the complete report in Supabase and render it at `/reports/[slug]` without another AI call;
- deploy the Nuxt SSR container with server-only secrets.

The assessment's blog requirement remains visible in the page structure, while deterministic statistics remain the source of truth and AI copy is treated as an editorial layer with documented fact-checking limits.

## Framework and implementation decisions

Nuxt 4.6.3 is pinned because Nuxt's current official roadmap identifies Nuxt 4 as the active stable major and Nuxt 3 as unsupported from 31 July 2026. The official Nuxt installation guide recommends Node 22.x or newer, so the project uses the available Node 22 runtime and pnpm with a checked-in package-manager pin.

The application uses Nuxt 4's `app/` and `server/` structure. Both `server/api/preview.post.ts` and `server/api/generate.post.ts` call the same pure validation/statistics functions. The generation route receives the original multipart CSV again rather than trusting browser statistics, then sends only verified facts to the AI module and persists the accepted result through a server-only Supabase repository.

Papa Parse handles CSV tokenization on the server. Required headers are normalized for matching but original display values are preserved. Missing required headers, empty company names, malformed fundraising values, duplicate ranks, duplicate companies and rows without a usable rank are blocking errors. Missing websites, descriptions or optional fields are warnings with safe fallbacks. The server never totals employee ranges; it only counts unknown records and preserves the original range string.

Statistics are derived for every upload: company count, combined fundraising, median fundraising, location counts, highest-fundraising company, stage breakdown and unknown/range employee counts. Currency parsing supports finite GBP values with validated comma placement. Valid rows are sorted by fundraising and receive derived display ranks while retaining source ranks. The AI prompt includes relationship facts and the validator checks company/amount, region/count and stage/count relationships when those claims appear in generated sentences.

The first page is intentionally a data-backed industry report preview rather than a claim about all companies in a market. Copy uses cautious language such as “companies in this dataset” and never says “most funded in the UK” unless a future verified dataset-level rule explicitly supports that claim.

## Design direction

Three possible styles were considered:

- **Editorial data desk** — 0.07: a quiet newsroom-like canvas that makes verified figures and source rows feel authoritative.
- **Product lab console** — 0.05: a denser instrument-panel interface focused on validation states and processing feedback.
- **Civic index card** — 0.03: a public-records visual language with strong dividers, stamps and neutral typography.

The selected direction is **Editorial data desk**.

### Design Movement

A contemporary editorial research desk: calm, precise and slightly tactile, combining long-form report hierarchy with visible data provenance.

### Core Principles

1. Verified numbers receive the strongest visual hierarchy.
2. Warnings are explanatory and non-alarming; blocking errors are unmistakable.
3. The ranking table stays readable on small screens through intentional horizontal overflow.
4. Every section should feel useful even before AI copy and persistence are added.

### Color Philosophy

Use an ink-black base, warm paper surfaces and one electric chartreuse accent. The palette separates “source material” from “system status” without using color as the only signal. Green is reserved for verified/ready states, amber for warnings and red for blocking errors.

### Layout Paradigm

A left editorial rail introduces the dataset and workflow, while the main report column unfolds vertically into validation, key figures and the ranking table. The upload panel behaves like a clipped newsroom intake sheet rather than a centered generic card.

### Signature Elements

- A thin chartreuse rule beside report headings.
- Monospaced micro-labels for source status, row counts and validation state.
- Oversized statistic numerals that align with a narrow “verified” marker.

### Interaction Philosophy

The interface should explain what happened after upload: what was accepted, what needs attention and what can safely be used. The Generate/preview action remains disabled until both a file and topic are present; errors appear next to the relevant workflow step, and warnings remain actionable without blocking.

### Animation

Use restrained transitions only: a short fade/slide for the validation result, a number reveal only after data is ready, and no looping decoration. Respect reduced-motion preferences.

### Typography System

Use a high-contrast serif for report titles and section headings, paired with a neutral sans-serif for controls and body copy. Use a system monospace stack for metadata and table labels. Keep body text at comfortable reading size with visible focus rings.

### Brand Essence

SeedRank turns uploaded company data into a clear, inspectable industry report preview for teams that need evidence before editorial automation. Personality: exacting, calm, transparent.

### Brand Voice

Headlines are specific and cautious. CTAs describe the actual next step. Example lines: “Read the dataset before you write the story.” and “Preview verified figures from this upload.”

### Wordmark & Logo

A compact `SR/` mark built from two offset rules, suggesting a rank line and a source column. It should be rendered as text/CSS in this milestone rather than introducing an unneeded image asset.

### Signature Brand Color

Electric chartreuse `#d8f36b`, used sparingly as the ownable SeedRank signal color.

## Project structure

```text
app/
  app.vue                 Global shell, fonts, skip link and page outlet.
  assets/css/main.css     Editorial data desk tokens, layout and responsive rules.
  components/
    DatasetUpload.vue     File/topic intake and submission state.
    ValidationSummary.vue Blocking errors and warning presentation.
    ReportPreview.vue     SEO-oriented report headings, metadata, facts and table.
    StatCard.vue          Single verified statistic presentation.
  pages/index.vue         Upload, preview and generate-to-save workflow.
  pages/reports/[slug].vue Saved SSR report page.
server/
  api/preview.post.ts     Multipart endpoint returning validated preview data.
  api/generate.post.ts    Revalidation, Gemini generation and persistence.
  api/reports/[slug].get.ts Saved report API for SSR.
  utils/dataset.ts        CSV parsing, validation, normalization and statistics.
  utils/ai.ts             Structured Gemini client and claim validator.
  utils/reports.ts        Server-only Supabase repository.
  utils/rate-limit.ts     Best-effort in-memory generation limiter.
shared/
  types/dataset.ts        Shared serializable dataset, copy and report types.
supabase/migrations/      Reports-table migration.
Dockerfile                Production Nuxt SSR container.
public/manus-routes.json  Route manifest for the managed preview.
public/sample.csv         Small safe local fixture for manual flow testing.
app.config.ts             Project logo metadata and public runtime configuration.
nuxt.config.ts             Nuxt 4 configuration and global head defaults.
```

## Remaining work

The core assessment flow is implemented. Remaining improvements are operational rather than architectural: replace the process-local limiter with shared quota state for multi-instance hosting, add broader automated tests for generated prose and relationship wording, and add the assessment README and concise technical reflection PDF if those submission artifacts are required.

## Sources checked for the framework decision

- Nuxt roadmap: https://nuxt.com/docs/4.x/community/roadmap
- Nuxt installation guide: https://nuxt.com/docs/4.x/getting-started/installation
- Nuxt releases: https://github.com/nuxt/nuxt/releases
