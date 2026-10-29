import Papa from 'papaparse'
import type {
  CompanyRow,
  DatasetStats,
  PreviewCopy,
  PreviewResult,
  ValidationIssue,
} from '#shared/types/dataset'

type DatasetField = keyof Pick<CompanyRow, 'rank' | 'company' | 'region' | 'stage' | 'employees' | 'totalRaised' | 'description' | 'website' | 'industries'>

type HeaderAliases = Record<DatasetField, string[]>

const HEADER_ALIASES: HeaderAliases = {
  rank: ['rank', 'ranking', 'position'],
  company: ['company', 'companyname', 'name'],
  region: ['region', 'location', 'headquarters', 'hq'],
  stage: ['stage', 'fundingstage'],
  employees: ['employees', 'employeecount', 'employee'],
  totalRaised: ['totalraised', 'totalfunding', 'totalfundingraised', 'funding', 'fundingraised', 'fundraised', 'raised', 'amountraised', 'totalraisedgbp'],
  description: ['description', 'summary', 'companydescription'],
  website: ['website', 'url', 'companywebsite'],
  industries: ['industries', 'industry', 'sectors'],
}

const REQUIRED_FIELDS: DatasetField[] = ['rank', 'company', 'region', 'stage', 'employees', 'totalRaised']
const OPTIONAL_FIELDS: DatasetField[] = ['description', 'website', 'industries']

const normalizeHeader = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '')

const cleanCell = (value: string | undefined) => value?.replace(/^\uFEFF/, '').trim() ?? ''

const makeIssue = (
  severity: ValidationIssue['severity'],
  code: string,
  message: string,
  row?: number,
  field?: string,
): ValidationIssue => ({ severity, code, message, row, field })

function parseFundraising(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed || /[$€]/.test(trimmed)) return null

  const numericPart = trimmed
    .replace(/^£\s*/, '')
    .replace(/^gbp\s*/i, '')
    .trim()

  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(numericPart)) return null

  const normalized = numericPart.replace(/,/g, '')
  const amount = Number(normalized)
  return Number.isFinite(amount) && amount >= 0 ? amount : null
}

