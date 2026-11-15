import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { AuthService, ConfirmationResult } from '../../services/AuthService';
import { X, Mail, Lock, User, ArrowRight, Phone, ArrowLeft, RefreshCw } from 'lucide-react';
import { BioCartLogo } from './BioCartLogo';

const GoogleGLogo: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

const COUNTRY_CODES = [
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+1', country: 'United States', flag: '🇺🇸' },
  { code: '+44', country: 'United Kingdom', flag: '🇬🇧' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
];

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    setAuthModalOpen,
    authModalMode,
    setAuthModalMode,
    login,
    loginWithGoogleProvider,
    sendPhoneOtp,
    verifyPhoneOtp,
    addToast
  } = useApp();

  const { isAuthenticated } = useAuth();

  // Email / Password Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  // Mobile OTP Form State
  const [phoneStep, setPhoneStep] = useState<'input' | 'verify'>('input');
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Close modal and cleanup
  const handleClose = () => {
    AuthService.clearRecaptcha();
    setPhoneStep('input');
    setPhoneNumber('');
    setOtpCode('');
    setCountdown(0);
    setConfirmationResult(null);
    setPhoneError(null);
    setAuthModalOpen(false);
  };

  // Auto-close on successful authentication
  useEffect(() => {
    if (isAuthenticated && isAuthModalOpen) {
      handleClose();
    }
  }, [isAuthenticated, isAuthModalOpen]);

  // Clean up recaptcha on unmount
  useEffect(() => {
    return () => {
      AuthService.clearRecaptcha();
    };
  }, []);

  // Cooldown countdown timer
  useEffect(() => {
    let timer: any;
    if (phoneStep === 'verify' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [phoneStep, countdown]);

  if (!isAuthModalOpen) return null;

  // Handle Email & Password submissions
  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (authModalMode === 'login') {
      if (!email || !password) {
        addToast('Please enter your email and password', 'warning');
        return;
      }
      login(email, name, password);
    } else if (authModalMode === 'register') {
      if (!email || !name || !password) {
        addToast('Please fill all required fields, including password', 'warning');
        return;
      }
      login(email, name, password);
    } else if (authModalMode === 'forgot') {
      if (!email) {
        addToast('Please enter your registered email address', 'warning');
        return;
      }
      login(email, '', undefined);
      setAuthModalMode('login');
    }
  };

  // Handle Send OTP
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSendingOtp) return; // Prevent duplicate concurrent requests
    setPhoneError(null);

    const rawClean = phoneNumber.replace(/[\s\-\(\)]/g, '');
    let cleanNumber = rawClean;

    if (countryCode === '+91') {
      cleanNumber = cleanNumber.replace(/^0+/, ''); // Strip leading 0 common in Indian dialing
      if (!/^[6-9]\d{9}$/.test(cleanNumber)) {
        setPhoneError('Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
        return;
      }
    } else {
      if (cleanNumber.length < 7 || cleanNumber.length > 15) {
        setPhoneError('Please enter a valid phone number with country code (7 to 15 digits).');
        return;
      }
    }

    const fullPhone = `${countryCode}${cleanNumber}`;
    setIsSendingOtp(true);
    try {
      const confirmation = await sendPhoneOtp(fullPhone, 'recaptcha-container');
      setConfirmationResult(confirmation);
      setPhoneStep('verify');
      setCountdown(60);
      addToast(`OTP dispatched via SMS to ${fullPhone}`, 'success');
    } catch (err: any) {
      const msg = err?.message || 'Failed to send OTP. Please check the number and try again.';
      setPhoneError(msg);
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Handle Resend OTP
  const handleResendOtp = async () => {
    if (countdown > 0 || isSendingOtp) return;
    setPhoneError(null);
    await handleSendOtp();
  };

  // Handle Verify OTP
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isVerifyingOtp) return; // Prevent duplicate clicks
    setPhoneError(null);

    const cleanCode = otpCode.trim().replace(/\D/g, '');
    if (cleanCode.length !== 6) {
      setPhoneError('Please enter the full 6-digit verification code.');
      return;
    }

    if (!confirmationResult) {
      setPhoneError('Verification session has expired. Please request a new OTP.');
      setPhoneStep('input');
      return;
    }

    setIsVerifyingOtp(true);
    try {
      await verifyPhoneOtp(confirmationResult, cleanCode);
      addToast('Phone verification successful! Welcome to BioCart.', 'success');
      handleClose();
    } catch (err: any) {
      const msg = err?.message || 'Invalid verification code. Please check and try again.';
      setPhoneError(msg);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md" id="auth-modal-overlay">
        {/* Backdrop close click */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 cursor-pointer"
          onClick={handleClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 250 }}
          className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-charcoal-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-black/5 dark:border-white/10 z-10"
          id="auth-modal-card"
        >
          {/* Top Leaf Accent Decorator */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-nature-700 rounded-b-full" />

          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-6 right-6 p-2 text-charcoal-500 hover:text-charcoal-900 dark:hover:text-white rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            id="auth-close-btn"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex flex-col items-center mb-6" id="auth-modal-header">
            <div className="mb-3">
              <BioCartLogo size="md" showTagline={false} />
            </div>
            <h3 className="font-display font-bold text-2xl text-nature-900 dark:text-nature-400 text-center">
              {authModalMode === 'login' && 'Welcome to BioCart'}
              {authModalMode === 'register' && 'Begin Healthy Life'}
              {authModalMode === 'forgot' && 'Reset Secure Access'}
              {authModalMode === 'phone' && 'Mobile OTP Sign-In'}
            </h3>
            <p className="text-sm text-charcoal-500 dark:text-slate-400 text-center mt-1 px-2">
              {authModalMode === 'login' && 'Sign in to manage your sustainable garden items'}
              {authModalMode === 'register' && 'Join BioCart — the organic marketplace'}
              {authModalMode === 'forgot' && 'Type email to dispatch instant secure reset credentials'}
              {authModalMode === 'phone' && (phoneStep === 'input' 
                ? 'Enter your mobile number to receive a 6-digit verification code' 
                : `Enter the 6-digit code dispatched to ${countryCode} ${phoneNumber}`)}
            </p>
          </div>

          {/* PHONE OTP FLOW */}
          {authModalMode === 'phone' ? (
            <div className="space-y-4" id="phone-auth-container">
              {/* Invisible reCAPTCHA container - permanently mounted in phone container to allow Resend OTP */}
              <div id="recaptcha-container" className="my-1"></div>

              {phoneStep === 'input' ? (
                <form onSubmit={handleSendOtp} className="space-y-4" id="phone-input-form">
                  <div className="space-y-1.5" id="phone-input-group">
                    <label className="text-xs font-semibold text-charcoal-700 dark:text-slate-300">
                      Mobile Number
                    </label>
                    <div className="flex items-center bg-slate-50 dark:bg-charcoal-800 border border-slate-200/60 dark:border-white/10 rounded-xl overflow-hidden focus-within:border-nature-600 transition-colors">
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="bg-transparent text-sm font-semibold text-charcoal-900 dark:text-white py-3 pl-3 pr-1 border-r border-slate-200/60 dark:border-white/10 outline-none cursor-pointer"
                      >
                        {COUNTRY_CODES.map((c) => (
                          <option key={c.code} value={c.code} className="text-charcoal-900 bg-white">
                            {c.flag} {c.code}
                          </option>
                        ))}
                      </select>
                      <input
                        type="tel"
                        required
                        placeholder="98765 43210"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9\s-]/g, ''))}
                        className="w-full px-3 py-3 bg-transparent text-charcoal-950 dark:text-white border-0 focus:outline-none text-sm font-medium"
                        autoFocus
                      />
                    </div>
                  </div>

                  {phoneError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                      {phoneError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSendingOtp}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-[#004643] hover:bg-[#003532] disabled:opacity-60 text-white rounded-xl font-bold shadow-md transition-all cursor-pointer hover:scale-[1.01] active:scale-95 duration-200 shadow-[#004643]/30 !text-white"
                    id="send-otp-btn"
                  >
                    <span className="!text-white font-semibold">
                      {isSendingOtp ? 'Sending OTP via SMS...' : 'Send Verification Code'}
                    </span>
                    <ArrowRight className="w-4 h-4 text-white" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAuthModalMode('login');
                      setPhoneError(null);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-charcoal-500 hover:text-charcoal-800 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Sign in with Email & Password instead
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4" id="otp-verify-form">
                  <div className="flex items-center justify-between text-xs text-charcoal-600 dark:text-slate-300 bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-200/60 dark:border-white/10">
                    <span>Sent to: <strong className="text-nature-800 dark:text-nature-400 font-mono">{countryCode} {phoneNumber}</strong></span>
                    <button
                      type="button"
                      onClick={() => {
                        setPhoneStep('input');
                        setOtpCode('');
                        setPhoneError(null);
                      }}
                      className="text-xs font-semibold text-nature-700 hover:text-nature-600 dark:text-nature-400 underline cursor-pointer"
                    >
                      Change number
                    </button>
                  </div>

                  <div className="space-y-1.5" id="otp-code-group">
                    <label className="text-xs font-semibold text-charcoal-700 dark:text-slate-300">
                      6-Digit Verification Code
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        maxLength={6}
                        required
                        placeholder="••••••"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        className="w-full py-3.5 px-4 text-center tracking-[0.5em] font-mono text-lg font-bold bg-slate-50 dark:bg-charcoal-800 text-charcoal-950 dark:text-white border border-slate-200/60 dark:border-white/10 rounded-xl focus:border-nature-600 focus:outline-none transition-colors"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-charcoal-500 dark:text-slate-400 px-1">
                    <span>Didn't receive SMS code?</span>
                    {countdown > 0 ? (
                      <span className="font-semibold text-charcoal-400 dark:text-slate-500 font-mono">
                        Resend in {countdown}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={isSendingOtp}
                        className="font-semibold text-nature-700 hover:text-nature-600 dark:text-nature-400 dark:hover:text-nature-300 cursor-pointer flex items-center gap-1"
                      >
                        <RefreshCw className={`w-3 h-3 ${isSendingOtp ? 'animate-spin' : ''}`} />
                        Resend OTP
                      </button>
                    )}
                  </div>

                  {phoneError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                      {phoneError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isVerifyingOtp || otpCode.length < 6}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-[#004643] hover:bg-[#003532] disabled:opacity-60 text-white rounded-xl font-bold shadow-md transition-all cursor-pointer hover:scale-[1.01] active:scale-95 duration-200 shadow-[#004643]/30 !text-white"
                    id="verify-otp-btn"
                  >
                    <span className="!text-white font-semibold">
                      {isVerifyingOtp ? 'Verifying OTP...' : 'Verify & Sign In'}
                    </span>
                    <ArrowRight className="w-4 h-4 text-white" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAuthModalMode('login');
                      setPhoneError(null);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-charcoal-500 hover:text-charcoal-800 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Sign in with Email & Password instead
                  </button>
                </form>
              )}
            </div>
          ) : (
            /* EMAIL & PASSWORD FLOW */
            <>
              <form onSubmit={handleEmailSubmit} className="space-y-4" id="auth-form">
                {authModalMode === 'register' && (
                  <div className="space-y-1.5" id="register-name-group">
                    <label className="text-xs font-semibold text-charcoal-700 dark:text-slate-300">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-charcoal-400" />
                      <input
                        type="text"
                        required
                        placeholder="Your Full Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-charcoal-800 text-charcoal-950 dark:text-white border border-slate-200/60 dark:border-white/10 rounded-xl focus:border-nature-600 focus:outline-none transition-colors text-sm"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5" id="auth-email-group">
                  <label className="text-xs font-semibold text-charcoal-700 dark:text-slate-300">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-charcoal-400" />
                    <input
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-charcoal-800 text-charcoal-950 dark:text-white border border-slate-200/60 dark:border-white/10 rounded-xl focus:border-nature-600 focus:outline-none transition-colors text-sm"
                    />
                  </div>
                </div>

                {authModalMode !== 'forgot' && (
                  <div className="space-y-1.5" id="auth-password-group">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-charcoal-700 dark:text-slate-300">Password</label>
                      {authModalMode === 'login' && (
                        <button
                          type="button"
                          onClick={() => setAuthModalMode('forgot')}
                          className="text-xs font-semibold text-nature-700 hover:text-nature-600 dark:text-nature-400 dark:hover:text-nature-300 cursor-pointer"
                        >
                          Forgot?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-charcoal-400" />
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-charcoal-800 text-charcoal-950 dark:text-white border border-slate-200/60 dark:border-white/10 rounded-xl focus:border-nature-600 focus:outline-none transition-colors text-sm"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-3 bg-[#004643] hover:bg-[#003532] text-white rounded-xl font-bold shadow-md transition-all cursor-pointer hover:scale-[1.01] active:scale-95 duration-200 shadow-[#004643]/30 !text-white"
                  id="auth-submit-btn"
                >
                  <span className="!text-white font-semibold">
                    {authModalMode === 'login' && 'Sign In'}
                    {authModalMode === 'register' && 'Register Now'}
                    {authModalMode === 'forgot' && 'Send Reset Instructions'}
                  </span>
                  <ArrowRight className="w-4 h-4 text-white" />
                </button>
              </form>

              {/* SOCIAL / ALTERNATIVE SIGN-IN (LOGIN MODE ONLY) */}
              {authModalMode === 'login' && (
                <div className="space-y-3 mt-4" id="auth-alternative-options">
                  {/* Subtle OR Divider */}
                  <div className="relative my-3 flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200 dark:border-white/10" />
                    </div>
                    <span className="relative px-3 bg-white dark:bg-charcoal-900 text-xs font-semibold text-charcoal-400 uppercase tracking-wider">
                      OR
                    </span>
                  </div>

                  {/* Continue with Google Button */}
                  <button
                    type="button"
                    onClick={() => loginWithGoogleProvider()}
                    className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white hover:bg-slate-50 dark:bg-charcoal-800 dark:hover:bg-charcoal-700 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold text-charcoal-800 dark:text-white transition-all shadow-sm hover:shadow cursor-pointer"
                    id="google-sign-in-btn"
                  >
                    <GoogleGLogo className="w-5 h-5 flex-shrink-0" />
                    <span>Continue with Google</span>
                  </button>

                  {/* Sign in with Mobile OTP Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthModalMode('phone');
                      setPhoneStep('input');
                      setPhoneError(null);
                    }}
                    className="w-full flex items-center justify-center gap-2.5 py-3 px-4 bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200/80 dark:border-white/10 rounded-xl text-sm font-semibold text-nature-800 dark:text-nature-300 transition-all cursor-pointer"
                    id="phone-otp-switch-btn"
                  >
                    <Phone className="w-4.5 h-4.5 text-nature-700 dark:text-nature-400 flex-shrink-0" />
                    <span>Sign in with Mobile OTP</span>
                  </button>
                </div>
              )}
            </>
          )}

          <div className="h-[1px] bg-slate-100 dark:bg-white/5 my-5" />

          {/* Modal Footer Mode Switch */}
          <div className="flex items-center justify-center gap-2 text-sm text-charcoal-500 dark:text-slate-400" id="auth-modal-footer">
            <span>
              {authModalMode === 'login' && "Don't have an account?"}
              {authModalMode === 'register' && 'Already have an account?'}
              {authModalMode === 'forgot' && 'Remember credentials?'}
              {authModalMode === 'phone' && "Need a new account?"}
            </span>
            <button
              type="button"
              onClick={() => {
                if (authModalMode === 'login') setAuthModalMode('register');
                else if (authModalMode === 'register') setAuthModalMode('login');
                else if (authModalMode === 'forgot') setAuthModalMode('login');
                else setAuthModalMode('register');
              }}
              className="font-semibold text-nature-700 hover:text-nature-600 dark:text-nature-400 dark:hover:text-nature-300 cursor-pointer"
              id="auth-toggle-mode"
            >
              {authModalMode === 'login' && 'Register'}
              {authModalMode === 'register' && 'Sign In'}
              {authModalMode === 'forgot' && 'Back to Sign In'}
              {authModalMode === 'phone' && 'Register with Email'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
export default AuthModal;
