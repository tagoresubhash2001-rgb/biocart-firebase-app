import React, { useState } from 'react';

export interface SafeImageProps {
  src: string;
  fallbackSrc: string;
  alt: string;
  className?: string;
  id?: string;
}

export const SafeImage: React.FC<SafeImageProps> = ({ src, fallbackSrc, alt, className = '', id }) => {
  const [imgSrc, setImgSrc] = useState(src);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className={`relative overflow-hidden bg-slate-100 dark:bg-charcoal-800 ${className.split(' ').filter(c => c.startsWith('w-') || c.startsWith('h-') || c.startsWith('aspect-') || c.startsWith('rounded')).join(' ')}`} id={id ? `${id}-wrapper` : undefined}>
      {/* Skeleton / Loading State */}
      {!isLoaded && (
        <div className="absolute inset-0 animate-pulse bg-slate-200 dark:bg-charcoal-700" />
      )}
      
      <img
        src={imgSrc}
        alt={alt}
        id={id}
        loading="lazy"
        referrerPolicy="no-referrer"
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          if (!hasError) {
            setImgSrc(fallbackSrc);
            setHasError(true);
          } else {
            setIsLoaded(true); // Stop loading animation if fallback also fails
          }
        }}
        className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};
