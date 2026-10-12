import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, Instagram, Facebook, Youtube, Share2, X } from 'lucide-react';

interface SocialItem {
  name: string;
  icon: React.ComponentType<any>;
  url: string;
  color: string;
  hoverBg: string;
  badge?: string;
  isPrimary?: boolean;
}

const SOCIAL_ITEMS: SocialItem[] = [
  {
    name: 'WhatsApp',
    icon: MessageCircle,
    url: 'https://wa.me/919494994949',
    color: 'bg-emerald-500 text-white',
    hoverBg: 'hover:bg-emerald-600',
    badge: 'Quick Chat',
    isPrimary: true,
  },
  {
    name: 'Instagram',
    icon: Instagram,
    url: 'https://instagram.com/biocart_organic',
    color: 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white',
    hoverBg: 'hover:opacity-90',
  },
  {
    name: 'Facebook',
    icon: Facebook,
    url: 'https://facebook.com/biocart',
    color: 'bg-blue-600 text-white',
    hoverBg: 'hover:bg-blue-700',
  },
  {
    name: 'YouTube',
    icon: Youtube,
    url: 'https://youtube.com/biocart',
    color: 'bg-rose-600 text-white',
    hoverBg: 'hover:bg-rose-700',
  },
];

export const FloatingSocials: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div 
      ref={containerRef}
      className="fixed right-4 bottom-20 sm:bottom-6 z-40 flex flex-col items-end select-none" 
      id="floating-socials-bar"
    >
      {/* Expandable Compact Popover Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 15 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="mb-3 p-3.5 bg-white/95 dark:bg-charcoal-900/95 backdrop-blur-md border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-2xl flex flex-col gap-2.5 min-w-[200px]"
            role="dialog"
            aria-label="Connect with BioCart on Social Media"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-150 dark:border-white/5 px-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-charcoal-700 dark:text-slate-200">
                Connect With Us
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                aria-label="Close social panel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              {SOCIAL_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.name}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-charcoal-800/60 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 group"
                    id={`social-link-${item.name.toLowerCase()}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg ${item.color} ${item.hoverBg} shadow-sm group-hover:scale-105 transition-transform`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-semibold text-charcoal-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {item.name}
                      </span>
                    </div>
                    {item.badge && (
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        {item.badge}
                      </span>
                    )}
                  </a>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative group p-3.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl hover:shadow-2xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-emerald-500/30 flex items-center justify-center cursor-pointer active:scale-95"
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close social channels" : "Open social channels"}
        id="floating-social-toggle-button"
      >
        <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-20 pointer-events-none" />
        {isOpen ? (
          <X className="w-6 h-6 transition-transform rotate-0" />
        ) : (
          <Share2 className="w-6 h-6 transition-transform" />
        )}
        <span className="sr-only">Social media links</span>
      </button>
    </div>
  );
};
