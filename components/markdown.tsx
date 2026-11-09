'use client'

import type { ReactNode } from 'react'

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts: ReactNode[] = []
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  let i = 0
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index))
    const token = match[0]
    if (token.startsWith('**')) {
      parts.push(<strong key={`${keyPrefix}-b${i}`}>{token.slice(2, -2)}</strong>)
    } else {
      parts.push(
        <code key={`${keyPrefix}-c${i}`} className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
          {token.slice(1, -1)}
        </code>,
      )
    }
    lastIndex = match.index + token.length
    i++
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return parts
}

function isTableLine(line: string): boolean {
  const t = line.trim()
  return t.startsWith('|') && t.endsWith('|')
}

function isTableSeparator(line: string): boolean {
  return /^\|[\s:|-]+\|$/.test(line.trim())
}

function parseTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim())
}

export function Markdown({ text }: { text: string }) {
  const lines = text.split('\n')
  const blocks: ReactNode[] = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    // Empty line
    if (trimmed === '') {
      i++
      continue
    }

    // Table
    if (isTableLine(trimmed) && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const header = parseTableRow(trimmed)
      i += 2
      const rows: string[][] = []
      while (i < lines.length && isTableLine(lines[i].trim())) {
        rows.push(parseTableRow(lines[i]))
        i++
      }
      blocks.push(
        <div key={key++} className="overflow-x-auto rounded-md border">
          <table className="w-full text-left text-[12px]">
            <thead>
              <tr className="border-b bg-muted/40">
                {header.map((h, hi) => (
                  <th key={hi} className="px-2.5 py-1.5 font-medium">
                    {renderInline(h, `t${key}-h${hi}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} className="border-b last:border-b-0">
                  {r.map((c, ci) => (
                    <td key={ci} className="px-2.5 py-1.5 align-top text-muted-foreground">
                      {renderInline(c, `t${key}-r${ri}c${ci}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
      continue
    }

    // Headers
    const headerMatch = trimmed.match(/^(#{1,4})\s+(.+)$/)
    if (headerMatch) {
      const level = headerMatch[1].length
      const content = renderInline(headerMatch[2], `h${key}`)
      blocks.push(
        level <= 2 ? (
          <div key={key++} className="text-sm font-semibold">
            {content}
          </div>
        ) : (
          <div key={key++} className="text-[13px] font-medium">
            {content}
          </div>
        ),
      )
      i++
      continue
    }

    // Unordered list
    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = []
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ''))
        i++
      }
      blocks.push(
        <ul key={key++} className="space-y-1">
          {items.map((item, li) => (
            <li key={li} className="flex gap-2 text-[13px] leading-relaxed text-foreground/90">
              <span className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground/60" />
              <span>{renderInline(item, `u${key}-${li}`)}</span>
            </li>
          ))}
        </ul>,
      )
      continue
    }

    // Ordered list
    if (/^\d+[.)]\s+/.test(trimmed)) {
      const items: string[] = []
      while (i < lines.length && /^\d+[.)]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+[.)]\s+/, ''))
        i++
      }
      blocks.push(
        <ol key={key++} className="space-y-1">
          {items.map((item, li) => (
            <li key={li} className="flex gap-2 text-[13px] leading-relaxed text-foreground/90">
              <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{li + 1}.</span>
              <span>{renderInline(item, `o${key}-${li}`)}</span>
            </li>
          ))}
        </ol>,
      )
      continue
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,})$/.test(trimmed)) {
      blocks.push(<hr key={key++} className="border-border" />)
      i++
      continue
    }

    // Paragraph (collect consecutive non-special lines)
    const paraLines: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !isTableLine(lines[i].trim()) &&
      !/^(#{1,4})\s+/.test(lines[i].trim()) &&
      !/^[-*]\s+/.test(lines[i].trim()) &&
      !/^\d+[.)]\s+/.test(lines[i].trim()) &&
      !/^(-{3,}|\*{3,})$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i].trim())
      i++
    }
    if (paraLines.length > 0) {
      blocks.push(
        <p key={key++} className="text-[13px] leading-relaxed text-foreground/90">
          {renderInline(paraLines.join(' '), `p${key}`)}
        </p>,
      )
    }
  }

  return <div className="space-y-2.5">{blocks}</div>
}
