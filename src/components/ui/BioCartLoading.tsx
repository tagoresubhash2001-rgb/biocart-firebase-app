import React from 'react';
import { BioCartLogo } from './BioCartLogo';

interface BioCartLoadingProps {
  message?: string;
  subMessage?: string;
  fullscreen?: boolean;
}

export const BioCartLoading: React.FC<BioCartLoadingProps> = ({
  message = 'Loading BioCart Control Center...',
  subMessage = 'Synchronizing real-time catalog & settings',
  fullscreen = false
}) => {
  const content = (
    <div className="flex flex-col items-center justify-center p-8 text-center select-none">
      <div className="relative mb-4 flex items-center justify-center">
        {/* Subtle breathing glow */}
        <div className="absolute -inset-3 bg-emerald-100 rounded-full blur-md opacity-70 animate-pulse" />
        <BioCartLogo size="md" className="relative z-10" />
      </div>

      {/* Progress pill indicator */}
      <div className="w-36 h-1.5 bg-slate-100 rounded-full overflow-hidden mb-3 border border-slate-200">
        <div className="h-full bg-emerald-600 rounded-full w-2/5 animate-[pulse_1.5s_ease-in-out_infinite]" />
      </div>

      <p className="text-xs font-semibold text-slate-800 tracking-tight">{message}</p>
      {subMessage && (
        <p className="text-[11px] text-slate-400 mt-0.5">{subMessage}</p>
      )}
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-white/95 backdrop-blur-sm flex items-center justify-center">
        {content}
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 my-4 flex items-center justify-center min-h-[220px]">
      {content}
    </div>
  );
};
