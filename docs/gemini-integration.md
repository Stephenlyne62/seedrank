# Gemini integration notes

The first AI implementation uses Google's Gemini Developer API from the Nuxt server only. The selected model is `gemini-3.5-flash-lite`, identified in the current official model catalogue as a stable, cost-efficient Flash-Lite model suitable for high-throughput text workflows.

The request uses `generateContent` with `responseMimeType: application/json` and `responseJsonSchema`. The application still parses and validates the returned JSON because provider-side structured output guarantees shape more strongly than factual correctness.

The measured minimal structured request in this project completed in approximately 25 seconds on 29 October 2026. The application therefore uses a bounded 60-second abort timeout and returns a clear 504 message when that limit is exceeded.

The application maps provider status to user-facing errors:

- 429: free-tier rate limit reached; wait and retry.
- 401/403: server API key rejected or model access unavailable.
- timeout: provider did not respond within 60 seconds.
- malformed JSON or wrong fields: structured response rejected.
- unverified numerical or relationship claim: editorial copy rejected before saving.

The generation limiter is intentionally documented as best-effort protection only. It is an in-memory, per-process five-minute window and is not a reliable quota cap on serverless or multi-instance hosting.

Sources:

- https://ai.google.dev/gemini-api/docs/generate-content/structured-output
- https://ai.google.dev/gemini-api/docs/models
- https://ai.google.dev/gemini-api/docs/rate-limits
