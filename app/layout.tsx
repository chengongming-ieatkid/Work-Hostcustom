import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter, Geist_Mono } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin', 'vietnamese'], variable: '--font-inter' })
const geistMono = Geist_Mono({ subsets: ['latin', 'latin-ext'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: 'TVQ Work Copilot — The Self-Adaptive AI Workspace',
  description:
    'Work smarter. Live healthier. Grow together. AI-native workspace: People, Work in Progress, Team Pulse và AI Copilot với phân quyền L1–L3.',
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: [{ media: '(prefers-color-scheme: light)', color: '#faf9f5' }],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="vi" className={`bg-background ${inter.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased">{children}</body>
      {process.env.NODE_ENV === 'production' && <Analytics />}
    </html>
  )
}
