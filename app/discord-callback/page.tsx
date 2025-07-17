"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function DiscordCallbackPage() {
  const [status, setStatus] = useState<"verifying" | "success" | "fail">("verifying");
  const [error, setError] = useState("");
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    const guildId = searchParams.get("state"); // We passed guildId as state

    if (!code || !guildId) {
      setStatus("fail");
      setError("Missing code or guildId in callback.");
      return;
    }

    // Call backend to verify membership
    fetch("/api/verify/discord-join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, guildId }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && data.isMember) {
          setStatus("success");
          // Optionally, update user state or redirect
        } else {
          setStatus("fail");
          setError(data.error || "You are not a member of the server.");
        }
      })
      .catch((err) => {
        setStatus("fail");
        setError("Verification failed: " + err.message);
      });
  }, [searchParams]);

  if (status === "verifying") return <div>Verifying Discord membership...</div>;
  if (status === "success") return <div>✅ Discord membership verified!</div>;
  return <div>❌ {error}</div>;
} 