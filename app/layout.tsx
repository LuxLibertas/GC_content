import type { Metadata } from "next"
import localFont from "next/font/local"
import "./globals.css"

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-mono",
  weight: "100 900",
})

export const metadata: Metadata = {
  title: "GC Scope — Sliding Window GC Content Analyser",
  description: "Client-side DNA GC content analysis powered by Rust/WebAssembly",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistMono.variable} antialiased bg-[#0F1117] text-slate-200 min-h-screen`}>
        {children}
      </body>
    </html>
  )
}
