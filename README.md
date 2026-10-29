# SeedRank CSV Blog Builder

SeedRank is a public, no-login Nuxt application for the technical assessment. It accepts a CSV and an industry/topic, validates the upload on the server, calculates deterministic statistics, generates structured editorial copy with Gemini, saves a complete report in Supabase and renders the saved result at a server-rendered `/reports/[slug]` URL.

## Stack

- Nuxt 4.6.3
- Vue 3
- TypeScript 5.9.3 with `vue-tsc`
- Papa Parse 5.7.0 for server-side CSV parsing
- Gemini Developer API (`gemini-3.5-flash-lite`) for structured editorial copy
- Supabase REST API for complete report persistence
- pnpm 11.25.0
- Node 22+

No authentication is configured. The upload and preview are accessible without login.

## Run locally

```bash
cp .env.example .env
pnpm install
pnpm dev
```

Add the server-only values from `.env.example`, then apply the SQL files in `supabase/migrations/` in numeric order in the Supabase SQL Editor before testing generation. Fresh projects need the table definition and explicit server-role permissions; existing installations should also apply the permission migration. Keep `public` enabled as an exposed schema in the Supabase Data API. Open `http://localhost:3000`. Use `public/sample.csv` for a tiny manual example, or upload `fintech_companies_seed.csv` for the supplied assessment fixture.

Useful checks:

```bash
pnpm typecheck
pnpm build
pnpm test
```

For the compiled-server reliability smoke test, stop `pnpm dev` so port 3000 is free, then run `node scripts/smoke-reliability.mjs` after building. It starts and stops its own local server with a deliberately unreachable local storage URL, checks HTTP 413 from both upload endpoints, a sanitized HTTP 503 storage error and branded 404 HTML. It makes no Gemini request or hosted-database write.

The Vitest suite covers CSV aliases, missing funding, malformed GBP values, tie ordering, optional-data warnings, AI numerical/attribution checks, shared upload byte-limit boundaries and missing-report versus service-error mapping. The reversed multi-company/amount claim from review is a regression case. These tests do not establish that every possible AI claim is factual or that a fresh hosted Supabase project is correctly configured.

## Data workflow

The browser submits `FormData` to `POST /api/preview`. The server parses the CSV, validates required fields, separates blocking errors from warnings, preserves employee range strings, calculates statistics and returns a typed preview response. The client renders only the deterministic statistics and validated rows returned by the server.

`POST /api/generate` receives the original CSV again and runs the same dataset processor before calling Gemini. Both upload endpoints use `server/utils/upload.ts` to reject files larger than 5 MiB (5,242,880 bytes) before decoding or parsing the CSV. Multipart data is still buffered by H3; this is not a streaming or infrastructure-level request-body limit.

The AI receives verified facts only. Its structured response contains `title`, `introduction`, `metaDescription`, `insights` and `conclusion`; the server validates the shape and applies partial numerical/attribution checks before saving. Monetary sentences naming companies must contain exactly one known company and one amount matching that company. Compound claims, including valid-looking “respectively” comparisons, are conservatively rejected and the prompt requests separate sentences. Numeric company names and decimal GBP values are handled explicitly. This can reject valid prose and cannot detect every invented entity, implication, qualitative claim or relationship; it is not complete fact-checking.

`server/api/reports/[slug].get.ts` reads the complete record from Supabase, and `app/pages/reports/[slug].vue` renders it through SSR. Viewing a saved report never calls Gemini or reprocesses the CSV. `/reports` lists saved reports from the database, and `/sitemap.xml` includes the public report URLs for discovery.

Blocking errors include missing required columns, empty company names, missing funding, invalid fundraising amounts, invalid ranks, duplicate ranks, duplicate companies and empty datasets. Common aliases such as `Company Name`, `Funding Raised` and `Total Funding Raised` are accepted; an unrecognised required header returns the supported alternatives to rename. Missing websites, descriptions, regions, stages or employee values are warnings with safe fallbacks.

