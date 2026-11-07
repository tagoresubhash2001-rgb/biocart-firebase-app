import React, { useEffect, useState } from 'react';
import { imgSrc, IMAGE_FALLBACK } from '../../utils/image';

export interface SafeImageProps {
  src: string;
  fallbackSrc?: string;
  alt: string;
  className?: string;
  id?: string;
  width?: number;
}

/**
 * Lazy image with a skeleton and a fallback.
 * Fallback order: optimised URL → original URL → fallbackSrc → built-in placeholder.
 * Resets when `src` changes (fixes stale/broken photos after product data refreshes).
 */
export const SafeImage: React.FC<SafeImageProps> = ({ src, fallbackSrc, alt, className = '', id, width = 800 }) => {
  const chain = React.useMemo(() => {
    const list = [imgSrc(src, width), String(src || ''), imgSrc(fallbackSrc, width), IMAGE_FALLBACK].filter(Boolean);
    return Array.from(new Set(list));
  }, [src, fallbackSrc, width]);

  const [step, setStep] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => { setStep(0); setIsLoaded(false); }, [chain]);

  const wrapperSize = className.split(' ').filter((c) => c.startsWith('w-') || c.startsWith('h-') || c.startsWith('aspect-') || c.startsWith('rounded')).join(' ');

  return (
    <div className={`relative overflow-hidden bg-slate-100 dark:bg-charcoal-800 ${wrapperSize}`} id={id ? `${id}-wrapper` : undefined}>
      {!isLoaded && <div className="absolute inset-0 bg-slate-200/70 dark:bg-charcoal-700" />}
      <img
        src={chain[Math.min(step, chain.length - 1)]}
        alt={alt}
        id={id}
        loading="lazy"
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          if (step < chain.length - 1) setStep(step + 1);
          else setIsLoaded(true);
        }}
        className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};
