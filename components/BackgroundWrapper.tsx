import React from "react";

export default function BackgroundWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#181818]">
      {children}
    </div>
  );
}