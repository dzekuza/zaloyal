import Link from "next/link"
import { Home, Users, BarChart3, User, Trophy, Info } from "lucide-react"
import { usePathname } from "next/navigation"

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/project", label: "My Projects", icon: Users },
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
]

export default function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 left-0 w-full z-50 flex flex-row items-center bg-[#181818] border-t-2 border-[#282828] px-1 py-1"
        role="navigation"
        aria-label="Mobile Bottom Navigation"
      >
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== "/" && pathname.startsWith(href))
          
          return (
            <Link
              key={label}
              href={href}
              className={`flex flex-col items-center justify-center w-1/5 py-2 px-0.5 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400 rounded-lg ${
                isActive 
                  ? "text-green-400 bg-green-400/10" 
                  : "text-gray-300 hover:text-white hover:bg-white/5"
              }`}
              tabIndex={0}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="w-4 h-4 mb-0.5" aria-hidden="true" />
              <span className="text-xs font-medium leading-tight">{label}</span>
            </Link>
          )
        })}
      </nav>
      
      {/* Setup Guide Button for Mobile */}
      <button
        className="md:hidden fixed bottom-20 right-4 z-50 w-12 h-12 rounded-full bg-[#111111] border border-[#282828] shadow-lg flex items-center justify-center hover:bg-[#181818] transition-colors"
        onClick={() => {
          // Show setup guide modal or navigate to setup guide
          window.dispatchEvent(new CustomEvent('show-setup-guide'))
        }}
        aria-label="Show setup guide"
      >
        <Info className="w-6 h-6 text-green-400" />
      </button>
    </>
  )
} 