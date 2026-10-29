import { describe, expect, it } from 'vitest'
import { fundingShareWording, reportInsightWording } from '../shared/utils/report-wording'

const positive = { combinedFundraising: 1000 }
const unavailable = 'Comparison unavailable because total funding raised is £0.'

describe('dataset-sized funding-share wording', () => {
  it('uses four rather than five for a four-company dataset', () => {
    expect(fundingShareWording({ ...positive, companyCount: 4, topFiveFundingShare: 1 })).toEqual({
      label: 'Top four share.',
      sentence: 'The four highest-funded companies account for 100.0% of total funding raised.',
    })
  })
  it('uses singular grammar for one company', () => {
    expect(fundingShareWording({ ...positive, companyCount: 1, topFiveFundingShare: 1 }).sentence)
      .toBe('The highest-funded company accounts for 100.0% of total funding raised.')
  })
  it.each([5, 100])('keeps top-five wording for %i companies', (companyCount) => {
    expect(fundingShareWording({ ...positive, companyCount, topFiveFundingShare: 0.203 })).toEqual({
      label: 'Top five share.',
      sentence: 'The five highest-funded companies account for 20.3% of total funding raised.',
    })
  })
  it('corrects an older small-report insight without changing other copy or mutating stored data', () => {
    const original = ['Regional finding', 'Company finding', 'Stage finding', 'The five highest-funded companies account for 100% of total funding raised.']
    const result = reportInsightWording(original, { ...positive, companyCount: 4, topFiveFundingShare: 1 })
    expect(result.slice(0, 3)).toEqual(original.slice(0, 3))
    expect(result[3]).toBe('The four highest-funded companies account for 100.0% of total funding raised.')
    expect(original[3]).toMatch(/five/)
  })
  it('leaves larger positive-funded saved reports unchanged', () => {
    const original = ['First', 'Second', 'Third', 'Original top-five finding']
    expect(reportInsightWording(original, { ...positive, companyCount: 100, topFiveFundingShare: 0.203 })).toBe(original)
  })
  it('does not invent missing insights or a missing legacy statistic', () => {
    expect(reportInsightWording([], { ...positive, companyCount: 4, topFiveFundingShare: 1 })).toEqual([])
    expect(fundingShareWording({ ...positive, companyCount: 4, topFiveFundingShare: undefined as unknown as number }).sentence)
      .toBe('Comparison unavailable for this saved report.')
  })
  it.each([1, 4, 5, 100])('does not describe a percentage for %i companies with zero total funding', (companyCount) => {
    const result = fundingShareWording({ companyCount, combinedFundraising: 0, topFiveFundingShare: 0 })
    expect(result).toEqual({ label: 'Funding share.', sentence: unavailable })
    expect(result.sentence).not.toMatch(/%|percent/i)
  })
  it.each([4, 100])('corrects a stale zero-funded insight for %i companies without changing stored copy', (companyCount) => {
    const original = ['Regional finding', 'Company finding', 'Stage finding', 'The five highest-funded companies account for 0% of total funding raised.']
    const result = reportInsightWording(original, { companyCount, combinedFundraising: 0, topFiveFundingShare: 0 })
    expect(result[3]).toBe(unavailable)
    expect(result.slice(0, 3)).toEqual(original.slice(0, 3))
    expect(original[3]).toContain('0%')
  })
})
