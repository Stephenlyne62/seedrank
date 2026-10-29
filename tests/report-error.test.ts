import { describe, expect, it } from 'vitest'
import { REPORT_NOT_FOUND_ERROR, REPORT_STORAGE_UNAVAILABLE_ERROR, toReportPageError } from '../shared/utils/report-error'

describe('report fetch error mapping', () => {
  it('maps a 404 response to the public not-found error', () => {
    expect(toReportPageError({ response: { status: 404 } })).toEqual(REPORT_NOT_FOUND_ERROR)
  })

  it('preserves a storage service failure status and public message', () => {
    expect(toReportPageError({ response: { status: 503 } })).toEqual({
      statusCode: 503,
      statusMessage: 'Report storage is unavailable',
    })
  })

  it('does not expose an arbitrary upstream error message', () => {
    expect(toReportPageError({ statusCode: 500, message: 'database password: secret' })).toEqual({
      statusCode: 500,
      statusMessage: 'Report storage is unavailable',
    })
  })

  it('uses a safe service-unavailable response when fetch has no HTTP status', () => {
    expect(toReportPageError(new TypeError('network failed'))).toEqual(REPORT_STORAGE_UNAVAILABLE_ERROR)
  })
})
