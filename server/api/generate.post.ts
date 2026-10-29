import { defineEventHandler, getRequestIP, readMultipartFormData, setResponseStatus } from 'h3'
import type { GenerateResult, SavedReport } from '#shared/types/dataset'
import { generateEditorialCopy, AiGenerationError, validateCopyClaims } from '../utils/ai'
import { parseDataset } from '../utils/dataset'
import { consumeGenerationSlot } from '../utils/rate-limit'
import { saveReport } from '../utils/reports'
import { extractCsvUpload } from '../utils/upload'

function slugFor(topic: string): string {
  const base = topic
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'industry-report'
  return `${base}-${crypto.randomUUID().slice(0, 8)}`
}

function failure(errorCode: string, message: string): GenerateResult {
  return { ok: false, errorCode, message }
}

export default defineEventHandler(async (event): Promise<GenerateResult> => {
  const upload = extractCsvUpload(await readMultipartFormData(event))
  if (!upload.ok) {
    setResponseStatus(event, upload.statusCode)
    return failure(upload.errorCode, upload.message)
  }
  const { csv, fileName, topic } = upload
  const validated = parseDataset(csv, fileName, topic)
  if (!validated.ok || !validated.stats) {
    setResponseStatus(event, 422)
    return {
      ok: false,
      errorCode: 'validation_failed',
      message: 'The uploaded dataset must pass validation before AI generation can start.',
      errors: validated.errors,
      warnings: validated.warnings,
    }
  }

  const identity = getRequestIP(event, { xForwardedFor: true }) || 'anonymous'
  const rate = consumeGenerationSlot(identity)
  if (!rate.allowed) {
    setResponseStatus(event, 429)
    return failure('rate_limited', `Generation is limited to one request per five minutes from this network. Try again in about ${rate.retryAfterSeconds} seconds.`)
  }

  try {
    const config = useRuntimeConfig(event)
    const copy = await generateEditorialCopy({
      apiKey: String(config.geminiApiKey || process.env.GEMINI_API_KEY || ''),
      topic,
      rows: validated.rows,
      stats: validated.stats,
    })
    validateCopyClaims(copy, validated.stats, validated.rows)
    copy.sectionHeading = `${topic} companies ranked by funding`

    const report: SavedReport = {
      slug: slugFor(topic),
      topic,
      fileName,
      createdAt: new Date().toISOString(),
      rows: validated.rows,
      stats: validated.stats,
      copy,
    }
    await saveReport(report)

    return { ok: true, slug: report.slug, reportUrl: `/reports/${report.slug}`, report }
  } catch (error) {
    if (error instanceof AiGenerationError) {
      setResponseStatus(event, error.statusCode)
      return failure(error.code, error.message)
    }

    console.error('[seedrank] report persistence failed', error)
    setResponseStatus(event, 503)
    return failure('persistence_unavailable', 'The report could not be saved. Check that the Supabase reports migration has been applied.')
  }
})
