import React from "react";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export default function PageContainer({ children, className = "" }: PageContainerProps) {
  return (
    <div className="w-full flex justify-center">
      <div className={`w-full max-w-7xl px-4 py-8 ${className}`.trim()}>
        {children}
      </div>
    </div>
  );
}