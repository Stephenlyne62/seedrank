import { defineEventHandler, setHeader } from 'h3'
import { listReports } from '../utils/reports'

export default defineEventHandler(async (event) => {
  const siteUrl = String(useRuntimeConfig().public.siteUrl).replace(/\/$/, '')
  const reports = await listReports()
  const urls = ['/', '/reports', ...reports.map((report) => `/reports/${encodeURIComponent(report.slug)}`)]
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((path) => `<url><loc>${siteUrl}${path}</loc></url>`).join('')}</urlset>`
  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  return body
})
