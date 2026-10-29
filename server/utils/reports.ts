import type { SavedReport, SavedReportSummary } from '#shared/types/dataset'

interface SupabaseRow {
  slug: string
  topic: string
  source_filename: string
  content_json: SavedReport
  created_at: string
}

function serverConfig(): { url: string; key: string } {
  const runtime = useRuntimeConfig()
  const url = String(runtime.supabaseUrl || process.env.SUPABASE_URL || '').replace(/\/$/, '')
  const key = String(runtime.supabaseServiceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY || '')
  if (!url || !key) throw new Error('Supabase is not configured on the server.')
  return { url, key }
}

function headers(key: string): HeadersInit {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  }
}

export async function saveReport(report: SavedReport): Promise<SavedReport> {
  const { url, key } = serverConfig()
  const response = await fetch(`${url}/rest/v1/reports`, {
    method: 'POST',
    headers: { ...headers(key), Prefer: 'return=representation' },
    body: JSON.stringify({
      slug: report.slug,
      topic: report.topic,
      source_filename: report.fileName,
      content_json: report,
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Supabase save failed (${response.status}): ${detail.slice(0, 240)}`)
  }

  return report
}

export async function findReport(slug: string): Promise<SavedReport | null> {
  const { url, key } = serverConfig()
  const params = new URLSearchParams({ slug: `eq.${slug}`, select: 'content_json', limit: '1' })
  const response = await fetch(`${url}/rest/v1/reports?${params.toString()}`, {
    method: 'GET',
    headers: headers(key),
  })

  if (response.status === 404) return null
  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Supabase read failed (${response.status}): ${detail.slice(0, 240)}`)
  }

  const rows = await response.json() as Array<Pick<SupabaseRow, 'content_json'>>
  return rows[0]?.content_json ?? null
}

export async function listReports(): Promise<SavedReportSummary[]> {
  const { url, key } = serverConfig()
  const params = new URLSearchParams({ select: 'slug,topic,source_filename,content_json,created_at', order: 'created_at.desc', limit: '100' })
  const response = await fetch(`${url}/rest/v1/reports?${params.toString()}`, { headers: headers(key) })
  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Supabase list failed (${response.status}): ${detail.slice(0, 240)}`)
  }
  const rows = await response.json() as SupabaseRow[]
  return rows.map((row) => ({
    slug: row.slug,
    topic: row.topic,
    fileName: row.source_filename,
    createdAt: row.created_at,
    title: row.content_json.copy.title,
    metaDescription: row.content_json.copy.metaDescription,
  }))
}
