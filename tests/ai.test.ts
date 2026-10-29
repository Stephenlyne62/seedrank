import { describe, expect, it } from 'vitest'
import { AiGenerationError, validateCopyClaims } from '../server/utils/ai'
import { parseDataset } from '../server/utils/dataset'
import type { PreviewCopy } from '#shared/types/dataset'

const dataset = parseDataset([
  'Rank,Company,Region,Stage,Employees,Total Raised',
  '1,Beta,North,Seed,5-9,£200',
  '2,Alpha,South,Seed,5-9,£100',
].join('\n'), 'claims.csv', 'fintech')
if (!dataset.stats) throw new Error('The AI test fixture must be valid')
const stats = dataset.stats

function copy(introduction: string): PreviewCopy {
  return {
    title: 'Company funding report', introduction,
    metaDescription: 'Dataset-scoped findings.', insights: [],
    sectionHeading: 'Company rankings', conclusion: 'These findings describe this dataset only.',
  }
}

function validate(text: string) {
  return validateCopyClaims(copy(text), stats, dataset.rows)
}

describe('partial AI numerical and attribution checks', () => {
  it('reproduces swapped company amounts within one sentence', () => {
    expect(() => validate('Alpha raised £200 and Beta raised £100.')).toThrow(AiGenerationError)
  })
  it('rejects swapped amounts in separate sentences', () => {
    expect(() => validate('Alpha raised £200. Beta raised £100.')).toThrow(AiGenerationError)
  })
  it('accepts unambiguous correct single-company facts', () => {
    expect(() => validate('Alpha raised £100. Beta raised £200.')).not.toThrow()
  })
  it('fails closed on ambiguous multi-company monetary claims, even with valid numbers', () => {
    expect(() => validate('Alpha and Beta raised £100 and £200 respectively.')).toThrow(AiGenerationError)
  })
  it('rejects a company amount that is only a correct dataset total', () => {
    expect(() => validate('Alpha raised £300.')).toThrow(AiGenerationError)
  })
  it('rejects unsupported currency and count values', () => {
    expect(() => validate('The companies raised £999.')).toThrow(AiGenerationError)
    expect(() => validate('The dataset contains 99 companies.')).toThrow(AiGenerationError)
  })
  it('allows verified aggregate facts without company attribution', () => {
    expect(() => validate('Total funding raised was £300. There are 2 companies.')).not.toThrow()
  })
  it('rejects an incorrect regional count', () => {
    expect(() => validate('North contains 2 companies.')).toThrow(AiGenerationError)
  })
  it('accepts company names in numeric-name datasets without mistaking their digits for counts', () => {
    const named = { ...dataset.rows[1]!, company: 'Alpha 99' }
    expect(() => validateCopyClaims(copy('Alpha 99 raised £100.'), stats, [dataset.rows[0]!, named])).not.toThrow()
  })
  it('keeps decimal currency amounts intact during attribution checks', () => {
    const named = { ...dataset.rows[1]!, totalRaised: 100.50 }
    expect(() => validateCopyClaims(copy('Alpha raised £100.50.'), stats, [dataset.rows[0]!, named])).not.toThrow()
  })
  it.each(['0%', '0.0%', 'zero percent'])('rejects an undefined zero-funded percentage expressed as %s', (percentage) => {
    const zero = parseDataset('Rank,Company,Region,Stage,Employees,Total Raised\n1,Alpha,London,Seed,5-9,0', 'zero.csv', 'healthtech')
    if (!zero.stats) throw new Error('Invalid zero-funded fixture')
    expect(() => validateCopyClaims(copy(`The highest-funded company accounts for ${percentage} of total funding raised.`), zero.stats!, zero.rows)).toThrow(AiGenerationError)
  })
  it('accepts the unavailable comparison for an all-zero dataset', () => {
    const zero = parseDataset('Rank,Company,Region,Stage,Employees,Total Raised\n1,Alpha,London,Seed,5-9,0', 'zero.csv', 'healthtech')
    if (!zero.stats) throw new Error('Invalid zero-funded fixture')
    expect(() => validateCopyClaims(copy('Comparison unavailable because total funding raised is £0.'), zero.stats!, zero.rows)).not.toThrow()
  })
})
