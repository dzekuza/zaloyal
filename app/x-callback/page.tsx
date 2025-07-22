"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function XCallbackPage() {
  const [status, setStatus] = useState<"verifying" | "success" | "fail">("verifying");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("Processing OAuth callback...");

  useEffect(() => {
    async function handleCallback() {
      try {
        setProgress("Retrieving session...");
        
        // Get the current session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error("Session error:", sessionError);
          setStatus("fail");
          setError("Could not retrieve user session after X (Twitter) login. Please try again.");
          notifyParent("fail");
          return;
        }

        if (!sessionData?.session) {
          setStatus("fail");
          setError("No active session found. Please sign in again.");
          notifyParent("fail");
          return;
        }

        setProgress("Verifying X (Twitter) identity...");
        
        // Get user identities to verify Twitter was linked
        const { data: identities, error: identitiesError } = await supabase.auth.getUserIdentities();
        if (identitiesError) {
          console.error("Identities error:", identitiesError);
          setStatus("fail");
          setError("Could not retrieve X (Twitter) identity. Please try again.");
          notifyParent("fail");
          return;
        }

        const twitterIdentity = identities?.identities?.find(
          (identity: any) => identity.provider === 'twitter'
        );

        if (!twitterIdentity) {
          setStatus("fail");
          setError("X (Twitter) account was not properly linked. Please try again.");
          notifyParent("fail");
          return;
        }

        setProgress("Saving profile data...");
        
        // Update user profile with Twitter data
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error: updateError } = await supabase.from('users').update({
            x_id: twitterIdentity.id,
            x_username: twitterIdentity.identity_data?.user_name,
            x_avatar_url: twitterIdentity.identity_data?.avatar_url,
          }).eq('id', user.id);

          if (updateError) {
            console.error("Profile update error:", updateError);
            // Don't fail the whole process for profile update errors
            console.warn("Failed to update profile, but OAuth was successful");
          }
        }

        setProgress("Success! Closing window...");
        setStatus("success");
        notifyParent("success");
        
        // Close window after a short delay
        setTimeout(() => {
          if (window.opener) {
            window.close();
          }
        }, 1500);

      } catch (err: any) {
        console.error("Callback error:", err);
        setStatus("fail");
        setError(err.message || "Unknown error during X (Twitter) callback.");
        notifyParent("fail");
      }
    }

    function notifyParent(result: "success" | "fail") {
      if (window.opener) {
        window.opener.postMessage(
          result === "success" ? 'zaloyal-twitter-oauth-success' : 'zaloyal-twitter-oauth-fail', 
          window.location.origin
        );
      }
    }

    handleCallback();
  }, []);

  if (status === "verifying") {
    return (
      <div className="min-h-screen bg-[#181818] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
          <div className="text-white text-lg font-medium">Linking your X (Twitter) account...</div>
          <div className="text-gray-400 text-sm">{progress}</div>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen bg-[#181818] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-green-500 text-6xl">✅</div>
          <div className="text-white text-xl font-medium">X (Twitter) account linked successfully!</div>
          <div className="text-gray-400 text-sm">You can close this window now.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#181818] flex items-center justify-center">
      <div className="text-center space-y-4 max-w-md mx-auto px-4">
        <div className="text-red-500 text-6xl">❌</div>
        <div className="text-white text-xl font-medium">Failed to link X (Twitter) account</div>
        <div className="text-gray-400 text-sm">{error}</div>
        <div className="text-gray-500 text-xs mt-4">
          This window will close automatically in a few seconds.
        </div>
      </div>
    </div>
  );
} 