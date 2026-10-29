import { describe, expect, it } from 'vitest'
import { parseDataset } from '../server/utils/dataset'

const headers = 'Rank,Company Name,Region,Stage,Employees,Funding Raised,Description,Website,Industries'

function csv(rows: string): string {
  return `${headers}\n${rows}`
}

describe('dataset validation', () => {
  it('accepts common header aliases and derives deterministic stats', () => {
    const result = parseDataset(csv('1,Alpha,London,Seed,5-9,£100,One,https://alpha.example,fintech\n2,Beta,Manchester,Seed,10,£100,Two,https://beta.example,fintech'), 'aliases.csv', 'fintech')
    expect(result.ok).toBe(true)
    expect(result.rows.map((row) => row.company)).toEqual(['Alpha', 'Beta'])
    expect(result.stats?.combinedFundraising).toBe(200)
  })

  it('blocks missing funding instead of treating it as zero', () => {
    const result = parseDataset(csv('1,Alpha,London,Seed,5-9,,One,https://alpha.example,fintech'), 'missing-funding.csv', 'fintech')
    expect(result.ok).toBe(false)
    expect(result.errors[0]?.message).toMatch(/Total Raised is required/i)
  })

  it('rejects malformed numeric formats and non-GBP currencies', () => {
    const result = parseDataset(csv('1,Alpha,London,Seed,5-9,"£1,2,3",One,https://alpha.example,fintech'), 'awkward.csv', 'fintech')
    expect(result.ok).toBe(false)
    expect(result.errors.some((error) => error.code === 'invalid_fundraising')).toBe(true)
  })

  it('keeps equal-funding companies in source-rank order', () => {
    const result = parseDataset(csv('2,Beta,London,Seed,5-9,£100,Two,https://beta.example,fintech\n1,Alpha,London,Seed,5-9,£100,One,https://alpha.example,fintech'), 'ties.csv', 'fintech')
    expect(result.ok).toBe(true)
    expect(result.rows.map((row) => row.company)).toEqual(['Alpha', 'Beta'])
  })

  it('keeps partial optional data as warnings', () => {
    const result = parseDataset(csv('1,Alpha,London,Seed,,£100,,not-a-url,fintech'), 'warnings.csv', 'fintech')
    expect(result.ok).toBe(true)
    expect(result.warnings.some((warning) => warning.code === 'missing_employees')).toBe(true)
    expect(result.warnings.some((warning) => warning.code === 'invalid_website')).toBe(true)
  })
})
