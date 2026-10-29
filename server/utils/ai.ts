import type { CompanyRow, DatasetStats, PreviewCopy } from '#shared/types/dataset'
import { fundingShareWording } from '#shared/utils/report-wording'

const GEMINI_MODEL = 'gemini-3.5-flash-lite'
const GEMINI_TIMEOUT_MS = 60_000

const copySchema = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'A cautious dataset-scoped SEO title.' },
    introduction: { type: 'string', description: 'A concise introduction grounded only in the verified facts.' },
    metaDescription: { type: 'string', description: 'A search meta description between 120 and 160 characters.' },
    insights: { type: 'array', items: { type: 'string' }, description: 'Two to five concise data-backed insights.' },
    conclusion: { type: 'string', description: 'A concise dataset-scoped conclusion.' },
  },
  required: ['title', 'introduction', 'metaDescription', 'insights', 'conclusion'],
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> }
    finishReason?: string
  }>
  error?: { code?: number; message?: string; status?: string }
}

interface GenerateCopyOptions {
  apiKey: string
  topic: string
  rows: CompanyRow[]
  stats: DatasetStats
}

export class AiGenerationError extends Error {
  constructor(
    public readonly code: 'missing_key' | 'timeout' | 'rate_limit' | 'provider' | 'malformed' | 'claims',
    message: string,
    public readonly statusCode: number,
  ) {
    super(message)
    this.name = 'AiGenerationError'
  }
}

function formatPounds(value: number): string {
  return `£${new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 }).format(value)}`
}

