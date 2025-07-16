import React from "react";

export default function BackgroundWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-[#181818]">
      {children}
    </div>
  );
} 