import { defineEventHandler } from 'h3'
import type { SavedReportSummary } from '#shared/types/dataset'
import { listReports } from '../../utils/reports'

export default defineEventHandler(async (): Promise<SavedReportSummary[]> => listReports())
