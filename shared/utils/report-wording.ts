import type { DatasetStats } from '../types/dataset'

type FundingShareStats = Pick<DatasetStats, 'companyCount' | 'combinedFundraising' | 'topFiveFundingShare'>

export function fundingShareWording(stats: FundingShareStats) {
  const count = Math.min(5, stats.companyCount)
  const word = ['zero', 'one', 'two', 'three', 'four', 'five'][count] ?? String(count)
  const label = count === 1 ? 'Top company share.' : `Top ${word} share.`
  if (stats.combinedFundraising === 0) {
    return { label: 'Funding share.', sentence: 'Comparison unavailable because total funding raised is £0.' }
  }
  if (count < 1 || !Number.isFinite(stats.topFiveFundingShare)) {
    return { label, sentence: 'Comparison unavailable for this saved report.' }
  }
  const subject = count === 1 ? 'The highest-funded company accounts' : `The ${word} highest-funded companies account`
  return { label, sentence: `${subject} for ${(stats.topFiveFundingShare * 100).toFixed(1)}% of total funding raised.` }
}

export function reportInsightWording(insights: string[], stats: FundingShareStats): string[] {
  // The fourth insight is the funding-concentration observation in the AI schema.
  // Correct older small or zero-funded reports without AI or a DB write.
  if (stats.companyCount >= 5 && stats.combinedFundraising !== 0) return insights
  return insights.map((insight, index) => index === 3 ? fundingShareWording(stats).sentence : insight)
}
