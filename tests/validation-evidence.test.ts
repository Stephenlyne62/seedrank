import { describe, expect, it } from 'vitest'
import { parseDataset } from '../server/utils/dataset'
import { validationCheckStatus } from '../shared/utils/validation-evidence'

const header = 'Rank,Company,Region,Stage,Employees,Total Raised'

describe('validation evidence from server results', () => {
  it('marks the checks valid for a successfully parsed upload', () => {
    const result = parseDataset(`${header}\n1,Alpha,London,Seed,5-9,100`, 'actual.csv', 'software')
    expect(result.ok).toBe(true)
    expect(validationCheckStatus(result.headers, result.errors)).toEqual({ requiredColumns: 'Present', rankValues: 'Valid', fundingValues: 'Valid GBP' })
  })
  it('does not claim row validation when required columns are missing', () => {
    const result = parseDataset('Company\nAlpha', 'missing.csv', 'software')
    expect(validationCheckStatus(result.headers, result.errors)).toEqual({ requiredColumns: 'Needs attention', rankValues: 'Not checked', fundingValues: 'Not checked' })
  })
  it('shows failed rank and GBP checks for invalid rows', () => {
    const result = parseDataset(`${header}\n1abc,Alpha,London,Seed,5-9,$100`, 'invalid.csv', 'software')
    expect(validationCheckStatus(result.headers, result.errors)).toEqual({ requiredColumns: 'Present', rankValues: 'Needs attention', fundingValues: 'Needs attention' })
  })
  it('does not mark empty input or a header-only dataset as valid row checks', () => {
    for (const csv of ['', header]) {
      const result = parseDataset(csv, 'empty.csv', 'software')
      const checks = validationCheckStatus(result.headers, result.errors)
      expect(checks.rankValues).toBe('Not checked')
      expect(checks.fundingValues).toBe('Not checked')
    }
  })
})