Validation is deliberately strict at the input boundary. Ranks must be positive whole-number strings, fundraising values must be finite non-negative GBP amounts, and values such as `$100`, `€100`, `0x10` and `1e309` are rejected. Website values are only used as links when they parse as `http:` or `https:` URLs; unsafe or malformed values become warnings and are rendered without a link. Uploaded rows are sorted by fundraising before display, with a derived display rank and the original uploaded rank retained as `sourceRank`.

The reusable statistics layer derives company count, combined fundraising, median fundraising, location counts, highest fundraising company, stage breakdown, top-five funding share and unknown/range employee counts from each upload. The comparison uses all available companies when there are fewer than five; shared wording labels a four-row dataset as four companies in the preview, saved report and future AI prompt. Older small reports receive the corrected fourth-insight wording when rendered, without rewriting their stored records or calling AI again. It does not assume that every dataset has 100 companies or is Seed stage.

## Supplied fixture verification

The included `fintech_companies_seed.csv` contains 100 rows and was checked through the real server upload endpoint. The response produced:

- 100 companies
- £622,301,270 combined fundraising
- £4,146,786 median fundraising
- 78 London companies
- Nevis as the highest-funded company at £30,314,247
- 3 unknown employee counts
- Seed stage for all 100 uploaded rows

The application uses cautious dataset-scoped wording and does not claim that the rows represent the biggest companies across every stage or the entire UK market.

## Project structure

- `app/pages/index.vue` — upload workspace and page metadata.
- `app/components/` — intake, validation, statistics and report preview components.
- `server/api/preview.post.ts` — public multipart upload endpoint.
- `server/api/generate.post.ts` — revalidation, AI generation, claim checks and persistence.
- `server/utils/dataset.ts` — pure CSV parsing, validation and statistics logic.
- `server/utils/ai.ts` — Gemini client, structured response checks and relationship-aware claim validation.
- `server/utils/upload.ts` — shared preview/generation file-size and input guard.
- `server/utils/reports.ts` — server-only Supabase repository.
- `supabase/migrations/001_create_reports.sql` — reports table migration.
- `app/pages/reports/[slug].vue` — saved server-rendered report route.
- `app/pages/reports/index.vue` — crawlable saved-report index.
- `shared/types/dataset.ts` — shared serializable response types.
- `shared/utils/report-wording.ts` — count-aware funding comparison shared by display and AI prompts.
- `public/manus-routes.json` — managed preview route manifest.
- `app/error.vue` — custom Nuxt error component, inside this project's resolved `app/` source directory.
- `app/pages/[...path].vue` — unknown-route page returning HTTP 404.
- `tests/dataset.test.ts` — parser and awkward-input regression tests.
- `tests/ai.test.ts`, `tests/ai-provider.test.ts`, `tests/upload.test.ts`, `tests/report-error.test.ts` — reliability regressions and mocked provider failures from source review.
- `tests/report-wording.test.ts` — small-dataset and legacy saved-report wording regressions.
- `scripts/smoke-reliability.mjs` — compiled-server upload/error checks without live external calls.
- `server/routes/sitemap.xml.ts` — dynamic sitemap for the report index and saved reports.
- `.env.example` — fresh-clone server configuration template.
- `fintech_companies_seed.csv` — supplied assessment fixture.

## Configuration

Configure `GEMINI_API_KEY`, `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as server-only project secrets. Apply the Supabase migration before using generation. The generation limiter is a best-effort in-memory five-minute window per process, not a reliable quota cap for multi-instance deployment. The numerical validator is not complete natural-language fact-checking; qualitative claims and every possible attribution still require editorial review. See `docs/architecture.md` and `docs/gemini-integration.md` for the full flow and provider assumptions.

Fresh hosted Supabase installation is still an explicit verification item, not a claimed successful test. The migrations now include explicit `service_role` schema usage and table SELECT/INSERT grants, RLS and revocations for browser roles. See `docs/reliability-review.md` for the fresh-project verification procedure and current evidence.

When combined fundraising is £0, the funding-share comparison is unavailable rather than a percentage of zero. The preview, saved-report presentation and AI prompt use the same explanation; stale fourth insights are corrected when rendered, without a database rewrite. Generated numeric percentage claims for these uploads are rejected, and regional bars stay at zero width.