function sanitizeWebsite(value: string): string | null {
  if (!value) return ''

  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

function isUnknownEmployee(value: string): boolean {
  return ['', 'unknown', 'n/a', 'na', 'not available', 'undisclosed', '-', '—'].includes(value.trim().toLowerCase())
}

function isEmployeeRange(value: string): boolean {
  return /\d\s*[-–]\s*\d/.test(value)
}

function median(values: number[]): number {
  const ordered = [...values].sort((a, b) => a - b)
  if (ordered.length === 0) return 0
  const middle = Math.floor(ordered.length / 2)
  const lower = ordered[middle - 1] ?? 0
  const upper = ordered[middle] ?? 0
  return ordered.length % 2 === 0
    ? (lower + upper) / 2
    : upper
}

function incrementCount(target: Record<string, number>, value: string, fallback: string): void {
  const key = value.trim() || fallback
  target[key] = (target[key] ?? 0) + 1
}

function calculateStats(rows: CompanyRow[]): DatasetStats {
  const fundraising = rows.map((row) => row.totalRaised)
  const combinedFundraising = fundraising.reduce((sum, amount) => sum + amount, 0)
  const topFiveFunding = [...fundraising].sort((a, b) => b - a).slice(0, 5).reduce((sum, amount) => sum + amount, 0)
  const locationCounts: Record<string, number> = {}
  const stageBreakdown: Record<string, number> = {}

  for (const row of rows) {
    incrementCount(locationCounts, row.region, 'Unknown region')
    incrementCount(stageBreakdown, row.stage, 'Unknown stage')
  }

  const highestFundraising = rows.reduce<CompanyRow | null>(
    (highest, row) => (!highest || row.totalRaised > highest.totalRaised ? row : highest),
    null,
  )

  return {
    companyCount: rows.length,
    combinedFundraising,
    topFiveFundingShare: combinedFundraising > 0 ? topFiveFunding / combinedFundraising : 0,
    medianFundraising: median(fundraising),
    locationCounts,
    stageBreakdown,
    highestFundraising,
    unknownEmployeeCount: rows.filter((row) => isUnknownEmployee(row.employees)).length,
    rangeEmployeeCount: rows.filter((row) => isEmployeeRange(row.employees)).length,
  }
}

function createCopy(topic: string, stats: DatasetStats): PreviewCopy {
  const stageCount = Object.keys(stats.stageBreakdown).length
  const companyLabel = stats.companyCount === 1 ? 'company' : 'companies'
  const topicLabel = topic.charAt(0).toUpperCase() + topic.slice(1)
  const stageLabel = stageCount === 1 ? `${Object.keys(stats.stageBreakdown)[0]}-Stage ` : ''

  return {
    title: `${stats.companyCount} ${stageLabel}${topicLabel} ${companyLabel} Ranked by Funding`,
    metaDescription: `Explore ${stats.companyCount} ${stageLabel.toLowerCase()}${topic} ${companyLabel} ranked by total funding raised, with funding and regional insights.`,
    introduction: `This dataset covers ${stats.companyCount} ${stageLabel.toLowerCase()}${topic} ${companyLabel} ranked by total funding raised. It summarises funding levels, median funding and regional distribution across the companies analysed.`,
    insights: [],
    sectionHeading: `${topicLabel} companies ranked by funding`,
    conclusion: `Employee counts are reported as ranges where supplied; ${stats.unknownEmployeeCount} compan${stats.unknownEmployeeCount === 1 ? 'y has' : 'ies have'} no employee data. These findings describe this dataset only and do not make a broader market-size claim.`,
  }
}

export function parseDataset(csv: string, fileName: string, topic: string): PreviewResult {
  const errors: ValidationIssue[] = []
  const warnings: ValidationIssue[] = []
  const parsed = Papa.parse<string[]>(csv, { skipEmptyLines: 'greedy' })

  for (const parseError of parsed.errors) {
    errors.push(makeIssue('error', 'csv_parse_error', `CSV formatting error: ${parseError.message}. Check commas and quoted values near this row.`, (parseError.row ?? 0) + 2))
  }

  const data = parsed.data ?? []
  const rawHeaders = data[0]?.map((header) => cleanCell(header)) ?? []

  if (rawHeaders.length === 0) {
    errors.push(makeIssue('error', 'missing_headers', 'The CSV does not contain a header row.'))
    return { ok: false, fileName, topic, headers: [], rows: [], stats: null, errors, warnings, copy: null }
  }

  const normalizedHeaders = rawHeaders.map(normalizeHeader)
  const headerIndexes = {} as Partial<Record<DatasetField, number>>

  for (const field of [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS]) {
    const index = normalizedHeaders.findIndex((header) => HEADER_ALIASES[field].includes(header))
    if (index >= 0) headerIndexes[field] = index
  }

  for (const field of REQUIRED_FIELDS) {
    if (headerIndexes[field] === undefined) {
      const aliases = HEADER_ALIASES[field].slice(0, 4).join(', ')
      errors.push(makeIssue('error', 'missing_required_column', `Missing required column for ${field}. Rename one of your headers to a supported name such as ${aliases}.`, undefined, field))
    }
  }

  for (const field of OPTIONAL_FIELDS) {
    if (headerIndexes[field] === undefined) {
      warnings.push(makeIssue('warning', 'missing_optional_column', `Optional column ${field} is not present; the preview will use a fallback.`, undefined, field))
    }
  }

  if (errors.length > 0) {
    return { ok: false, fileName, topic, headers: rawHeaders, rows: [], stats: null, errors, warnings, copy: null }
  }

  const rows: CompanyRow[] = []
  const seenRanks = new Set<number>()
  const seenCompanies = new Set<string>()

  data.slice(1).forEach((rawRow, index) => {
    const rowNumber = index + 2
    const get = (field: DatasetField) => {
      const columnIndex = headerIndexes[field]
      return columnIndex === undefined ? '' : cleanCell(rawRow[columnIndex])
    }

    if (rawRow.every((cell) => !cleanCell(cell))) return

    const rankRaw = get('rank')
    const company = get('company')
    const region = get('region')
    const stage = get('stage')
    const employees = get('employees')
    const raisedRaw = get('totalRaised')
    const rank = Number(rankRaw)
    const totalRaised = parseFundraising(raisedRaw)
    const companyKey = company.toLowerCase()
    const websiteRaw = get('website')
    const website = sanitizeWebsite(websiteRaw)

    if (!/^\d+$/.test(rankRaw) || !Number.isSafeInteger(rank) || rank < 1) {
      errors.push(makeIssue('error', 'invalid_rank', 'Rank must be a positive whole number.', rowNumber, 'rank'))
    } else if (seenRanks.has(rank)) {
      errors.push(makeIssue('error', 'duplicate_rank', `Rank ${rank} is duplicated.`, rowNumber, 'rank'))
    } else {
      seenRanks.add(rank)
    }

    if (!company) {
      errors.push(makeIssue('error', 'missing_company', 'Company name is required.', rowNumber, 'company'))
    } else if (seenCompanies.has(companyKey)) {
      errors.push(makeIssue('error', 'duplicate_company', `Company “${company}” is duplicated.`, rowNumber, 'company'))
    } else {
      seenCompanies.add(companyKey)
    }

    if (totalRaised === null) {
      errors.push(makeIssue('error', 'invalid_fundraising', raisedRaw ? 'Total Raised must be a non-negative GBP amount, such as £4,146,786.' : 'Total Raised is required for every company; add a GBP amount such as £4,146,786.', rowNumber, 'totalRaised'))
    }

    if (!region) warnings.push(makeIssue('warning', 'missing_region', 'Region is empty and will be counted as Unknown region.', rowNumber, 'region'))
    if (!stage) warnings.push(makeIssue('warning', 'missing_stage', 'Stage is empty and will be counted as Unknown stage.', rowNumber, 'stage'))
    if (!employees) warnings.push(makeIssue('warning', 'missing_employees', 'Employee count is empty and will be counted as unknown.', rowNumber, 'employees'))
    if (headerIndexes.website !== undefined && !websiteRaw) warnings.push(makeIssue('warning', 'missing_website', 'Website is empty; the row will display without a link.', rowNumber, 'website'))
    if (website === null) warnings.push(makeIssue('warning', 'invalid_website', 'Website must be an HTTP or HTTPS URL; the value will be shown without a link.', rowNumber, 'website'))
    if (headerIndexes.description !== undefined && !get('description')) warnings.push(makeIssue('warning', 'missing_description', 'Description is empty; the report will use a fallback.', rowNumber, 'description'))

    if (totalRaised !== null && Number.isSafeInteger(rank) && rank > 0 && company) {
      rows.push({
        rank,
        sourceRank: rank,
        company,
        region,
        stage,
        employees,
        totalRaised,
        description: get('description') || 'No company description was supplied in this dataset.',
        website: website ?? '',
        industries: get('industries') || topic,
      })
    }
  })

  if (errors.length > 0 || rows.length === 0) {
    if (rows.length === 0 && errors.length === 0) errors.push(makeIssue('error', 'no_rows', 'The CSV does not contain any company rows.'))
    return { ok: false, fileName, topic, headers: rawHeaders, rows: [], stats: null, errors, warnings, copy: null }
  }

  const rankedRows = [...rows].sort((a, b) => b.totalRaised - a.totalRaised || a.sourceRank - b.sourceRank)
  if (rankedRows.some((row, index) => row !== rows[index])) {
    warnings.push(makeIssue('warning', 'ranking_sorted', 'Rows were sorted by total fundraising before display so the ranking matches the title.'))
  }

  const displayRows = rankedRows.map((row, index) => ({ ...row, rank: index + 1 }))
  const stats = calculateStats(displayRows)
  return {
    ok: true,
    fileName,
    topic,
    headers: rawHeaders,
    rows: displayRows,
    stats,
    errors,
    warnings,
    copy: createCopy(topic, stats),
  }
}
