import type { Metadata } from 'next'
import './globals.css'
import Footer from '@/src/components/footer'

export const metadata: Metadata = {
  title: 'Simplex Method Solver',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen">
        <main className="flex-grow">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}
