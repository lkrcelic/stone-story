import { AppSidebar } from '@/components/ChatBot/app-sidebar'
import { DataStreamProvider } from '@/components/ChatBot/data-stream-provider'
import { SidebarInset, SidebarProvider } from '@/components/ChatBot/ui/sidebar'
import { auth } from '@/lib/payload-auth'
import { cookies } from 'next/headers'
import Script from 'next/script'
import { Suspense } from 'react'
import './globals.css'

export default function Layout({ children }: { children: React.ReactNode }) {
  const LIGHT_THEME_COLOR = 'hsl(0 0% 100%)'
  const DARK_THEME_COLOR = 'hsl(240deg 10% 3.92%)'
  const THEME_COLOR_SCRIPT = `\
(function() {
  var html = document.documentElement;
  var meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  function updateThemeColor() {
    var isDark = html.classList.contains('dark');
    meta.setAttribute('content', isDark ? '${DARK_THEME_COLOR}' : '${LIGHT_THEME_COLOR}');
  }
  var observer = new MutationObserver(updateThemeColor);
  observer.observe(html, { attributes: true, attributeFilter: ['class'] });
  updateThemeColor();
})();`
  return (
    <html>
      <head>
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: "Required"
          dangerouslySetInnerHTML={{
            __html: THEME_COLOR_SCRIPT,
          }}
        />
      </head>
      <body className="antialiased">
        <Script
          src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
          strategy="beforeInteractive"
        />
        <DataStreamProvider>
          <Suspense fallback={<div className="flex h-dvh" />}>
            <SidebarWrapper>{children}</SidebarWrapper>
          </Suspense>
        </DataStreamProvider>
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
