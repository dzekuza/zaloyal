import { useState } from "react";
import { getDiscordOAuthUrl } from "@/utils/discord";
import { Button } from "@/components/ui/button";

interface DiscordVerifyButtonProps {
  guildId: string;
  children?: React.ReactNode;
}

export function DiscordVerifyButton({ guildId, children }: DiscordVerifyButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    setLoading(true);
    window.location.href = getDiscordOAuthUrl();
  };

  return (
    <Button
      type="button"
      onClick={handleClick}
      variant="default"
      size="lg"
      disabled={loading}
      aria-busy={loading}
      className="bg-indigo-600 hover:bg-indigo-700 text-white"
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Redirecting...
        </span>
      ) : (
        children || "Verify Discord Membership"
      )}
    </Button>
  );
} 