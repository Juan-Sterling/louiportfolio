'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkRecoverySession() {
      if (!isSupabaseConfigured || !supabase) {
        if (isMounted) {
          setErrorMessage('Supabase is not configured on this server.');
          setIsVerifying(false);
        }
        return;
      }

      try {
        // 1. If PKCE code is in query string, exchange it
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const code = params.get('code');
          if (code) {
            try {
              const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
              if (exchangeErr) {
                console.warn('PKCE exchange error:', exchangeErr.message);
              }
            } catch (err) {
              console.warn('PKCE exchange exception:', err);
            }
          }
        }

        // 2. Check current session or URL hash (Supabase implicit flow automatically parses hash)
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          if (isMounted) {
            setIsAuthorized(true);
            setIsVerifying(false);
          }
          return;
        }

        // 3. Fallback: Check if URL hash has access_token or type=recovery
        if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
          if (isMounted) {
            setIsAuthorized(true);
            setIsVerifying(false);
          }
          return;
        }

        // If no session found after a brief wait for auth listener
        setTimeout(() => {
          if (isMounted && !isAuthorized) {
            setIsVerifying(false);
          }
        }, 1200);
      } catch (err) {
        console.warn('Session verification notice:', err);
        if (isMounted) setIsVerifying(false);
      }
    }

    checkRecoverySession();

    if (supabase) {
      const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY' || (session?.user && isMounted)) {
          setIsAuthorized(true);
          setIsVerifying(false);
        }
      });

      return () => {
        isMounted = false;
        authListener.subscription.unsubscribe();
      };
    }

    return () => {
      isMounted = false;
    };
  }, [isAuthorized]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('New password and confirmation password do not match.');
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setErrorMessage('Authentication service is not configured.');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      setIsSuccess(true);

      // Auto redirect to admin dashboard after 2.5 seconds
      setTimeout(() => {
        router.replace('/admin');
      }, 2500);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || 'Failed to update password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0d] text-[#ececee] flex flex-col justify-between p-6 sm:p-10 relative overflow-hidden isolate select-none">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-white/[0.03] rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-emerald-500/[0.04] rounded-full blur-[120px] pointer-events-none -z-10" />

      {/* Top Bar Navigation */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between">
        <Link
          href="/admin/login"
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-400 hover:text-white transition-all hover:-translate-x-0.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Login</span>
        </Link>

        <div className="flex items-center gap-2 text-[11px] font-mono text-neutral-400 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Security Recovery</span>
        </div>
      </header>

      {/* Main Card */}
      <main className="w-full max-w-md mx-auto my-auto py-10">
        <div className="bg-[#131317]/90 backdrop-blur-2xl border border-white/10 rounded-[32px] p-8 sm:p-10 shadow-[0_25px_60px_rgba(0,0,0,0.6)]">
          {/* Brand & Heading */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-white/10 text-emerald-400 font-heading font-black text-2xl flex items-center justify-center mx-auto mb-4 shadow-xl border border-white/10">
              <KeyRound className="w-6 h-6" />
            </div>
            <h1 className="font-heading font-black text-3xl uppercase tracking-tight text-white mb-2">
              Set New Password
            </h1>
            <p className="text-xs text-neutral-400 leading-relaxed font-sans max-w-xs mx-auto">
              Create a strong new password for your LOUI portfolio admin account.
            </p>
          </div>

          {/* Verifying Session Spinner */}
          {isVerifying ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <RefreshCw className="w-7 h-7 text-neutral-400 animate-spin mb-3" />
              <p className="text-xs font-mono text-neutral-400 uppercase tracking-widest">
                Validating recovery link...
              </p>
            </div>
          ) : isSuccess ? (
            /* Success State */
            <div className="text-center py-6 animate-fadeIn space-y-5">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-xl text-white mb-1">
                  Password Updated!
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                  Your password has been changed successfully. Redirecting to admin dashboard...
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.replace('/admin')}
                className="w-full py-3.5 px-6 rounded-2xl bg-white hover:bg-neutral-200 text-black font-semibold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
              >
                <span>Go to Admin Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : !isAuthorized ? (
            /* Link Invalid or Expired */
            <div className="text-center py-6 animate-fadeIn space-y-5">
              <div className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
                <AlertCircle className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg text-white mb-1">
                  Recovery Link Expired or Invalid
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                  This password reset link is invalid, expired, or has already been used. Please request a new link from the login page.
                </p>
              </div>
              <Link
                href="/admin/login"
                className="w-full py-3.5 px-6 rounded-2xl bg-white hover:bg-neutral-200 text-black font-semibold text-xs uppercase tracking-wider transition-all inline-flex items-center justify-center gap-2"
              >
                <span>Back to Login & Request Link</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            /* New Password Form */
            <>
              {errorMessage && (
                <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start gap-3 animate-fadeIn leading-relaxed">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* New Password */}
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      autoComplete="new-password"
                      className="w-full bg-[#1b1b22] border border-white/10 rounded-2xl pl-11 pr-12 py-3.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/40 transition-all font-sans"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors"
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      autoComplete="new-password"
                      className="w-full bg-[#1b1b22] border border-white/10 rounded-2xl pl-11 pr-12 py-3.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/40 transition-all font-sans"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-4 px-6 rounded-2xl bg-white hover:bg-neutral-200 text-black font-semibold text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 shadow-xl hover:shadow-2xl disabled:opacity-60 disabled:cursor-not-allowed group active:scale-[0.99]"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <span>Save New Password</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          {/* Security Notice */}
          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-[11px] text-neutral-500 font-sans leading-relaxed">
              Your password update will apply immediately across all active admin sessions.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto text-center text-xs text-neutral-600 font-mono">
        LOUI Portfolio &copy; {new Date().getFullYear()} — All rights reserved.
      </footer>
    </div>
  );
}
