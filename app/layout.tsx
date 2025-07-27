import type React from "react"
import "./globals.css"
import ClientLayout from "./ClientLayout"
import { Inter, Poppins } from 'next/font/google'

// Add font configurations
const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const poppins = Poppins({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${poppins.variable}`}>
      <head suppressHydrationWarning>
        <title>belink.now Web3 Quest Platform</title>
        <meta name="description" content="Web3 Quest Platform for Community Engagement" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body suppressHydrationWarning className="font-sans">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}

export const metadata = {
  title: 'BeLink Web3 Quest Platform',
  description: 'Web3 Quest Platform for Community Engagement',
  generator: 'v0.dev'
};
