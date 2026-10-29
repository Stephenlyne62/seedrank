import { defineEventHandler, readMultipartFormData, setResponseStatus } from 'h3'
import type { PreviewResult } from '#shared/types/dataset'
import { parseDataset } from '../utils/dataset'
import { extractCsvUpload } from '../utils/upload'

export default defineEventHandler(async (event): Promise<PreviewResult> => {
  const upload = extractCsvUpload(await readMultipartFormData(event))
  if (!upload.ok) {
    setResponseStatus(event, upload.statusCode)
    return {
      ok: false,
      fileName: upload.fileName,
      topic: upload.topic,
      headers: [], rows: [], stats: null,
      errors: [{ severity: 'error', code: upload.errorCode, message: upload.message, field: upload.field }],
      warnings: [], copy: null,
    }
  }

  const result = parseDataset(upload.csv, upload.fileName, upload.topic)
  setResponseStatus(event, result.ok ? 200 : 422)
  return result
})
