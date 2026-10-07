'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  KeyRound,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export default function AdminLoginPage() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<'login' | 'forgot'>('login');

  // Sign In State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState('');
  const [isForgotLoading, setIsForgotLoading] = useState(false);
  const [forgotErrorMessage, setForgotErrorMessage] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // If already logged in, redirect straight to /admin
  useEffect(() => {
    async function checkExistingSession() {
      if (!isSupabaseConfigured || !supabase) {
        setIsCheckingSession(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          router.replace('/admin');
          return;
        }
      } catch (err) {
        console.warn('Session check warning:', err);
      } finally {
        setIsCheckingSession(false);
      }
    }

    checkExistingSession();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isSupabaseConfigured || !supabase) {
      setErrorMessage(
        'Authentication service is currently unavailable. Please check server configuration.'
      );
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        if (error.message.toLowerCase().includes('invalid login credentials')) {
          throw new Error('Incorrect email or password. Please verify your credentials.');
        }
        if (error.message.toLowerCase().includes('email not confirmed')) {
          throw new Error('Email has not been confirmed. Please check your inbox.');
        }
        throw error;
      }

      if (data?.session) {
        router.replace('/admin');
      }
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || 'Failed to sign in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotErrorMessage(null);

    if (!forgotEmail.trim()) {
      setForgotErrorMessage('Please enter your email address.');
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setForgotErrorMessage(
        'Authentication service is currently unavailable. Please check server configuration.'
      );
      return;
    }

    setIsForgotLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/admin/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: redirectUrl,
      });

      if (error) {
        throw error;
      }

      setForgotSuccess(true);
    } catch (err: unknown) {
      const error = err as Error;
      setForgotErrorMessage(error.message || 'Failed to send password reset email. Please try again.');
    } finally {
      setIsForgotLoading(false);
    }
  };

  const switchToForgot = () => {
    setAuthMode('forgot');
    setForgotEmail(email); // prefill if already typed
    setErrorMessage(null);
    setForgotErrorMessage(null);
    setForgotSuccess(false);
  };

  const switchToLogin = () => {
    setAuthMode('login');
    setErrorMessage(null);
    setForgotErrorMessage(null);
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-[#0e0e11] flex flex-col items-center justify-center text-white">
        <RefreshCw className="w-8 h-8 text-neutral-400 animate-spin mb-4" />
        <span className="text-xs font-mono tracking-widest uppercase text-neutral-500">
          Checking login session...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0d] text-[#ececee] flex flex-col justify-between p-6 sm:p-10 relative overflow-hidden isolate select-none">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-white/[0.03] rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-emerald-500/[0.04] rounded-full blur-[120px] pointer-events-none -z-10" />

      {/* Top Bar Navigation */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-400 hover:text-white transition-all hover:-translate-x-0.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Website</span>
        </Link>
      </header>

      {/* Center Auth Card */}
      <main className="w-full max-w-md mx-auto my-auto py-10">
        <div className="bg-[#131317]/90 backdrop-blur-2xl border border-white/10 rounded-[32px] p-8 sm:p-10 shadow-[0_25px_60px_rgba(0,0,0,0.6)]">
          {authMode === 'login' ? (
            /* ================= LOGIN FORM ================= */
            <div className="animate-fadeIn">
              {/* Brand & Heading */}
              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-2xl bg-white text-black font-heading font-black text-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
                  L
                </div>
                <h1 className="font-heading font-black text-3xl uppercase tracking-tight text-white mb-2">
                  Admin Portal
                </h1>
                <p className="text-xs text-neutral-400 leading-relaxed font-sans max-w-xs mx-auto">
                  Sign in with your authorized account to manage portfolio works and media.
                </p>
              </div>

              {/* Error Message Alert */}
              {errorMessage && (
                <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start gap-3 animate-fadeIn leading-relaxed">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email Field */}
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@example.com"
                      autoComplete="email"
                      className="w-full bg-[#1b1b22] border border-white/10 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/40 transition-all"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={switchToForgot}
                      className="text-[11px] font-sans text-neutral-400 hover:text-white transition-colors underline-offset-4 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      autoComplete="current-password"
                      className="w-full bg-[#1b1b22] border border-white/10 rounded-2xl pl-11 pr-12 py-3.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/40 transition-all font-sans"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
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
                      <span>Verifying Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to Dashboard</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            /* ================= FORGOT PASSWORD FORM ================= */
            <div className="animate-fadeIn">
              {/* Brand & Heading */}
              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-2xl bg-white/10 text-emerald-400 font-heading font-black text-2xl flex items-center justify-center mx-auto mb-4 shadow-xl border border-white/10">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h1 className="font-heading font-black text-3xl uppercase tracking-tight text-white mb-2">
                  Forgot Password
                </h1>
                <p className="text-xs text-neutral-400 leading-relaxed font-sans max-w-xs mx-auto">
                  Enter your registered admin email address and we will send you a secure recovery link.
                </p>
              </div>

              {/* Success Message Banner */}
              {forgotSuccess ? (
                <div className="text-center py-4 space-y-4">
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-start gap-3 text-left leading-relaxed">
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
                    <div>
                      <p className="font-semibold text-white mb-1">Recovery Link Sent!</p>
                      <p>
                        We have sent password reset instructions to <span className="text-emerald-300 font-mono">{forgotEmail}</span>. Please check your inbox and spam folder.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={switchToLogin}
                    className="w-full mt-4 py-3.5 px-6 rounded-2xl bg-white hover:bg-neutral-200 text-black font-semibold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Sign In</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* Error Message Alert */}
                  {forgotErrorMessage && (
                    <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start gap-3 animate-fadeIn leading-relaxed">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                      <span>{forgotErrorMessage}</span>
                    </div>
                  )}

                  {/* Form */}
                  <form onSubmit={handleForgotPassword} className="space-y-5">
                    <div>
                      <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-2">
                        Registered Email Address
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                        <input
                          type="email"
                          required
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          placeholder="admin@example.com"
                          autoComplete="email"
                          className="w-full bg-[#1b1b22] border border-white/10 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/40 transition-all"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isForgotLoading}
                      className="w-full mt-2 py-4 px-6 rounded-2xl bg-white hover:bg-neutral-200 text-black font-semibold text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 shadow-xl hover:shadow-2xl disabled:opacity-60 disabled:cursor-not-allowed group active:scale-[0.99]"
                    >
                      {isForgotLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Sending Recovery Link...</span>
                        </>
                      ) : (
                        <>
                          <span>Send Recovery Link</span>
                          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={switchToLogin}
                      className="w-full py-3 text-xs text-neutral-400 hover:text-white transition-colors flex items-center justify-center gap-2"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Sign In</span>
                    </button>
                  </form>
                </>
              )}
            </div>
          )}

          {/* Security Notice */}
          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-[11px] text-neutral-500 font-sans leading-relaxed">
              Restricted area for LOUI portfolio managers. Only authorized accounts may enter.
            </p>
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="w-full max-w-5xl mx-auto text-center text-xs text-neutral-600 font-mono">
        LOUI Portfolio &copy; {new Date().getFullYear()} — All rights reserved.
      </footer>
    </div>
  );
}
