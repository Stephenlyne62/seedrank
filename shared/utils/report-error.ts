export interface ReportPageError {
  statusCode: number
  statusMessage: string
}

export const REPORT_NOT_FOUND_ERROR: ReportPageError = {
  statusCode: 404,
  statusMessage: 'Report not found',
}

export const REPORT_STORAGE_UNAVAILABLE_ERROR: ReportPageError = {
  statusCode: 503,
  statusMessage: 'Report storage is unavailable',
}

function isHttpStatus(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 400 && value <= 599
}

function responseStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined

  const candidate = error as { statusCode?: unknown, status?: unknown, response?: { status?: unknown } }
  if (isHttpStatus(candidate.statusCode)) return candidate.statusCode
  if (isHttpStatus(candidate.status)) return candidate.status
  if (isHttpStatus(candidate.response?.status)) return candidate.response.status
  return undefined
}

/**
 * Convert a useFetch failure to a public-facing page error. Do not surface a
 * response body or an Error message: those can contain storage internals.
 */
export function toReportPageError(error: unknown): ReportPageError {
  const statusCode = responseStatus(error)

  if (!statusCode) return REPORT_STORAGE_UNAVAILABLE_ERROR

  if (statusCode === 404) return REPORT_NOT_FOUND_ERROR
  if (statusCode >= 500) {
    return { statusCode, statusMessage: 'Report storage is unavailable' }
  }

  return { statusCode, statusMessage: 'Unable to load report' }
}
