import type { MultiPartData } from 'h3'

export const MAX_CSV_BYTES = 5 * 1024 * 1024

interface UploadContext {
  fileName: string
  topic: string
}

export type CsvUploadResult = (UploadContext & { ok: true; csv: string }) | (UploadContext & {
  ok: false
  statusCode: 400 | 413
  errorCode: 'missing_input' | 'file_too_large'
  message: string
  field?: string
})

/** Shared file guard: run before UTF-8 decoding, CSV parsing, rate limiting or AI. */
export function extractCsvUpload(parts: MultiPartData[] = []): CsvUploadResult {
  const filePart = parts.find((part) => part.name === 'file' && part.filename)
  const topicPart = parts.find((part) => part.name === 'topic')
  const topic = topicPart?.data.toString('utf8').trim().slice(0, 80) ?? ''
  const fileName = filePart?.filename ?? 'uploaded.csv'
  if (!filePart?.data || !topic) {
    return {
      ok: false, fileName, topic, statusCode: 400, errorCode: 'missing_input',
      message: 'Choose a CSV file and enter an industry or topic before continuing.',
    }
  }
  if (filePart.data.byteLength > MAX_CSV_BYTES) {
    return {
      ok: false, fileName, topic, statusCode: 413, errorCode: 'file_too_large', field: 'file',
      message: 'CSV files must be no larger than 5 MiB (5,242,880 bytes). Choose a smaller file.',
    }
  }
  return { ok: true, fileName, topic, csv: filePart.data.toString('utf8') }
}
