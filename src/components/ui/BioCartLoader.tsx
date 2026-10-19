import React from 'react';
import { Leaf } from 'lucide-react';

interface BioCartLoaderProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
  showProgress?: boolean;
  className?: string;
}

export const BioCartLoader: React.FC<BioCartLoaderProps> = ({
  message = 'Loading...',
  size = 'md',
  fullScreen = false,
  showProgress = true,
  className = ''
}) => {
  const logoDimensions = {
    sm: 'w-24 h-12',
    md: 'w-36 h-16',
    lg: 'w-48 h-20'
  };

  const containerSizes = {
    sm: 'p-4 gap-2',
    md: 'p-6 gap-3',
    lg: 'p-8 gap-4'
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const ringSizes = {
    sm: 'w-10 h-10 border-2',
    md: 'w-14 h-14 border-3',
    lg: 'w-18 h-18 border-4'
  };

  const content = (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center text-center select-none ${containerSizes[size]} ${className}`}
    >
      {/* Animated Brand Logo Container */}
      <div className="relative flex items-center justify-center mb-2">
        {/* Soft glowing nature backdrop ring */}
        <div
          className={`absolute rounded-full border-emerald-500/20 border-t-emerald-600 animate-spin motion-reduce:animate-none ${ringSizes[size]}`}
          style={{ animationDuration: '1.2s' }}
        />
        
        {/* Authentic BioCart Logo with gentle scale pulse */}
        <div className="relative z-10 transition-transform duration-500 transform hover:scale-105 motion-reduce:transform-none">
          <img
            src="/assets/biocart_logo_official.png"
            alt="BioCart"
            className={`${logoDimensions[size]} object-contain drop-shadow-sm`}
            onError={(e) => {
              // Graceful SVG leaf fallback if image fails to render
              const target = e.currentTarget;
              target.style.display = 'none';
              const fallback = target.parentElement?.querySelector('.biocart-fallback-icon');
              if (fallback) fallback.classList.remove('hidden');
            }}
          />
          <div className="biocart-fallback-icon hidden flex items-center gap-1.5 font-bold text-emerald-800">
            <Leaf className="w-6 h-6 text-emerald-600 animate-bounce" />
            <span className="font-serif text-lg tracking-tight">Bio<span className="text-emerald-600 font-sans italic">Cart</span></span>
          </div>
        </div>
      </div>

      {/* Subtle Progress Bar */}
      {showProgress && (
        <div className="w-32 h-1 bg-emerald-100/70 rounded-full overflow-hidden my-1">
          <div className="h-full bg-emerald-600 rounded-full w-2/5 animate-[loading_1.4s_ease-in-out_infinite] motion-reduce:w-full motion-reduce:animate-none" />
        </div>
      )}

      {/* Informative Status Message */}
      {message && (
        <p className={`font-medium text-slate-600 tracking-wide ${textSizes[size]}`}>
          {message}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 backdrop-blur-xs transition-opacity duration-300">
        {content}
      </div>
    );
  }

  return content;
};

export default BioCartLoader;
