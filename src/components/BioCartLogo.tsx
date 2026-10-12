import React, { useState } from 'react';
import { Leaf } from 'lucide-react';

interface BioCartLogoProps {
  className?: string;
  showTagline?: boolean; // Maintained for prop compatibility
  onDesktopOnlyTagline?: boolean; // Maintained for prop compatibility
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const BioCartLogo: React.FC<BioCartLogoProps> = ({
  className = '',
  showTagline = true,
  onDesktopOnlyTagline = false,
  size = 'md',
}) => {
  const [hasError, setHasError] = useState(false);
  const [loading, setLoading] = useState(true);

  const heightClasses = {
    sm: 'h-[56px] md:h-[64px]', // Navbar/Dynamic Island
    md: 'h-[64px] md:h-[72px]', // Auth Modal
    lg: 'h-[80px] md:h-[96px]', // Footer
    xl: 'h-[120px] md:h-[160px]', // Loading Screen
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-5xl',
  };
  const iconSizes = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  if (hasError) {
    return (
      <div className={`flex items-center gap-2 select-none font-serif font-bold text-nature-800 dark:text-[#cbd5e1] ${className}`} id="biocart-logo-fallback">
        <Leaf className={`${iconSizes[size]} text-emerald-600 dark:text-emerald-400`} />
        <span className={`${textSizes[size]} tracking-tight`}>
          Bio<span className="text-emerald-700 dark:text-emerald-400 font-sans font-extrabold italic">Cart</span>
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-center select-none relative ${className}`} id="biocart-logo-wrapper">
      {loading && (
        <div className="absolute inset-0 bg-slate-100 dark:bg-charcoal-800 animate-pulse rounded" />
      )}
      <img
        src="/assets/biocart_logo_official.png"
        alt="BioCart Logo"
        referrerPolicy="no-referrer"
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setHasError(true);
        }}
        style={{ 
          imageRendering: '-webkit-optimize-contrast', 
          transform: 'translateZ(0)',
          willChange: 'transform'
        }}
        className={`${heightClasses[size]} w-auto object-contain transition-all duration-300 dark:brightness-110 dark:contrast-125 dark:drop-shadow-[0_0_12px_rgba(255,255,255,0.2)] ${loading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'} drop-shadow-sm`}
        id="biocart-logo-img"
        loading="eager" // Logo should load immediately
      />
    </div>
  );
};
