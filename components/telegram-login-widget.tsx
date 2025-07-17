"use client"

import { useEffect, useRef } from "react";

interface TelegramLoginWidgetProps {
  botName: string; // Your bot's username, e.g. 'MyBot'
  onAuth: (telegramUser: {
    id: number;
    username: string;
    first_name?: string;
    last_name?: string;
    photo_url?: string;
    auth_date: number;
    hash: string;
  }) => void;
  buttonText?: string;
  className?: string;
}

export default function TelegramLoginWidget({ botName, onAuth, buttonText = "Verify with Telegram", className = "" }: TelegramLoginWidgetProps) {
  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Clean up any previous widget
    if (widgetRef.current) {
      widgetRef.current.innerHTML = "";
    }
    // @ts-ignore
    window.TelegramLoginWidget = undefined;

    // Create the script
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?7";
    script.async = true;
    script.setAttribute("data-telegram-login", botName);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "8");
    script.setAttribute("data-userpic", "false");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-lang", "en");
    script.setAttribute("data-onauth", "window.handleTelegramAuth(user)");
    if (buttonText) {
      script.setAttribute("data-auth-url", ""); // disables redirect
      script.setAttribute("data-button-text", buttonText);
    }
    if (widgetRef.current) {
      widgetRef.current.appendChild(script);
    }

    // Expose the callback globally
    // @ts-ignore
    window.handleTelegramAuth = (user: any) => {
      onAuth(user);
    };

    return () => {
      // Clean up
      // @ts-ignore
      window.handleTelegramAuth = undefined;
      if (widgetRef.current) {
        widgetRef.current.innerHTML = "";
      }
    };
  }, [botName, onAuth, buttonText]);

  return <div ref={widgetRef} className={className} />;
}
