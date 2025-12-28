import { AccessibilityButton } from '@/components/AccessibilityButton'
import { AppSidebar } from '@/components/ChatBot/app-sidebar'
import { DataStreamProvider } from '@/components/ChatBot/data-stream-provider'
import { SidebarInset, SidebarProvider } from '@/components/ChatBot/ui/sidebar'
import { auth } from '@/lib/payload-auth'
import { FontProvider } from '@/providers/Font'
import { InitFont } from '@/providers/Font/InitFont'
import { ThemeProvider } from '@/providers/Theme'
import { InitTheme } from '@/providers/Theme/InitTheme'
import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import { cookies } from 'next/headers'
import Script from 'next/script'
import { Suspense } from 'react'
import './globals.css'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html
      className={[GeistSans.variable, GeistMono.variable].filter(Boolean).join(' ')}
      lang="en"
      suppressHydrationWarning
    >
      <head>
        <InitTheme />
        <InitFont />
      </head>
      <body className="antialiased">
        <Script
          src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
          strategy="beforeInteractive"
        />
        <ThemeProvider>
          <FontProvider>
            <AccessibilityButton />
            <DataStreamProvider>
              <Suspense fallback={<div className="flex h-dvh" />}>
                <SidebarWrapper>{children}</SidebarWrapper>
              </Suspense>
            </DataStreamProvider>
          </FontProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

async function SidebarWrapper({ children }: { children: React.ReactNode }) {
  const [session, cookieStore] = await Promise.all([auth(), cookies()])
  const isCollapsed = cookieStore.get('sidebar_state')?.value !== 'true'

  return (
    <SidebarProvider defaultOpen={!isCollapsed}>
      <AppSidebar user={session?.user} />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  )
}
