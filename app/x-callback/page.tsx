"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function XCallbackPage() {
  const [status, setStatus] = useState<"verifying" | "success" | "fail">("verifying");
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    async function handleCallback() {
      try {
        // Wait for Supabase to process the OAuth callback and set the session
        const { data: user, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          setStatus("fail");
          setError("Could not retrieve user session after X (Twitter) login. Please try again.");
          return;
        }
        // Optionally, fetch identities to ensure X is linked
        const { data: identities, error: identitiesError } = await supabase.auth.getUserIdentities();
        if (identitiesError) {
          setStatus("fail");
          setError("Could not retrieve X (Twitter) identity. Please try again.");
          return;
        }
        // Success: redirect to profile
        setStatus("success");
        setTimeout(() => {
          router.replace("/profile");
        }, 1200);
      } catch (err: any) {
        setStatus("fail");
        setError(err.message || "Unknown error during X (Twitter) callback.");
      }
    }
    handleCallback();
  }, [router]);

  if (status === "verifying") return (
    <div className="min-h-screen bg-[#181818] flex items-center justify-center">
      <div className="text-white text-xl">Linking your X (Twitter) account...</div>
    </div>
  );
  if (status === "success") return (
    <div className="min-h-screen bg-[#181818] flex items-center justify-center">
      <div className="text-white text-xl">✅ X (Twitter) account linked! Redirecting...</div>
    </div>
  );
  return (
    <div className="min-h-screen bg-[#181818] flex items-center justify-center">
      <div className="text-white text-xl">❌ {error}</div>
    </div>
  );
} 