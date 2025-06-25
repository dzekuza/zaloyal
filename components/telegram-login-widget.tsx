"use client"

import { useEffect, useRef } from "react"

interface TelegramLoginWidgetProps {
  botUsername: string
  onAuth: (user: any) => void
  buttonSize?: "large" | "medium" | "small"
  cornerRadius?: number
  requestAccess?: boolean
}

export default function TelegramLoginWidget({
  botUsername,
  onAuth,
  buttonSize = "medium",
  cornerRadius = 10,
  requestAccess = true,
}: TelegramLoginWidgetProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current) {
      // Clear any existing content
      ref.current.innerHTML = ""

      // Create script element for Telegram Widget
      const script = document.createElement("script")
      script.src = "https://telegram.org/js/telegram-widget.js?22"
      script.setAttribute("data-telegram-login", botUsername)
      script.setAttribute("data-size", buttonSize)
      script.setAttribute("data-corner-radius", cornerRadius.toString())
      script.setAttribute("data-request-access", requestAccess ? "write" : "")
      script.setAttribute("data-userpic", "false")
      script.setAttribute("data-onauth", "onTelegramAuth(user)")

      // Add global callback function
      ;(window as any).onTelegramAuth = (user: any) => {
        onAuth(user)
      }

      ref.current.appendChild(script)
    }

    return () => {
      // Cleanup global function
      delete (window as any).onTelegramAuth
    }
  }, [botUsername, buttonSize, cornerRadius, requestAccess, onAuth])

  return (
    <div>
      <div ref={ref} />
      <p className="text-xs text-gray-400 mt-2">Click to authenticate with Telegram and verify group membership</p>
    </div>
  )
}
