import type { ValidationIssue } from '../types/dataset'

export function validationCheckStatus(headers: string[], errors: ValidationIssue[]) {
  const missingColumns = headers.length === 0 || errors.some(error => ['missing_headers', 'missing_required_column'].includes(error.code))
  const rowsNotChecked = missingColumns || errors.some(error => ['csv_parse_error', 'no_rows'].includes(error.code))
  return {
    requiredColumns: missingColumns ? 'Needs attention' : 'Present',
    rankValues: rowsNotChecked ? 'Not checked' : errors.some(error => ['invalid_rank', 'duplicate_rank'].includes(error.code)) ? 'Needs attention' : 'Valid',
    fundingValues: rowsNotChecked ? 'Not checked' : errors.some(error => error.code === 'invalid_fundraising') ? 'Needs attention' : 'Valid GBP',
  }
}
