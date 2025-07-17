"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function DiscordCallbackPage() {
  const [status, setStatus] = useState<"verifying" | "success" | "fail">("verifying");
  const [error, setError] = useState("");
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // We passed guildId:taskId as state
    const taskId = searchParams.get("taskId");
    
    // Parse state to get guildId and taskId
    let guildId = state;
    if (state && state.includes(":")) {
      const [guildIdPart, taskIdPart] = state.split(":");
      guildId = guildIdPart;
      if (!taskId) {
        // If taskId wasn't passed as separate param, get it from state
        const taskIdFromState = taskIdPart;
        if (taskIdFromState) {
          // Update the URL to include taskId for the API call
          const url = new URL(window.location.href);
          url.searchParams.set("taskId", taskIdFromState);
          window.history.replaceState({}, "", url.toString());
        }
      }
    }

    if (!code || !guildId) {
      setStatus("fail");
      setError("Missing code or guildId in callback.");
      return;
    }

    // Call backend to verify membership
    fetch("/api/verify/discord-join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, guildId, taskId }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && data.isMember) {
          setStatus("success");
          // If this was a task verification, show success and redirect back
          if (taskId) {
            setTimeout(() => {
              alert("Discord membership verified! Task completed successfully.");
              router.push("/dashboard"); // Redirect to dashboard or quest page
            }, 2000);
          }
        } else {
          setStatus("fail");
          setError(data.error || "You are not a member of the server.");
        }
      })
      .catch((err) => {
        setStatus("fail");
        setError("Verification failed: " + err.message);
      });
  }, [searchParams, router]);

  if (status === "verifying") return (
    <div className="min-h-screen bg-[#181818] flex items-center justify-center">
      <div className="text-white text-xl">Verifying Discord membership...</div>
    </div>
  );
  if (status === "success") return (
    <div className="min-h-screen bg-[#181818] flex items-center justify-center">
      <div className="text-white text-xl">✅ Discord membership verified!</div>
    </div>
  );
  return (
    <div className="min-h-screen bg-[#181818] flex items-center justify-center">
      <div className="text-white text-xl">❌ {error}</div>
    </div>
  );
} 