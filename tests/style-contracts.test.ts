import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('../app/assets/css/main.css', import.meta.url), 'utf8')

function rule(selector: string): string {
  const start = css.indexOf(`${selector} {`)
  if (start < 0) throw new Error(`Missing style rule: ${selector}`)
  return css.slice(start).split('}')[0] ?? ''
}

describe('approved visual choices', () => {
  it('keeps regional bars the exact same yellow as company-row hover', () => {
    expect(rule('.region-bar-track span')).toContain('background: var(--accent-yellow)')
    expect(rule('tbody tr:hover')).toContain('background: var(--accent-yellow)')
  })
  it('does not reintroduce a minimum bar width that exaggerates small amounts', () => {
    expect(rule('.region-bar-track span')).not.toContain('min-width:')
  })
  it('keeps the workspace background transparent and its cards top-aligned', () => {
    const workspace = rule('.workspace-grid')
    expect(workspace).toContain('background: transparent')
    expect(workspace).toContain('align-items: start')
    expect(workspace).not.toContain('border-top:')
    expect(workspace).not.toContain('border-bottom:')
  })
})
