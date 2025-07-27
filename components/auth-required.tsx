"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

interface AuthRequiredProps {
  title?: string;
  message?: string;
  showSignInButton?: boolean;
  className?: string;
  onAuthClick?: () => void;
}

export default function AuthRequired({
  title = "Sign In Required",
  message = "Please sign in with your email or wallet to access this page.",
  showSignInButton = true,
  className = "",
  onAuthClick,
}: AuthRequiredProps) {
  const handleSignIn = () => {
    if (onAuthClick) {
      onAuthClick();
    } else {
      // Use the same event-based approach as the navigation component
      window.dispatchEvent(new CustomEvent('open-auth-dialog'));
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 ${className}`}>
      <Card className="bg-[#111111] rounded-lg max-w-md w-full">
        <CardContent className="p-6 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-white">{title}</h2>
              <p className="text-gray-400 text-sm">{message}</p>
            </div>
            
            {showSignInButton && (
              <Button 
                onClick={handleSignIn}
                className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 w-full"
              >
                Sign In
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 