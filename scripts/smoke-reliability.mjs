import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'

// Run after pnpm build, with port 3000 free. No Gemini or Supabase call is made:
// storage deliberately points to a closed local port to reproduce an outage.
const origin = 'http://127.0.0.1:3000'
const child = spawn(process.execPath, ['.output/server/index.mjs'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: '3000', HOST: '127.0.0.1',
    GEMINI_API_KEY: '', NUXT_GEMINI_API_KEY: '',
    SUPABASE_URL: 'http://127.0.0.1:1',
    NUXT_SUPABASE_URL: 'http://127.0.0.1:1',
    SUPABASE_SERVICE_ROLE_KEY: 'test-only-not-a-real-key',
    NUXT_SUPABASE_SERVICE_ROLE_KEY: 'test-only-not-a-real-key',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
})
let logs = ''
child.stdout.on('data', (data) => { logs = (logs + data).slice(-6000) })
child.stderr.on('data', (data) => { logs = (logs + data).slice(-6000) })
try {
  let ready = false
  for (let attempt = 0; attempt < 50; attempt++) {
    if (child.exitCode !== null) throw new Error('Production server exited before readiness')
    try {
      ready = (await fetch(origin)).ok
      if (ready) break
    } catch { /* waiting for startup only */ }
    await delay(200)
  }
  assert(ready, 'Compiled production server must be ready')
  console.log('Compiled server ready; testing oversized uploads.')
  for (const endpoint of ['preview', 'generate']) {
    const form = new FormData()
    form.append('topic', 'fintech')
    form.append('file', new Blob([Buffer.alloc(5 * 1024 * 1024 + 1, 65)], { type: 'text/csv' }), 'large.csv')
    const response = await fetch(`${origin}/api/${endpoint}`, { method: 'POST', body: form })
    const body = await response.json()
    assert.equal(response.status, 413, `${endpoint} must enforce the file limit`)
    assert.equal(body.errorCode ?? body.errors?.[0]?.code, 'file_too_large')
    console.log(`/api/${endpoint}: HTTP 413, file_too_large`)
  }
  const unavailable = await fetch(`${origin}/reports/storage-outage-test`, { headers: { Accept: 'text/html' } })
  const html = await unavailable.text()
  assert.equal(unavailable.status, 503, 'Database outage must not become a 404')
  assert.match(html, /Report storage is unavailable/)
  assert.match(html, /The page could not be loaded/)
  assert.doesNotMatch(html, /127\.0\.0\.1:1|test-only-not-a-real-key/)
  console.log('Storage outage: HTTP 503, custom HTML error page, no upstream detail leak.')

  const missing = await fetch(`${origin}/unknown-test-route`, { headers: { Accept: 'text/html' } })
  assert.equal(missing.status, 404)
  assert.match(await missing.text(), /This report has moved or does not exist/)
  console.log('Unknown route: HTTP 404 with branded HTML.')
} catch (error) {
  console.error(logs)
  throw error
} finally {
  child.kill('SIGTERM')
}
