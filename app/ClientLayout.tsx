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
import MobileBottomNav from "@/components/mobile-bottom-nav"

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
    window.location.reload()
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
                <div className="flex items-center justify-start py-6 pl-4">
                  <img src="/belinklogo.svg" alt="Belink Logo" className="h-8 w-auto" />
                </div>
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
            <DialogContent className="bg-[#0b4b34] border-[#0b4b34] text-white max-w-md">
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
        <MobileBottomNav />
      </body>
    </html>
  )
}
