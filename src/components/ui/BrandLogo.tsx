import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  variant = 'dark',
}) => {
  const boxSize =
    size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-11 w-11' : 'h-9 w-9';

  const bgClass =
    variant === 'light'
      ? 'bg-white/15 border border-white/25 text-white'
      : 'bg-[#0F2547] text-white';

  return (
    <div
      className={`${boxSize} ${bgClass} rounded-lg flex items-center justify-center shrink-0`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="w-5 h-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2L4 5.5v6.5c0 4.8 3.4 9.1 8 10.5 4.6-1.4 8-5.7 8-10.5V5.5L12 2z" />
        <path d="M8.5 10.5h7" />
        <path d="M8.5 14h4.5" />
        <path d="M15 14l1.5 1.5L19 13" />
      </svg>
    </div>
  );
};
