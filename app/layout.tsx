import type React from "react"
import "./globals.css"
import ClientLayout from "./ClientLayout"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head suppressHydrationWarning>
        <title>BeLink Web3 Quest Platform</title>
        <meta name="description" content="Web3 Quest Platform for Community Engagement" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body suppressHydrationWarning>
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
