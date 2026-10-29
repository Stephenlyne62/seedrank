export type IssueSeverity = 'error' | 'warning'

export interface ValidationIssue {
  severity: IssueSeverity
  code: string
  message: string
  row?: number
  field?: string
}

export interface CompanyRow {
  rank: number
  sourceRank: number
  company: string
  region: string
  stage: string
  employees: string
  totalRaised: number
  description: string
  website: string
  industries: string
}

export interface DatasetStats {
  companyCount: number
  combinedFundraising: number
  topFiveFundingShare: number
  medianFundraising: number
  locationCounts: Record<string, number>
  stageBreakdown: Record<string, number>
  highestFundraising: CompanyRow | null
  unknownEmployeeCount: number
  rangeEmployeeCount: number
}

export interface PreviewCopy {
  title: string
  metaDescription: string
  introduction: string
  insights: string[]
  sectionHeading: string
  conclusion: string
}

export interface PreviewResult {
  ok: boolean
  fileName: string
  topic: string
  headers: string[]
  rows: CompanyRow[]
  stats: DatasetStats | null
  errors: ValidationIssue[]
  warnings: ValidationIssue[]
  copy: PreviewCopy | null
}

export interface SavedReport {
  slug: string
  topic: string
  fileName: string
  createdAt: string
  rows: CompanyRow[]
  stats: DatasetStats
  copy: PreviewCopy
}

export interface SavedReportSummary {
  slug: string
  topic: string
  fileName: string
  createdAt: string
  title: string
  metaDescription: string
}

export interface GenerateResult {
  ok: boolean
  slug?: string
  reportUrl?: string
  report?: SavedReport
  errorCode?: string
  message?: string
  errors?: ValidationIssue[]
  warnings?: ValidationIssue[]
}
