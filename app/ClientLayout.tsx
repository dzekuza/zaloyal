"use client"

import type React from "react"

import { useState } from "react"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Home, Inbox, Search, Settings, Wallet, Mail, Users } from "lucide-react"
import Navigation from "@/components/navigation"
import EmailAuth from "@/components/email-auth"
import { walletAuth } from "@/lib/wallet-auth"

const inter = Inter({ subsets: ["latin"] })

// Menu items for sidebar
const items = [
  {
    title: "Home",
    url: "/",
    icon: Home,
  },
  {
    title: "My Projects",
    url: "/project",
    icon: Users,
  },
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Inbox,
  },
  {
    title: "Leaderboard",
    url: "/leaderboard",
    icon: Calendar,
  },
  {
    title: "Search",
    url: "#",
    icon: Search,
  },
  {
    title: "Settings",
    url: "#",
    icon: Settings,
  },
]

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [authError, setAuthError] = useState("")

  const connectWallet = async () => {
    try {
      await walletAuth.connectWallet()
      setShowAuthDialog(false)
    } catch (error: any) {
      console.error("Connection failed:", error)
      setAuthError(error.message)
    }
  }

  const handleEmailAuthSuccess = (authUser: any) => {
    console.log("Email auth success:", authUser)
    setShowAuthDialog(false)
    setAuthError("")
  }

  const handleEmailAuthError = (error: string) => {
    setAuthError(error)
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <SidebarProvider>
            <Sidebar variant="inset">
              <SidebarHeader>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton size="lg" asChild>
                      <a href="/">
                        <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                          <Home className="size-4" />
                        </div>
                        <div className="grid flex-1 text-left text-sm leading-tight">
                          <span className="truncate font-semibold">Web3Quest</span>
                          <span className="truncate text-xs">Platform</span>
                        </div>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarHeader>
              <SidebarContent>
                <SidebarGroup>
                  <SidebarGroupLabel>Platform</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {items.map((item) => (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton asChild>
                            <a href={item.url}>
                              <item.icon />
                              <span>{item.title}</span>
                            </a>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </SidebarContent>
              <SidebarFooter>
                <div className="p-4 text-center">
                  <p className="text-xs text-gray-400">Web3Quest Platform</p>
                </div>
              </SidebarFooter>
              <SidebarRail />
            </Sidebar>
            <SidebarInset>
              <Navigation onAuthClick={() => setShowAuthDialog(true)} />
              <main className="flex-1">{children}</main>
            </SidebarInset>
          </SidebarProvider>


          {/* Auth Dialog */}
          <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
            <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
              <DialogHeader>
                <DialogTitle>Authentication</DialogTitle>
                <DialogDescription className="text-gray-300">
                  Sign in or register with your email
                </DialogDescription>
              </DialogHeader>

              {/* Only show email authentication */}
              <EmailAuth onSuccess={handleEmailAuthSuccess} onError={handleEmailAuthError} />

              {authError && (
                <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  {authError}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </ThemeProvider>
      </body>
    </html>
  )
}
