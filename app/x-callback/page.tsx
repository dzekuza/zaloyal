"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function XCallbackPage() {
  const [status, setStatus] = useState<"verifying" | "success" | "fail">("verifying");
  const [error, setError] = useState("");

  useEffect(() => {
    async function handleCallback() {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData?.session) {
          setStatus("fail");
          setError("Could not retrieve user session after X (Twitter) login. Please try again.");
          if (window.opener) {
            window.opener.postMessage('zaloyal-x-oauth-fail', window.location.origin);
          }
          setTimeout(() => window.close(), 1200);
          return;
        }
        const { data: identities, error: identitiesError } = await supabase.auth.getUserIdentities();
        if (identitiesError) {
          setStatus("fail");
          setError("Could not retrieve X (Twitter) identity. Please try again.");
          if (window.opener) {
            window.opener.postMessage('zaloyal-x-oauth-fail', window.location.origin);
          }
          setTimeout(() => window.close(), 1200);
          return;
        }
        setStatus("success");
        if (window.opener) {
          window.opener.postMessage('zaloyal-x-oauth-success', window.location.origin);
        }
        setTimeout(() => window.close(), 800);
      } catch (err: any) {
        setStatus("fail");
        setError(err.message || "Unknown error during X (Twitter) callback.");
        if (window.opener) {
          window.opener.postMessage('zaloyal-x-oauth-fail', window.location.origin);
        }
        setTimeout(() => window.close(), 1200);
      }
    }
    handleCallback();
  }, []);

  if (status === "verifying") return (
    <div className="min-h-screen bg-[#181818] flex items-center justify-center">
      <div className="text-white text-xl">Linking your X (Twitter) account...</div>
    </div>
  );
  if (status === "success") return (
    <div className="min-h-screen bg-[#181818] flex items-center justify-center">
      <div className="text-white text-xl">✅ X (Twitter) account linked! You can close this window.</div>
    </div>
  );
  return (
    <div className="min-h-screen bg-[#181818] flex items-center justify-center">
      <div className="text-white text-xl">❌ {error}</div>
    </div>
  );
} 