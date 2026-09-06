import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/lib/theme/ThemeContext'

export const metadata: Metadata = {
  title: 'Client Ops',
  description: 'Internal client management and billing platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){ try { var t = localStorage.getItem('theme') || 'light'; document.documentElement.setAttribute('data-theme', t); } catch(e){} })();`,
          }}
        />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}

