'use client';

import React, { useState } from 'react';
import {
  KeyRound,
  X,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';
import { ChangePasswordFormData } from '@/types/admin';

interface ChangePasswordModalProps {
  isOpen: boolean;
  currentUser: { email?: string; id?: string } | null;
  changePasswordData: ChangePasswordFormData;
  setChangePasswordData: React.Dispatch<React.SetStateAction<ChangePasswordFormData>>;
  isChangingPassword: boolean;
  changePasswordError: string | null;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function ChangePasswordModal({
  isOpen,
  currentUser,
  changePasswordData,
  setChangePasswordData,
  isChangingPassword,
  changePasswordError,
  onClose,
  onSubmit,
}: ChangePasswordModalProps) {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md p-4 sm:p-6 flex items-center justify-center animate-fadeIn"
      onClick={() => !isChangingPassword && onClose()}
    >
      <div
        data-lenis-prevent="true"
        onWheel={(e) => e.stopPropagation()}
        className="w-full max-w-md my-auto bg-[#16161b] text-white rounded-3xl border border-white/10 shadow-2xl p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-xl uppercase tracking-tight text-white">
                Change Password
              </h3>
              <p className="text-xs text-neutral-400">
                Update credentials for {currentUser?.email}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isChangingPassword}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error banner */}
        {changePasswordError && (
          <div className="mb-5 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start gap-2.5 animate-fadeIn">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <span>{changePasswordError}</span>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Current Password */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-1.5">
              Current Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                required
                value={changePasswordData.currentPassword}
                onChange={(e) =>
                  setChangePasswordData((prev) => ({ ...prev, currentPassword: e.target.value }))
                }
                placeholder="Enter current password"
                className="w-full bg-[#1b1b22] border border-white/10 rounded-2xl pl-10 pr-11 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-white/40 font-sans"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-1.5">
              New Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
              <input
                type={showNewPassword ? 'text' : 'password'}
                required
                value={changePasswordData.newPassword}
                onChange={(e) =>
                  setChangePasswordData((prev) => ({ ...prev, newPassword: e.target.value }))
                }
                placeholder="Minimum 6 characters"
                className="w-full bg-[#1b1b22] border border-white/10 rounded-2xl pl-10 pr-11 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-white/40 font-sans"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={changePasswordData.confirmPassword}
                onChange={(e) =>
                  setChangePasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))
                }
                placeholder="Re-enter new password"
                className="w-full bg-[#1b1b22] border border-white/10 rounded-2xl pl-10 pr-11 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-white/40 font-sans"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-white/10 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isChangingPassword}
              className="px-5 py-2.5 rounded-xl border border-white/15 text-neutral-300 hover:text-white text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isChangingPassword}
              className="px-5 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black font-semibold text-xs uppercase tracking-wider transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
            >
              {isChangingPassword && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>{isChangingPassword ? 'Saving...' : 'Save New Password'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
