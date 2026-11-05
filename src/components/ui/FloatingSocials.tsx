import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, Instagram, Facebook, Youtube, Share2, X } from 'lucide-react';
import { BUSINESS_CONFIG } from '../../config/businessConfig';

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
    url: BUSINESS_CONFIG.contact.whatsappUrl,
    color: 'bg-emerald-500 text-white',
    hoverBg: 'hover:bg-emerald-600',
    badge: 'Quick Chat',
    isPrimary: true,
  },
  {
    name: 'Instagram',
    icon: Instagram,
    url: BUSINESS_CONFIG.contact.instagramUrl,
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

  const primaryItem = SOCIAL_ITEMS[0]; // WhatsApp

  return (
    <div
      ref={containerRef}
      className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 print:hidden"
      aria-label="Social contact channels"
    >
      {/* Expanded Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 15 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="flex flex-col gap-2.5 mb-1"
          >
            {SOCIAL_ITEMS.map((item, idx) => (
              <motion.a
                key={item.name}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: (SOCIAL_ITEMS.length - 1 - idx) * 0.04 }}
                className={`flex items-center gap-3 px-3.5 py-2 rounded-full shadow-lg ${item.color} ${item.hoverBg} transition-all duration-200 group text-xs font-semibold cursor-pointer`}
                aria-label={`Connect with us on ${item.name}`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">{item.name}</span>
                {item.badge && (
                  <span className="text-[10px] bg-white/20 backdrop-blur-sm px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold">
                    {item.badge}
                  </span>
                )}
              </motion.a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Trigger Floating Buttons */}
      <div className="flex items-center gap-2">
        {/* Quick WhatsApp Button */}
        <a
          href={primaryItem.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative flex items-center justify-center w-13 h-13 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl hover:shadow-emerald-500/30 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
          aria-label="Direct WhatsApp Support"
        >
          <primaryItem.icon className="w-6 h-6" />
          <span className="absolute right-full mr-3 px-2.5 py-1 rounded-lg bg-charcoal-900 text-white text-[11px] font-medium whitespace-nowrap shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            Chat on WhatsApp
          </span>
          {/* Subtle pulse ring */}
          <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-20 pointer-events-none" />
        </a>

        {/* Toggle Hub Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center justify-center w-11 h-11 rounded-full shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer ${
            isOpen
              ? 'bg-charcoal-900 text-white hover:bg-charcoal-800'
              : 'bg-white dark:bg-charcoal-800 text-charcoal-700 dark:text-white border border-slate-200 dark:border-white/10 hover:border-emerald-500'
          }`}
          aria-label={isOpen ? 'Close social channels' : 'Open social channels'}
          aria-expanded={isOpen}
        >
          {isOpen ? <X className="w-5 h-5" /> : <Share2 className="w-4.5 h-4.5" />}
        </button>
      </div>
    </div>
  );
};
