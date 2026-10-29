import { afterEach, describe, expect, it, vi } from 'vitest'
import { generateEditorialCopy } from '../server/utils/ai'
import { parseDataset } from '../server/utils/dataset'

const data = parseDataset('Rank,Company,Region,Stage,Employees,Total Raised\n1,Alpha,London,Seed,5-9,100', 'fixture.csv', 'fintech')
if (!data.stats) throw new Error('Invalid provider test fixture')
const options = { apiKey: 'test-only-not-a-real-key', topic: 'fintech', rows: data.rows, stats: data.stats }

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

function reply(body: string, status = 200) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, { status })))
}

describe('Gemini boundary (mocked HTTP only)', () => {
  it('retains rate-limit status even if the provider returns HTML', async () => {
    reply('<html>Too many requests</html>', 429)
    await expect(generateEditorialCopy(options)).rejects.toMatchObject({ code: 'rate_limit', statusCode: 429 })
  })
  it('maps access rejection to a configuration error', async () => {
    reply('Forbidden', 403)
    await expect(generateEditorialCopy(options)).rejects.toMatchObject({ code: 'provider', statusCode: 503 })
  })
  it('rejects malformed transport JSON', async () => {
    reply('not JSON')
    await expect(generateEditorialCopy(options)).rejects.toMatchObject({ code: 'malformed', statusCode: 502 })
  })
  it('rejects an incorrect structured editorial shape', async () => {
    reply(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ title: 'Missing required fields' }) }] } }] }))
    await expect(generateEditorialCopy(options)).rejects.toMatchObject({ code: 'malformed', statusCode: 502 })
  })
  it('aborts a stalled request after the configured timeout', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn((_url, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    })))
    const assertion = expect(generateEditorialCopy(options)).rejects.toMatchObject({ code: 'timeout', statusCode: 504 })
    await vi.advanceTimersByTimeAsync(60_000)
    await assertion
  })
  it('rejects a missing API key before sending a request', async () => {
    const mock = vi.fn()
    vi.stubGlobal('fetch', mock)
    await expect(generateEditorialCopy({ ...options, apiKey: '' })).rejects.toMatchObject({ code: 'missing_key', statusCode: 503 })
    expect(mock).not.toHaveBeenCalled()
  })
  it('sends count-aware funding wording for a four-company dataset', async () => {
    const small = parseDataset([
      'Rank,Company,Region,Stage,Employees,Total Raised',
      '1,Alpha,London,Seed,5-9,400',
      '2,Beta,London,Seed,5-9,300',
      '3,Gamma,Bristol,Seed,5-9,200',
      '4,Delta,Manchester,Pre-Seed,1-4,100',
    ].join('\n'), 'four.csv', 'healthtech')
    if (!small.stats) throw new Error('Invalid four-company fixture')
    const mock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{}' }] } }] })))
    vi.stubGlobal('fetch', mock)
    await expect(generateEditorialCopy({ ...options, rows: small.rows, stats: small.stats })).rejects.toMatchObject({ code: 'malformed' })
    const request = JSON.parse(mock.mock.calls[0]![1].body as string)
    const prompt = request.contents[0].parts[0].text as string
    expect(prompt).toContain('The four highest-funded companies account for 100.0% of total funding raised.')
    expect(prompt).not.toContain('The five highest-funded companies')
  })
  it('marks funding concentration unavailable in the prompt for zero-funded companies', async () => {
    const zero = parseDataset('Rank,Company,Region,Stage,Employees,Total Raised\n1,Alpha,London,Seed,5-9,0\n2,Beta,Bristol,Seed,5-9,0', 'zero.csv', 'healthtech')
    if (!zero.stats) throw new Error('Invalid zero-funded fixture')
    const mock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{}' }] } }] })))
    vi.stubGlobal('fetch', mock)
    await expect(generateEditorialCopy({ ...options, rows: zero.rows, stats: zero.stats })).rejects.toMatchObject({ code: 'malformed' })
    const request = JSON.parse(mock.mock.calls[0]![1].body as string)
    const prompt = request.contents[0].parts[0].text as string
    expect(prompt).toContain('Comparison unavailable because total funding raised is £0.')
    expect(prompt).not.toMatch(/account(?:s)? for 0(?:\.0)?%/)
  })
})
