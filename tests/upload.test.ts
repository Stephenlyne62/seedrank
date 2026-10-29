import { describe, expect, it } from 'vitest'
import { extractCsvUpload, MAX_CSV_BYTES } from '../server/utils/upload'

function parts(data: Buffer, topic = 'fintech') {
  return [
    { name: 'file', filename: 'companies.csv', type: 'text/csv', data },
    { name: 'topic', data: Buffer.from(topic) },
  ]
}

describe('shared preview/generation upload guard', () => {
  it('rejects files above 5 MiB before decoding', () => {
    const result = extractCsvUpload(parts(Buffer.alloc(MAX_CSV_BYTES + 1, 65)))
    expect(result).toMatchObject({ ok: false, statusCode: 413, errorCode: 'file_too_large' })
    expect(result).not.toHaveProperty('csv')
  })
  it('accepts the exact boundary and checks byte size rather than character count', () => {
    expect(extractCsvUpload(parts(Buffer.alloc(MAX_CSV_BYTES, 65))).ok).toBe(true)
    const multibyte = Buffer.from('£'.repeat(MAX_CSV_BYTES / 2 + 1))
    expect(extractCsvUpload(parts(multibyte))).toMatchObject({ ok: false, statusCode: 413 })
  })
  it('returns actionable missing-input errors', () => {
    expect(extractCsvUpload()).toMatchObject({ ok: false, statusCode: 400, errorCode: 'missing_input' })
    expect(extractCsvUpload(parts(Buffer.from('csv'), '  '))).toMatchObject({ ok: false, statusCode: 400 })
  })
  it('preserves the file and normalizes the topic for a small upload', () => {
    expect(extractCsvUpload(parts(Buffer.from('Rank,Company'), ' fintech '))).toEqual({
      ok: true, fileName: 'companies.csv', topic: 'fintech', csv: 'Rank,Company',
    })
  })
})
