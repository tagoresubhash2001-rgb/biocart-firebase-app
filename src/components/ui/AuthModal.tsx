import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { X, Mail, Lock, User, ArrowRight, Phone, ArrowLeft } from 'lucide-react';
import { BioCartLogo } from './BioCartLogo';
import { RecaptchaVerifier, ConfirmationResult } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { AuthService } from '../../services/AuthService';
import { normalizeError } from '../../utils/errors';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    setAuthModalOpen,
    authModalMode,
    setAuthModalMode,
    login,
    loginWithGoogleProvider,
    addToast
  } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phoneMode, setPhoneMode] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [phoneBusy, setPhoneBusy] = useState(false);
  const recaptcha = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => () => recaptcha.current?.clear(), []);

  if (!isAuthModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (authModalMode === 'login') {
      if (!email || !password) {
        addToast('Please enter your email and password', 'warning');
        return;
      }
      login(email, name || 'Tagore Subhash', password);
    } else if (authModalMode === 'register') {
      if (!email || !name || !password) {
        addToast('Please fill all required fields, including password', 'warning');
        return;
      }
      login(email, name, password);
    } else {
      if (!email) {
        addToast('Please enter your registered email address', 'warning');
        return;
      }
      login(email, '', undefined);
      setAuthModalMode('login');
    }
  };

  const handleSendPhoneCode = async () => {
    const normalizedPhone = phoneNumber.replace(/[\s()-]/g, '');
    if (!/^\+[1-9]\d{7,14}$/.test(normalizedPhone)) {
      addToast('Enter your phone with country code, for example +91 9876543210.', 'warning');
      return;
    }
    setPhoneBusy(true);
    try {
      if (!recaptcha.current) {
        recaptcha.current = new RecaptchaVerifier(auth, 'phone-recaptcha-container', { size: 'normal' });
      }
      const result = await AuthService.sendPhoneCode(normalizedPhone, recaptcha.current);
      setConfirmation(result);
      addToast('OTP sent. Standard SMS charges may apply.', 'info');
    } catch (error) {
      recaptcha.current?.clear();
      recaptcha.current = null;
      addToast(normalizeError(error).message, 'warning');
    } finally {
      setPhoneBusy(false);
    }
  };

  const handleVerifyPhoneCode = async () => {
    if (!confirmation || !/^\d{6}$/.test(verificationCode)) {
      addToast('Enter the 6-digit code sent to your phone.', 'warning');
      return;
    }
    setPhoneBusy(true);
    try {
      await confirmation.confirm(verificationCode);
      setAuthModalOpen(false);
      addToast('Phone verified and signed in.', 'success');
    } catch (error) {
      addToast(normalizeError(error).message, 'warning');
    } finally {
      setPhoneBusy(false);
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
          onClick={() => setAuthModalOpen(false)}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 250 }}
          className="relative w-full max-w-md bg-white dark:bg-charcoal-900 rounded-3xl p-8 shadow-2xl border border-black/5 dark:border-white/10 overflow-hidden z-10"
          id="auth-modal-card"
        >
          {/* Top Leaf Accent Decorator */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-nature-700 rounded-b-full" />

          {/* Close Button */}
          <button
            onClick={() => setAuthModalOpen(false)}
            className="absolute top-6 right-6 p-2 text-charcoal-500 hover:text-charcoal-900 dark:hover:text-white rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            id="auth-close-btn"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center mb-8" id="auth-modal-header">
            <div className="mb-4">
              <BioCartLogo size="md" showTagline={false} />
            </div>
            <h3 className="font-display font-bold text-2xl text-nature-900 dark:text-nature-400">
              {authModalMode === 'login' && 'Welcome to BioCart'}
              {authModalMode === 'register' && 'Begin Healthy Life'}
              {authModalMode === 'forgot' && 'Reset Secure Access'}
            </h3>
            <p className="text-sm text-charcoal-500 dark:text-slate-400 text-center mt-1">
              {authModalMode === 'login' && 'Sign in to manage your sustainable garden items'}
              {authModalMode === 'register' && 'Join Sindulis Agro Products Premium D2C Experience'}
              {authModalMode === 'forgot' && 'Type email to dispatch instant secure reset credentials'}
            </p>
          </div>

          {!phoneMode && <form onSubmit={handleSubmit} className="space-y-4" id="auth-form">
            {authModalMode === 'register' && (
              <div className="space-y-1.5" id="register-name-group">
                <label className="text-xs font-semibold text-charcoal-700 dark:text-slate-300">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-charcoal-400" />
                  <input
                    type="text"
                    required
                    placeholder="Tagore Subhash"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-charcoal-800 text-charcoal-950 dark:text-white border border-slate-200/60 dark:border-white/10 rounded-xl focus:border-nature-600 focus:outline-none transition-colors text-sm"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5" id="auth-email-group">
              <label className="text-xs font-semibold text-charcoal-700 dark:text-slate-300">
                {authModalMode === 'login' ? 'Email Address' : 'Email Address'}
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
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#004643] hover:bg-[#003532] text-white rounded-xl font-bold shadow-md transition-all cursor-pointer hover:scale-[1.02] active:scale-95 duration-200 shadow-[#004643]/30 !text-white"
              id="auth-submit-btn"
            >
              <span className="!text-white font-semibold">
                {authModalMode === 'login' && 'Sign In'}
                {authModalMode === 'register' && 'Register Now'}
                {authModalMode === 'forgot' && 'Send Reset Instructions'}
              </span>
              <ArrowRight className="w-4 h-4 text-white" />
            </button>
          </form>}

          {phoneMode && (
            <div className="space-y-4" id="phone-auth-form">
              <div className="space-y-1.5">
                <label htmlFor="auth-phone-number" className="text-xs font-semibold text-charcoal-700 dark:text-slate-300">Mobile number with country code</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-charcoal-400" />
                  <input id="auth-phone-number" type="tel" autoComplete="tel" placeholder="+91 98765 43210" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-charcoal-800 text-charcoal-950 dark:text-white border border-slate-200/60 dark:border-white/10 rounded-xl focus:border-nature-600 focus:outline-none transition-colors text-sm" />
                </div>
              </div>
              <div id="phone-recaptcha-container" />
              {!confirmation ? (
                <button type="button" disabled={phoneBusy} onClick={handleSendPhoneCode} className="w-full py-3 bg-[#004643] hover:bg-[#003532] disabled:opacity-60 text-white rounded-xl font-bold">
                  {phoneBusy ? 'Sending code…' : 'Send OTP'}
                </button>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label htmlFor="auth-phone-code" className="text-xs font-semibold text-charcoal-700 dark:text-slate-300">6-digit verification code</label>
                    <input id="auth-phone-code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="123456" value={verificationCode} onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))} className="w-full px-4 py-3 bg-slate-50 dark:bg-charcoal-800 text-charcoal-950 dark:text-white border border-slate-200/60 dark:border-white/10 rounded-xl focus:border-nature-600 focus:outline-none transition-colors text-sm" />
                  </div>
                  <button type="button" disabled={phoneBusy} onClick={handleVerifyPhoneCode} className="w-full py-3 bg-[#004643] hover:bg-[#003532] disabled:opacity-60 text-white rounded-xl font-bold">
                    {phoneBusy ? 'Verifying…' : 'Verify OTP and Sign In'}
                  </button>
                  <button type="button" onClick={() => { setConfirmation(null); setVerificationCode(''); recaptcha.current?.clear(); recaptcha.current = null; }} className="w-full text-sm text-nature-700 hover:underline">Change phone number / resend</button>
                </>
              )}
              <p className="text-xs text-center text-charcoal-500">Firebase uses your phone number for verification and abuse prevention. SMS charges may apply.</p>
            </div>
          )}

          {authModalMode === 'login' && !phoneMode && (
            <>
              <div className="flex items-center gap-3 my-5 text-xs text-charcoal-400">
                <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
                <span>or sign in with</span>
                <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
              </div>
              <button
                type="button"
                onClick={() => loginWithGoogleProvider()}
                className="w-full flex items-center justify-center gap-3 py-3 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold text-charcoal-800 dark:text-white hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                id="google-sign-in-btn"
              >
                <span aria-hidden="true" className="font-bold text-base">G</span>
                Continue with Google
              </button>
              <button type="button" onClick={() => { setPhoneMode(true); setConfirmation(null); setVerificationCode(''); }} className="w-full mt-3 flex items-center justify-center gap-2 py-3 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold text-charcoal-800 dark:text-white hover:bg-slate-50 dark:hover:bg-white/5 transition-colors" id="phone-sign-in-btn">
                <Phone className="w-4 h-4" /> Sign in with mobile OTP
              </button>
            </>
          )}

          {phoneMode && <button type="button" onClick={() => { setPhoneMode(false); setConfirmation(null); setVerificationCode(''); recaptcha.current?.clear(); recaptcha.current = null; }} className="w-full mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-nature-700 hover:underline"><ArrowLeft className="w-4 h-4" /> Back to email sign-in</button>}

          <div className="h-[1px] bg-slate-100 dark:bg-white/5 my-6" />

          <div className="flex items-center justify-center gap-2 text-sm text-charcoal-500 dark:text-slate-400" id="auth-modal-footer">
            <span>
              {authModalMode === 'login' && "Don't have an account?"}
              {authModalMode === 'register' && 'Already have an account?'}
              {authModalMode === 'forgot' && 'Remember credentials?'}
            </span>
            <button
              type="button"
              onClick={() => {
                if (authModalMode === 'login') setAuthModalMode('register');
                else setAuthModalMode('login');
              }}
              className="font-semibold text-nature-700 hover:text-nature-600 dark:text-nature-400 dark:hover:text-nature-300 cursor-pointer"
              id="auth-toggle-mode"
            >
              {authModalMode === 'login' && 'Register'}
              {authModalMode === 'register' && 'Sign In'}
              {authModalMode === 'forgot' && 'Back to Sign In'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
