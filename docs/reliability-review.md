# Reliability review — 29 October 2026

## Reproduced issues and fixes

The AI validator previously accepted swapped company amounts when both amounts appeared somewhere in the same sentence. Regression tests first reproduced this. Monetary sentences naming companies now require exactly one known company and one matching amount; ambiguous multi-company or multi-amount sentences fail closed. The prompt requests one company/amount per sentence. Decimal amounts and digits inside known company names also have regressions. This is conservative, partial validation, not complete fact-checking. Invented entities, qualitative statements and every possible natural-language relationship are not comprehensively verified.

Both upload endpoints now call `extractCsvUpload` in `server/utils/upload.ts`. Its 5 MiB byte limit runs before UTF-8 decoding, CSV parsing, the generation limiter and AI. H3 still buffers multipart input before this helper runs; streaming and a gateway request-size limit are future improvements.

The saved-report page preserves explicit missing-record 404 responses and storage/service failures. Public messages are fixed, rather than forwarding upstream response details. Nuxt resolves this project's source directory to `app/`, so the custom error component belongs at `app/error.vue`; the earlier root-level file was moved. The separate catch-all route remains for unknown URLs.

The migrations now explicitly grant schema usage and table SELECT/INSERT to `service_role`, enable RLS, and revoke direct table privileges from `anon` and `authenticated`. Migration 002 supplies the same idempotent permission statements for existing installations. It does not add browser-access policies.

## Executed checks

`pnpm test` passed 29 tests across five files. These cover existing parser cases, AI attribution and numeric regressions, mocked provider malformed JSON/shape errors, rate limits, denied access, timeout and missing key, upload-size boundaries and report-error mapping.

`pnpm exec nuxt prepare`, `pnpm typecheck` and `pnpm build` passed.

`node scripts/smoke-reliability.mjs` passed against the compiled server: both upload endpoints returned HTTP 413 for a file one byte over 5 MiB; a controlled local storage outage rendered HTTP 503 with custom HTML and no upstream details; an unknown route returned branded HTTP 404 HTML. These checks did not call Gemini or write to Supabase. Provider unit tests use mocked fetch responses, not a live provider.

## Fresh hosted Supabase verification — pending

No fresh Supabase project was provisioned, and these SQL changes were not executed against a fresh hosted project. An existing working deployment and code inspection do not prove fresh setup. To close this item:

1. Create an isolated free-tier test project with automatic table grants disabled. Keep the `public` schema exposed through the Data API.
2. Apply migrations 001 then 002 using the SQL Editor. Rerun them to check idempotency.
3. Check permissions and RLS using the queries below. Expected values are targets, not observed results in this review.
4. Configure that project's URL and server-only service-role key in an isolated application environment. Verify API SELECT and INSERT work while anonymous table access is denied. Generate one test report through the app and reload its SSR URL. Never place the server key in browser code or Git.

```sql
select
  has_schema_privilege('service_role', 'public', 'USAGE') as server_schema_usage,
  has_table_privilege('service_role', 'public.reports', 'SELECT') as server_can_select,
  has_table_privilege('service_role', 'public.reports', 'INSERT') as server_can_insert,
  has_table_privilege('anon', 'public.reports', 'SELECT') as anonymous_can_select,
  has_table_privilege('authenticated', 'public.reports', 'INSERT') as browser_can_insert;
-- Expected: true, true, true, false, false.

select relrowsecurity from pg_class where oid = 'public.reports'::regclass;
-- Expected: true.
```

For an existing project, apply migration 002 in the SQL Editor. Keep a backup and avoid executing setup checks against real customer data.

## Remaining assessment deliverables

The code checkpoint is not a GitHub submission link. A GitHub repository and the required maximum-three-page technical reflection PDF still need to be supplied. The reflection should honestly explain familiarity, AI assistance, validation limits, SEO/business metrics and V2 decisions. A fresh browser-based unseen-dataset demonstration remains recommended before the interview.
