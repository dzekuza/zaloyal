import React from 'react';

interface WalletIconProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const WalletIcon: React.FC<WalletIconProps> = ({ className = "w-4 h-4", size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <svg 
      className={`${sizeClasses[size]} ${className}`} 
      viewBox="0 0 24 24" 
      fill="currentColor"
      aria-label="Wallet"
    >
      <path d="M21 12a2 2 0 0 0-2 2v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4a2 2 0 0 0 2-2 2 2 0 0 0-2-2H5a4 4 0 0 0-4 4v12a4 4 0 0 0 4 4h12a4 4 0 0 0 4-4v-4a2 2 0 0 0-2-2z"/>
      <path d="M16 12a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h8z"/>
      <circle cx="12" cy="14" r="1"/>
    </svg>
  );
};

export default WalletIcon; 