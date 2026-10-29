# SeedRank TODO

- [x] **Upload and topic intake**
  - The responsive Nuxt page accepts a CSV dataset through a file input and requires an industry/topic field.
  - The upload action is unavailable until both inputs are present and exposes loading and failure states.
  - The page keeps the assessment's SEO blog framing visible through a title, introduction placeholder, headings, metadata fields and editorial copy placeholders.

- [x] **Server-side parsing and validation**
  - The server parses the uploaded CSV rather than relying only on client-side checks.
  - Missing required columns, empty company names, invalid fundraising values, duplicate ranks or companies, and unusable rank values block generation.
  - Missing websites, descriptions and other optional fields produce warnings with safe display fallbacks instead of blocking the preview.
  - Validation identifies affected rows or fields and clearly separates blocking errors from non-blocking warnings.

- [x] **Deterministic reusable statistics**
  - Statistics derive from every uploaded dataset and do not assume that it contains 100 companies or only Seed-stage companies.
  - The preview calculates company count, combined fundraising, median fundraising, location counts, highest-fundraising company, stage breakdown and unknown employee-count records.
  - Employee ranges remain display strings and are never added as exact employee totals.
  - The supplied fixture was verified through the server endpoint: 100 companies, £622,301,270 combined fundraising, £4,146,786 median fundraising, 78 London companies, Nevis at £30,314,247 and 3 unknown employee counts.

- [x] **Accessible report preview**
  - The preview adapts to datasets of different sizes and stage compositions and renders the ranking table from validated rows.
  - The report uses cautious dataset-scoped language and avoids unsupported “most funded in the UK” claims.
  - The UI has clear focus states, readable mobile behavior, semantic headings/table markup and reduced-motion-friendly transitions.

- [x] **Maintainable first-milestone architecture**
  - Upload handling, validation, statistics, formatting and presentation are separated into named modules/components.
  - AI generation, persistence, saved report URLs and deployment are separated into server-side modules and routes rather than mixed into the upload component.

- [x] **Validation hardening after review**
  - Ranks accept only positive whole-number strings; values such as `1abc` and `1.5` are rejected.
  - Fundraising accepts finite non-negative GBP values only; dollar/euro values, hexadecimal strings and overflow values are rejected.
  - Website links are emitted only for HTTP(S) URLs; unsafe or malformed values become warnings and are not linked.
  - Unsorted valid uploads are sorted by fundraising before display, with derived display ranks and original source ranks retained.

- [x] **Structured server-side AI copy**
  - Gemini receives verified facts only and returns structured `title`, `introduction`, `metaDescription`, `insights` and `conclusion` output.
  - The server validates the response shape, numeric claims and company/amount, region/count and stage/count relationships before saving.
  - Timeouts, provider errors, rate limits and malformed responses return explicit user-facing error codes and messages.

- [x] **Persistence and reusable saved reports**
  - Supabase stores one complete report record containing the validated rows, deterministic statistics and accepted editorial copy.
  - `/reports/[slug]` reads the saved record server-side and does not call Gemini when opened.
  - The production container, server-only secrets and root health path are configured for deployment.

- [x] **Submission reliability fixes after focused source review**
  - Reject reversed company/amount claims even when every amount is a valid dataset value; add regression tests and document that validation remains partial, not complete fact-checking.
  - Apply the same 5 MiB file limit to both `/api/preview` and `/api/generate` through shared upload handling, before decoding/parsing or making an AI call.
  - Explicitly grant only the needed schema/table permissions to Supabase `service_role`, with RLS enabled and browser roles denied direct table access. Distinguish local permission checks from a fresh hosted Supabase verification.
  - Missing reports return 404; database outages remain service errors rather than being presented as missing pages.
  - Correct the README error-page paths and document reproducible migration and test setup.
  - Evidence: 29 unit tests, Nuxt typechecking and production build passed; compiled-server smoke checks returned 413 from both upload endpoints, 503 for a simulated local storage outage and branded 404 HTML for an unknown route.

- [ ] **Fresh hosted database and final submission verification**
  - Execute migrations on a new Supabase project with default table grants disabled and verify Data API SELECT/INSERT using server credentials, with browser access denied. SQL permission statements are implemented but this hosted test has not been executed.
  - Supply a GitHub repository link and the required maximum-three-page technical reflection PDF; no such deliverables have been verified yet.

- [x] **Final wording corrections after the live healthtech test**
  - Describe the funding-share comparison using the actual number of companies up to five; four-row datasets must not claim five companies in preview, saved report presentation or future AI prompts.
  - Correct the methodology to list Rank, Company, Region, Stage, Employees and Total Raised as required columns; Description, Website and Industries are optional.
  - Preserve sizing, typography, colours, layout, saved records and the supplied fintech statistics; run affected regressions and refresh the source export.
  - Evidence: 37 tests, strict typechecking and production build passed. Shared wording covers preview, future Gemini prompts and presentation of older small reports without modifying stored records.

- [x] **Zero-total funding comparison**
  - All-zero-funding datasets show that the funding-share comparison is unavailable, not a percentage of a zero total, in the report and future AI prompt.
  - Correct a stale fourth funding-share insight in zero-funded saved reports of any size without modifying the saved record; reject generated numeric percentage claims for zero-funded uploads.
  - Zero-funded regional bars remain at zero width rather than dividing by zero. Positive-funded wording and the existing design remain unchanged.
  - Evidence: 48 tests, strict typechecking and production build passed, including small/large zero-funded reports, mocked prompt content and rejection of zero-funded percentage claims.

- [x] **Content-sized validation cards without the empty grey area**
  - Retain the current two-column desktop layout and stacked mobile panels, with no filler content or changes to upload/generation behavior.
  - The waiting and completed validation cards end naturally after their content. Backgrounds and borders belong to the content-sized cards, and the area below uses the normal cream page background.
  - Verify both waiting and completed states at desktop and mobile widths.
  - Evidence: browser layout assertions passed in waiting/validated states at 1280px and 375px; waiting-state screenshots inspected at both widths. Desktop card heights were 305px/284px beside the 635px intake form, with cream below. Mobile panels stayed stacked with no horizontal page overflow. All 48 tests, typechecking and production build passed; no AI requests or saved reports were created for these checks.

- [x] **Restore the chosen chart yellow**
  - Funding-by-region bars use the exact same yellow token as the company-row hover (`--accent-yellow`), rather than the dark green accent.
  - Preserve proportional bar widths, zero-funding handling, content-sized validation cards and all other existing changes; inspect history to identify the colour regression.
  - History traced the regression to the earlier proportional-chart change (`8fcffda`), not the latest validation-background fix. A style regression now protects the shared yellow token and the absence of minimum bar widths.

- [x] **Retain the validation evidence summary**
  - Restore “What was checked” as a compact expandable section inside the content-sized validation card after an upload, without a separate grey background or stretched container.
  - Show the actual filename, detected column count, companies ready, blocking-error count, required-column status and rank/GBP checks; checks skipped due to structural errors must not be marked valid.
  - Preserve the restored yellow charts, proportional widths, desktop columns and stacked mobile panels.
  - Evidence: 55 tests, typechecking and production build passed. Browser checks at 1280px and 375px verified open/close behavior, actual summary data, transparent workspace background, no mobile overflow, yellow bars matching row hover and proportional 100%/50% widths. No AI requests or saved reports were created.
