'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export function DiscordTestButton() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleTestDiscordAuth = async () => {
    setLoading(true);
    try {
      console.log('DEBUG: Testing Discord OAuth...');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/callback`,
          scopes: 'identify email'
        }
      });

      if (error) {
        console.error('Discord OAuth error:', error);
        toast({
          title: "Discord OAuth Error",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      console.log('DEBUG: Discord OAuth URL generated:', data.url);
      toast({
        title: "Discord OAuth Initiated",
        description: "Redirecting to Discord...",
      });

      // The redirect should happen automatically
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error testing Discord OAuth:', error);
      toast({
        title: "Error",
        description: "Failed to test Discord OAuth",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleTestDiscordAuth}
      disabled={loading}
      className="bg-[#5865F2] hover:bg-[#4752C4] text-white"
    >
      {loading ? 'Testing...' : 'Test Discord OAuth'}
    </Button>
  );
} 