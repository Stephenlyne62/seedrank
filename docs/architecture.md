# SeedRank architecture and reliability limits

The application has one authoritative dataset-processing path. Both `/api/preview` and `/api/generate` apply the same 5 MiB file-byte guard in `server/utils/upload.ts`, then pass the uploaded CSV through `server/utils/dataset.ts`. Generation does not trust statistics or rows sent from the browser. It revalidates, normalizes, sorts and calculates statistics again before any AI request. H3 still buffers multipart uploads: an upstream body-size limit or streaming parser is a production improvement, not something this file-size guard guarantees.

The generation path is:

```text
multipart CSV + topic
→ server validation and deterministic statistics
→ best-effort in-memory rate check
→ Gemini structured JSON request using verified facts only
→ response shape validation
→ numerical claim validation
→ company/amount, region/count and stage/count relationship checks
→ Supabase insert of one complete report record
→ relative /reports/[slug] URL
```

Gemini receives the deterministic facts, location and stage breakdowns, and the top rows already sorted by fundraising. Its output is limited to `title`, `introduction`, `metaDescription`, `insights` and `conclusion`. The application adds the presentation-only section heading after validation.

The numerical validator checks currency and integer claims against supplied facts and performs partial attribution checks. Monetary sentences naming companies must contain exactly one known company and one matching amount. A shared pool of valid amounts no longer permits reversed company attributions: compound claims are rejected rather than inferred. The prompt requests one company/amount per sentence, company-name digits are excluded from count checks, and decimal points inside amounts remain intact.

This conservative approach may reject valid compound prose and is not full fact-checking: it cannot prove every qualitative sentence, identify every invented entity, or detect every attribution expressed in natural language. Location/count and stage/count checks are also partial. Accepted copy still needs editorial review. The deterministic table and headline statistics never come from AI.

Supabase stores `slug`, topic, filename, timestamp and the complete report object in `content_json`. The SSR route reads that object through `/api/reports/[slug]`; viewing a saved report never calls Gemini. The migration is in `supabase/migrations/001_create_reports.sql`.

The generation limiter is deliberately described as best-effort prototype protection. It is an in-memory five-minute window per process and is not a reliable quota cap when serverless instances restart or multiply. A production quota would need shared storage or an edge/provider limiter.

The verified production-mode smoke flow on 29 October 2026 used the real 100-row fintech CSV. It generated four insights, saved 100 rows, returned HTTP 200 from the report API and returned HTTP 200 SSR HTML containing the generated copy and Nevis.
