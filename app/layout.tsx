import type React from "react"
import "./globals.css"
import ClientLayout from "./ClientLayout"
import { AuthProvider } from "@/components/auth-context"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head suppressHydrationWarning>
        <title>belink.now Web3 Quest Platform</title>
        <meta name="description" content="Web3 Quest Platform for Community Engagement" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body suppressHydrationWarning>
        <AuthProvider>
          <ClientLayout>{children}</ClientLayout>
        </AuthProvider>
      </body>
    </html>
  )
}

export const metadata = {
  title: 'BeLink Web3 Quest Platform',
  description: 'Web3 Quest Platform for Community Engagement',
  generator: 'v0.dev'
};
