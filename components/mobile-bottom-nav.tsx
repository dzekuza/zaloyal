import Link from "next/link"
import { Home, Users, BarChart3, Settings, User } from "lucide-react"

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/project", label: "My Projects", icon: Users },
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "#", label: "Settings", icon: Settings },
  { href: "/profile", label: "Profile", icon: User },
]

export default function MobileBottomNav() {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 w-full z-50 flex flex-row justify-between items-center bg-[#181818] border-t-2 border-[#282828]"
      role="navigation"
      aria-label="Mobile Bottom Navigation"
    >
      {navItems.map(({ href, label, icon: Icon }) => (
        <Link
          key={label}
          href={href}
          className="flex flex-col items-center justify-center flex-1 text-gray-300 hover:text-white py-1 px-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          tabIndex={0}
        >
          <Icon className="w-6 h-6 mb-0.5" aria-hidden="true" />
          <span className="text-xs font-medium">{label}</span>
        </Link>
      ))}
    </nav>
  )
} 