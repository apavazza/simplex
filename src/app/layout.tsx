import type { Metadata } from 'next'
import './globals.css'
import Footer from '@/src/components/footer'

export const metadata: Metadata = {
  title: 'Simplex Method Solver',
  description: "Open-source web app to solve linear programming problems with the Simplex algorithm. Interactive interface with step-by-step solutions, visualizations, and support for standard and dual simplex methods.",
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
