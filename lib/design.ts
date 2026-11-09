import type { DesignPrefs } from './types'

const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_RE.test(value.trim())
}

export function clampNumber(value: unknown, min: number, max: number): number | undefined {
  const n = Number(value)
  if (!Number.isFinite(n)) return undefined
  return Math.min(max, Math.max(min, n))
}

export function sanitizeDesign(input: unknown): DesignPrefs {
  if (!input || typeof input !== 'object') return {}
  const d = input as Record<string, unknown>
  const out: DesignPrefs = {}
  if (isHexColor(d.accentHex)) out.accentHex = (d.accentHex as string).trim()
  if (isHexColor(d.backgroundHex)) out.backgroundHex = (d.backgroundHex as string).trim()
  if (isHexColor(d.surfaceHex)) out.surfaceHex = (d.surfaceHex as string).trim()
  if (isHexColor(d.textHex)) out.textHex = (d.textHex as string).trim()
  if (isHexColor(d.sidebarHex)) out.sidebarHex = (d.sidebarHex as string).trim()
  const radius = clampNumber(d.radiusPx, 0, 28)
  if (radius !== undefined) out.radiusPx = radius
  const fontScale = clampNumber(d.fontScale, 0.85, 1.2)
  if (fontScale !== undefined) out.fontScale = fontScale
  const sidebarWidth = clampNumber(d.sidebarWidthPx, 200, 340)
  if (sidebarWidth !== undefined) out.sidebarWidthPx = sidebarWidth
  const contentMax = clampNumber(d.contentMaxWidthPx, 0, 1600)
  if (contentMax !== undefined) out.contentMaxWidthPx = contentMax
  if (typeof d.customCss === 'string') out.customCss = sanitizeCustomCss(d.customCss)
  return out
}

// Custom CSS is scoped by the shell under [data-custom-css] selectors written by the user.
// Block script-capable / network constructs; keep it visual-only.
export function sanitizeCustomCss(css: string): string {
  let out = css.slice(0, 8000)
  out = out.replace(/@import[^;]+;?/gi, '')
  out = out.replace(/url\s*\([^)]*\)/gi, 'none')
  out = out.replace(/expression\s*\([^)]*\)/gi, '')
  out = out.replace(/javascript\s*:/gi, '')
  out = out.replace(/behavior\s*:[^;]+;?/gi, '')
  out = out.replace(/-moz-binding\s*:[^;]+;?/gi, '')
  return out.trim()
}

export function designToStyle(design: DesignPrefs): Record<string, string> {
  const style: Record<string, string> = {}
  if (design.accentHex) {
    style['--signal'] = design.accentHex
    style['--primary'] = design.accentHex
    style['--ring'] = design.accentHex
    style['--sidebar-primary'] = design.accentHex
    style['--sidebar-ring'] = design.accentHex
  }
  if (design.backgroundHex) style['--background'] = design.backgroundHex
  if (design.surfaceHex) {
    style['--card'] = design.surfaceHex
    style['--popover'] = design.surfaceHex
  }
  if (design.textHex) {
    style['--foreground'] = design.textHex
    style['--card-foreground'] = design.textHex
    style['--popover-foreground'] = design.textHex
  }
  if (design.sidebarHex) style['--sidebar'] = design.sidebarHex
  if (design.radiusPx !== undefined) style['--radius'] = `${design.radiusPx / 16}rem`
  if (design.fontScale !== undefined) style['fontSize'] = `${design.fontScale * 100}%`
  if (design.sidebarWidthPx !== undefined) style['--sidebar-width'] = `${design.sidebarWidthPx}px`
  if (design.contentMaxWidthPx) style['--content-max-width'] = `${design.contentMaxWidthPx}px`
  return style
}
