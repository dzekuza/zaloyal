import React from "react";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

const PageContainer = React.memo(function PageContainer({ children, className = "" }: PageContainerProps) {
  const containerClassName = `w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 pb-20 sm:pb-8 ${className}`.trim();
  
  return (
    <div className="w-full flex justify-center">
      <div className={containerClassName}>
        {children}
      </div>
    </div>
  );
});

PageContainer.displayName = 'PageContainer';

export default PageContainer;