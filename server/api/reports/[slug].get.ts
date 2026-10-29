import { getRouterParam } from 'h3'
import { findReport } from '../../utils/reports'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) throw createError({ statusCode: 404, statusMessage: 'Report not found' })

  try {
    const report = await findReport(slug)
    if (!report) throw createError({ statusCode: 404, statusMessage: 'Report not found' })
    return report
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'statusCode' in error && (error as { statusCode?: number }).statusCode === 404) throw error
    console.error('[seedrank] report read failed', error)
    throw createError({ statusCode: 503, statusMessage: 'Report storage is unavailable' })
  }
})
