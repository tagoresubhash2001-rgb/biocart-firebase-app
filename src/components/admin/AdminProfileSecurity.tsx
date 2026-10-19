import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../context/AppContext';
import { AuthService } from '../../services/AuthService';
import { AdminService } from '../../services/AdminService';
import {
  User,
  Mail,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  Save,
  RotateCcw
} from 'lucide-react';

export const AdminProfileSecurity: React.FC = () => {
  const { firebaseUser, userProfile } = useAuth();
  const { addToast } = useApp();

  // Profile Details State
  const [displayName, setDisplayName] = useState(userProfile?.name || firebaseUser?.displayName || '');
  const [photoURL, setPhotoURL] = useState(userProfile?.photoURL || firebaseUser?.photoURL || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Email Change State
  const [newEmail, setNewEmail] = useState('');
  const [emailCurrentPassword, setEmailCurrentPassword] = useState('');
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Forgot Password Reset
  const [isSendingReset, setIsSendingReset] = useState(false);

  const actor = {
    id: userProfile?.uid || firebaseUser?.uid || 'admin',
    email: userProfile?.email || firebaseUser?.email || 'admin@biocart.in'
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      addToast('Display name cannot be empty', 'warning');
      return;
    }
    setIsUpdatingProfile(true);
    try {
      await AuthService.updateAdminProfile(displayName, photoURL);
      await AdminService.logAuditAction(
        actor.id,
        actor.email,
        `Updated Administrator Profile name to "${displayName.trim()}"`,
        'user',
        actor.id
      );
      addToast('Profile details updated successfully', 'success');
    } catch (err: any) {
      addToast(err?.message || 'Failed to update profile', 'warning');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !/^\S+@\S+\.\S+$/.test(newEmail)) {
      addToast('Please enter a valid new email address', 'warning');
      return;
    }
    if (newEmail.trim().toLowerCase() === firebaseUser?.email?.toLowerCase()) {
      addToast('New email must be different from current email', 'warning');
      return;
    }
    setIsUpdatingEmail(true);
    try {
      await AuthService.updateAdminEmail(emailCurrentPassword, newEmail.trim());
      await AdminService.logAuditAction(
        actor.id,
        actor.email,
        `Requested Administrator Email change to "${newEmail.trim()}"`,
        'user',
        actor.id
      );
      addToast(`Verification link sent to ${newEmail}. Please confirm via email to finalize login ID update.`, 'success');
      setNewEmail('');
      setEmailCurrentPassword('');
    } catch (err: any) {
      addToast(err?.message || 'Failed to update email. Please verify current password.', 'warning');
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      addToast('New password must be at least 6 characters', 'warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast('New passwords do not match', 'warning');
      return;
    }
    setIsUpdatingPassword(true);
    try {
      await AuthService.changePassword(currentPassword, newPassword);
      await AdminService.logAuditAction(
        actor.id,
        actor.email,
        'Changed Administrator Password',
        'user',
        actor.id
      );
      addToast('Password changed successfully!', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      addToast(err?.message || 'Failed to change password. Please verify current password.', 'warning');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleSendPasswordReset = async () => {
    if (!firebaseUser?.email) {
      addToast('No current email associated with session', 'warning');
      return;
    }
    setIsSendingReset(true);
    try {
      await AuthService.resetPassword(firebaseUser.email);
      await AdminService.logAuditAction(
        actor.id,
        actor.email,
        `Sent Password Reset email to ${firebaseUser.email}`,
        'user',
        actor.id
      );
      addToast(`Password reset link sent to ${firebaseUser.email}`, 'success');
    } catch (err: any) {
      addToast(err?.message || 'Failed to send password reset', 'warning');
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Identity & Profile Information */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-sm text-slate-900">Administrator Profile & Identity</h3>
          </div>
          <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold uppercase">
            {userProfile?.role || 'admin'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-slate-600 mb-1 font-medium">Unique Account UID (Immutable)</label>
            <input
              type="text"
              readOnly
              value={userProfile?.uid || firebaseUser?.uid || '—'}
              className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-mono text-[11px] cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-slate-600 mb-1 font-medium">Account Status</label>
            <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="capitalize font-semibold">{userProfile?.status || 'Active'}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 mb-1 font-semibold">Display Name *</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Tagore Subhash"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 mb-1 font-semibold">Profile Avatar URL (Optional)</label>
              <input
                type="url"
                value={photoURL}
                onChange={(e) => setPhotoURL(e.target.value)}
                placeholder="https://..."
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-[11px] font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isUpdatingProfile}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm flex items-center gap-2 text-xs transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {isUpdatingProfile ? 'Saving Profile...' : 'Save Profile Details'}
            </button>
          </div>
        </form>
      </div>

      {/* 2. Change Login Email / Identifier */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Mail className="w-5 h-5 text-emerald-600" />
          <div>
            <h3 className="font-semibold text-sm text-slate-900">Change Administrator Login ID / Email</h3>
            <p className="text-[11px] text-slate-500">Requires reauthentication with current credentials and inbox confirmation</p>
          </div>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
          <span className="font-semibold text-slate-900">Current Login Email: </span>
          <span className="font-mono text-emerald-700 font-bold">{firebaseUser?.email || userProfile?.email || '—'}</span>
        </div>

        <form onSubmit={handleUpdateEmail} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 mb-1 font-semibold">New Email Address *</label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="newadmin@biocart.in"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 mb-1 font-semibold">Current Password for Verification *</label>
              <div className="relative">
                <input
                  type={showEmailPassword ? 'text' : 'password'}
                  required
                  value={emailCurrentPassword}
                  onChange={(e) => setEmailCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full p-2.5 pr-10 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowEmailPassword(!showEmailPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showEmailPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isUpdatingEmail}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm flex items-center gap-2 text-xs transition-colors cursor-pointer"
            >
              <Mail className="w-4 h-4" />
              {isUpdatingEmail ? 'Sending Verification...' : 'Send Email Verification Link'}
            </button>
          </div>
        </form>
      </div>

      {/* 3. Password Management & Security */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="font-semibold text-sm text-slate-900">Change Account Password</h3>
              <p className="text-[11px] text-slate-500">Ensure password has at least 6 characters with mixed letters and numbers</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSendPasswordReset}
            disabled={isSendingReset}
            className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {isSendingReset ? 'Sending...' : 'Send Password Reset Email'}
          </button>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 mb-1 font-semibold">Current Password *</label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Current password"
                  className="w-full p-2.5 pr-10 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 mb-1 font-semibold">New Password *</label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full p-2.5 pr-10 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 mb-1 font-semibold">Confirm New Password *</label>
              <input
                type={showNewPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isUpdatingPassword}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm flex items-center gap-2 text-xs transition-colors cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              {isUpdatingPassword ? 'Updating Password...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