function promptFor({ topic, rows, stats }: Omit<GenerateCopyOptions, 'apiKey'>): string {
  const topCompanies = rows.slice(0, 10).map((row) => ({
    rank: row.rank,
    company: row.company,
    totalRaised: formatPounds(row.totalRaised),
    region: row.region || 'Unknown region',
    stage: row.stage || 'Unknown stage',
  }))

  return `You are writing the editorial layer for a data-backed SEO report about ${topic}.

Use only the verified facts below. Do not calculate new figures, infer unsupported market claims, or describe this dataset as the biggest or most complete market list. Refer to “this dataset” or “the companies analysed” when making claims.

Return only JSON matching the supplied schema. Keep the title concise (no more than 10 words) and use this style where natural: “100 Seed-Stage Fintech Companies Ranked by Funding”. Do not use Markdown headings, numbered lists, currency abbreviations such as £30.3m, or any number that is not present in the verified facts. Use exact pound amounts and exact integer counts when you mention them.

For monetary claims, use at most one named company and one GBP amount per sentence. Put aggregate funding or median figures in separate sentences without naming a company. Avoid compound company/amount comparisons and “respectively”; ambiguous attributions are rejected by the server.

Verified facts:
- Company count: ${stats.companyCount}
- Combined fundraising: ${formatPounds(stats.combinedFundraising)}
- Funding concentration (up to five companies): ${fundingShareWording(stats).sentence}
- Median fundraising: ${formatPounds(stats.medianFundraising)}
- Location counts: ${JSON.stringify(stats.locationCounts)}
- Stage breakdown: ${JSON.stringify(stats.stageBreakdown)}
- Most funding raised: ${stats.highestFundraising?.company ?? 'No company'} has raised ${stats.highestFundraising ? formatPounds(stats.highestFundraising.totalRaised) : 'no amount'}
- Unknown employee records: ${stats.unknownEmployeeCount}
- Employee range records: ${stats.rangeEmployeeCount}
- Top rows, already sorted by fundraising: ${JSON.stringify(topCompanies)}

The required JSON fields are:
- title: specific and cautious, including the dataset company count and topic where natural.
- introduction: two or three direct sentences explaining that this is ${stats.companyCount} ${topic} companies ranked by total funding raised, followed by a summary of funding and regional distribution.
- metaDescription: concise SEO metadata, no more than 160 characters.
- insights: exactly four short observations in this order: regional concentration, the company with the most funding raised, stage mix, and funding concentration. Use the verified funding-concentration sentence verbatim for the fourth insight. Never describe more companies than this dataset contains. Keep company, amount, location, stage and percentage relationships correct.
- conclusion: one or two sentences that state the findings are limited to the uploaded dataset.

Never invent a company, amount, count, stage, location, ranking or employee total.`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseStructuredCopy(value: unknown): PreviewCopy {
  if (!isRecord(value)) throw new AiGenerationError('malformed', 'Gemini returned a non-object response.', 502)

  const { title, introduction, metaDescription, insights, conclusion } = value
  if (
    typeof title !== 'string' ||
    typeof introduction !== 'string' ||
    typeof metaDescription !== 'string' ||
    !Array.isArray(insights) ||
    !insights.every((insight) => typeof insight === 'string') ||
    typeof conclusion !== 'string'
  ) {
    throw new AiGenerationError('malformed', 'Gemini returned JSON with an invalid editorial shape.', 502)
  }

  const copy: PreviewCopy = {
    title: title.trim(),
    introduction: introduction.trim(),
    metaDescription: metaDescription.trim(),
    insights: insights.map((insight) => insight.trim()).filter(Boolean),
    sectionHeading: 'Companies ranked by funding',
    conclusion: conclusion.trim(),
  }

  if (!copy.title || !copy.introduction || !copy.metaDescription || !copy.conclusion || copy.insights.length < 2 || copy.insights.length > 5) {
    throw new AiGenerationError('malformed', 'Gemini returned empty or incorrectly sized editorial fields.', 502)
  }
  if (copy.title.length > 140 || copy.introduction.length > 900 || copy.metaDescription.length > 160 || copy.conclusion.length > 700) {
    throw new AiGenerationError('malformed', 'Gemini returned editorial copy outside the configured length limits.', 502)
  }

  return copy
}

function parseJsonFromResponse(response: GeminiResponse): PreviewCopy {
  const text = response.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('').trim()
  if (!text) throw new AiGenerationError('malformed', 'Gemini returned no text content.', 502)

  try {
    return parseStructuredCopy(JSON.parse(text))
  } catch (error) {
    if (error instanceof AiGenerationError) throw error
    throw new AiGenerationError('malformed', 'Gemini returned invalid JSON.', 502)
  }
}

function extractCurrencyAmounts(text: string): number[] {
  return [...text.matchAll(/£\s?([\d,]+(?:\.\d+)?)/g)].map((match) => Number((match[1] ?? '').replace(/,/g, '')))
}

function extractIntegerClaims(text: string): number[] {
  const withoutCurrency = text.replace(/£\s?[\d,]+(?:\.\d+)?[a-z]*\b/gi, '')
  return [...withoutCurrency.matchAll(/\b\d[\d,]*(?:\.\d+)?\b/g)]
    .map((match) => Number(match[0].replace(/,/g, '')))
    .filter((value) => Number.isFinite(value))
}

function sentenceParts(text: string): string[] {
  // Decimal points between digits are not sentence boundaries.
  return text.split(/(?<!\d)[.!?]|[.!?](?!\d)|[;\n]+/).map((part) => part.trim()).filter(Boolean)
}

function companyPattern(name: string): RegExp {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`, 'giu')
}

function withoutCompanyNames(text: string, rows: CompanyRow[]): string {
  // Longest first prevents stripping only part of a longer company name.
  return [...rows].sort((a, b) => b.company.length - a.company.length)
    .reduce((value, row) => value.replace(companyPattern(row.company), ' '), text)
}

export function validateCopyClaims(copy: PreviewCopy, stats: DatasetStats, rows: CompanyRow[]): void {
  const text = [copy.title, copy.introduction, copy.metaDescription, ...copy.insights, copy.conclusion].join('\n')
  if (stats.combinedFundraising === 0 && /\b(?:\d+(?:\.\d+)?|zero)\s*(?:%|per\s+cent\b|percent\b)/i.test(text)) {
    throw new AiGenerationError('claims', 'Generated copy claims a percentage when total funding raised is £0; the funding-share comparison is unavailable.', 502)
  }
  if (/£\s?[\d,]+(?:\.\d+)?[a-z]+\b/i.test(text)) {
    throw new AiGenerationError('claims', 'Generated copy uses an unsupported abbreviated currency amount.', 502)
  }

  const allowedAmounts = new Set(rows.map((row) => row.totalRaised))
  allowedAmounts.add(stats.combinedFundraising)
  allowedAmounts.add(stats.medianFundraising)
  const invalidAmounts = extractCurrencyAmounts(text).filter((amount) => !allowedAmounts.has(amount))
  if (invalidAmounts.length) {
    throw new AiGenerationError('claims', `Generated copy contains an unverified fundraising amount: ${formatPounds(invalidAmounts[0] ?? 0)}.`, 502)
  }

  const allowedIntegers = new Set([
    stats.companyCount,
    stats.unknownEmployeeCount,
    stats.rangeEmployeeCount,
    ...Object.values(stats.locationCounts),
    ...Object.values(stats.stageBreakdown),
  ])
  if (stats.combinedFundraising > 0) allowedIntegers.add(Number((stats.topFiveFundingShare * 100).toFixed(1)))
  const invalidIntegers = extractIntegerClaims(withoutCompanyNames(text, rows)).filter((value) => !allowedIntegers.has(value))
  if (invalidIntegers.length) {
    throw new AiGenerationError('claims', `Generated copy contains an unverified numeric claim: ${invalidIntegers[0]}.`, 502)
  }

  for (const sentence of sentenceParts(text)) {
    const amounts = extractCurrencyAmounts(sentence)
    const numericClaims = extractIntegerClaims(withoutCompanyNames(sentence, rows))
    const mentionedCompanies = rows.filter((row) => companyPattern(row.company).test(sentence))

    if (amounts.length && mentionedCompanies.length) {
      // A shared pool of valid amounts cannot establish who raised which amount.
      // Fail closed instead of claiming to understand ambiguous compound prose.
      if (mentionedCompanies.length !== 1 || amounts.length !== 1) {
        throw new AiGenerationError('claims', 'Generated copy has an ambiguous company/funding attribution. Use one company and one amount per sentence.', 502)
      }
      const company = mentionedCompanies[0]!
      if (amounts[0] !== company.totalRaised) {
        throw new AiGenerationError('claims', `Generated copy attributes a fundraising amount to the wrong company: ${company.company}.`, 502)
      }
    }

    for (const [location, count] of Object.entries(stats.locationCounts)) {
      if (sentence.toLowerCase().includes(location.toLowerCase()) && numericClaims.length && !numericClaims.includes(count)) {
        throw new AiGenerationError('claims', `Generated copy attributes a location count to the wrong region: ${location}.`, 502)
      }
    }

    for (const [stage, count] of Object.entries(stats.stageBreakdown)) {
      if (sentence.toLowerCase().includes(stage.toLowerCase()) && numericClaims.length && !numericClaims.includes(count)) {
        throw new AiGenerationError('claims', `Generated copy attributes a stage count incorrectly: ${stage}.`, 502)
      }
    }
  }
}

export async function generateEditorialCopy(options: GenerateCopyOptions): Promise<PreviewCopy> {
  if (!options.apiKey) throw new AiGenerationError('missing_key', 'Gemini is not configured on the server.', 503)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS)

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': options.apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptFor(options) }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseJsonSchema: copySchema,
          temperature: 0.25,
          maxOutputTokens: 900,
        },
      }),
      signal: controller.signal,
    })

    if (response.status === 429) throw new AiGenerationError('rate_limit', 'Gemini free-tier rate limit reached. Wait before trying again.', 429)
    if (response.status === 401 || response.status === 403) throw new AiGenerationError('provider', 'Gemini rejected the server API key. Check the project secret and model access.', 503)
    if (!response.ok) throw new AiGenerationError('provider', 'Gemini could not generate copy. Please try again later.', 502)

    let body: GeminiResponse
    try {
      body = await response.json() as GeminiResponse
    } catch {
      throw new AiGenerationError('malformed', 'Gemini returned a malformed response instead of JSON.', 502)
    }

    return parseJsonFromResponse(body)
  } catch (error) {
    if (error instanceof AiGenerationError) throw error
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new AiGenerationError('timeout', 'Gemini did not respond within 60 seconds. Try again.', 504)
    }
    throw new AiGenerationError('provider', 'The Gemini request failed before a response could be validated.', 502)
  } finally {
    clearTimeout(timeout)
  }
}
