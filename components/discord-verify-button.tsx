import { useState } from "react";
import { getDiscordOAuthUrl } from "@/utils/discord";

interface DiscordVerifyButtonProps {
  guildId: string;
  children?: React.ReactNode;
}

export function DiscordVerifyButton({ guildId, children }: DiscordVerifyButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    setLoading(true);
    window.location.href = getDiscordOAuthUrl(guildId);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="bg-indigo-600 text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-60"
      disabled={loading}
      aria-busy={loading}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Redirecting...
        </span>
      ) : (
        children || "Verify Discord Membership"
      )}
    </button>
  );
} 