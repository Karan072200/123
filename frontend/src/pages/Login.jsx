import React, { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import { ShieldCheck, Eye, EyeOff, Lock, Mail, KeyRound, FileText, Users } from 'lucide-react';
import { toast } from 'sonner';
import GoogleAuthErrorHelp from '../components/auth/GoogleAuthErrorHelp';
import useGsiOriginErrorDetector from '../hooks/useGsiOriginErrorDetector';

export default function Login() {
  const { login, loginWithPin, googleLogin } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [gsiFailed, setGsiFailed] = useState(false);
  useGsiOriginErrorDetector(useCallback(() => setGsiFailed(true), []));

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }
    try {
      setLoading(true);
      const ok = await login(email, password);
      if (ok === false) throw new Error('Login failed. Check credentials.');
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      toast.error(err?.response?.data?.detail || err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePinLogin = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your registered email');
      return;
    }
    if (!pin || pin.length < 4) {
      toast.error('Please enter a valid PIN (min 4 digits)');
      return;
    }
    try {
      setLoading(true);
      await loginWithPin(email, pin);
      toast.success('Access granted via PIN');
      navigate('/');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Invalid PIN');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setLoading(true);
      await googleLogin(credentialResponse.credential);
      toast.success('Signed in with Google');
      navigate('/');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2 border border-slate-200 dark:border-slate-800">

        {/* LEFT — Branding & Benefits */}
        <div className="hidden md:flex flex-col justify-between p-10 bg-gradient-to-br from-emerald-800 via-emerald-900 to-slate-900 text-white">
          <div>
            <div className="flex items-center space-x-3 mb-10">
              <img src="/apkamunim-playstore-icon-512.png" alt="Apka Munim" className="w-11 h-11 rounded-xl bg-white p-1" />
              <div>
                <div className="font-extrabold text-2xl tracking-tight">Apka Munim</div>
                <div className="text-[11px] text-emerald-300 uppercase tracking-wider">Accounting · Billing · GST</div>
              </div>
            </div>

            <h1 className="text-3xl font-extrabold leading-tight mb-8">
              Aapka business, aapke haath mein.
            </h1>

            <div className="space-y-4 text-emerald-100 text-sm font-medium">
              <div className="flex items-start space-x-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Track every transaction — Aaya, Gaya, Udhaar</span>
              </div>
              <div className="flex items-start space-x-3">
                <FileText className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Create GST-ready professional invoices, quotations, challans</span>
              </div>
              <div className="flex items-start space-x-3">
                <Users className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Manage customers, suppliers, outstanding &amp; ledgers</span>
              </div>
              <div className="flex items-start space-x-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Know your business numbers with real-time reports</span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-emerald-300">© 2026 Apka Munim. Encrypted &amp; secure.</p>
        </div>

        {/* RIGHT — Login form */}
        <div className="p-8 sm:p-10 flex flex-col justify-center bg-white dark:bg-slate-900">
          <div className="md:hidden flex items-center space-x-2 mb-6">
            <img src="/apkamunim-playstore-icon-512.png" alt="Apka Munim" className="w-8 h-8 rounded-lg" />
            <span className="font-bold text-xl text-emerald-800 dark:text-emerald-400">Apka Munim</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Welcome back</h2>
          <p className="text-sm text-slate-500 mb-6">Log in to manage your accounting workspace.</p>

          <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1 mb-6">
            <button
              type="button"
              onClick={() => setMode('email')}
              data-testid="login-mode-email"
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                mode === 'email' ? 'bg-white dark:bg-slate-700 shadow text-emerald-700 dark:text-white' : 'text-slate-500'
              }`}
            >
              Email + Password
            </button>
            <button
              type="button"
              onClick={() => setMode('pin')}
              data-testid="login-mode-pin"
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                mode === 'pin' ? 'bg-white dark:bg-slate-700 shadow text-emerald-700 dark:text-white' : 'text-slate-500'
              }`}
            >
              Quick PIN
            </button>
          </div>

          {mode === 'email' ? (
            <form onSubmit={handleEmailLogin} className="space-y-4" data-testid="login-form-email">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Email address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@business.com"
                    required
                    data-testid="login-email-input"
                    className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Password</label>
                  <Link to="/forgot-password" className="text-xs font-semibold text-emerald-600 hover:underline" data-testid="login-forgot-link">
                    Forgot?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    data-testid="login-password-input"
                    className="w-full pl-9 pr-10 py-2 text-sm border rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    aria-label="Toggle password visibility"
                    data-testid="login-password-toggle"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                data-testid="login-submit-btn"
                className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg text-sm transition-colors shadow-md disabled:opacity-50"
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          ) : (
            <form onSubmit={handlePinLogin} className="space-y-4" data-testid="login-form-pin">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Email address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@business.com"
                    required
                    data-testid="login-pin-email-input"
                    className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Security PIN</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    maxLength={6}
                    inputMode="numeric"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 4-6 digit PIN"
                    required
                    data-testid="login-pin-input"
                    className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none tracking-widest"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                data-testid="login-pin-submit-btn"
                className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg text-sm transition-colors shadow-md disabled:opacity-50"
              >
                {loading ? 'Verifying…' : 'Verify PIN & enter'}
              </button>
            </form>
          )}

          <div className="mt-6">
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-700" /></div>
              <div className="relative flex justify-center text-xs text-slate-400"><span className="bg-white dark:bg-slate-900 px-2">OR CONTINUE WITH</span></div>
            </div>
            <div className="flex justify-center" data-testid="login-google-wrapper">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => {
                  setGsiFailed(true);
                  toast.error('Google sign-in blocked — origin not whitelisted');
                }}
                useOneTap={false}
                theme="outline"
                size="large"
                text="signin_with"
                shape="rectangular"
              />
            </div>
            {gsiFailed && <GoogleAuthErrorHelp />}
          </div>

          <p className="mt-8 text-center text-xs text-slate-500">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-emerald-600 hover:underline" data-testid="login-register-link">
              Create free account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
