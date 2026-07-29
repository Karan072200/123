import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Eye, EyeOff, Lock, Mail, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const { login, loginWithPin, googleLogin } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }
    try {
      setLoading(true);
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handlePinLogin = async (e) => {
    e.preventDefault();
    if (!pin || pin.length < 4) {
      toast.error('Please enter a valid PIN');
      return;
    }
    try {
      setLoading(true);
      await loginWithPin(pin);
      toast.success('Access Granted via PIN');
      navigate('/');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Invalid PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
        
        {/* Left Branding Panel (Desktop Only) */}
        <div className="hidden md:flex flex-col justify-between p-10 bg-gradient-to-br from-emerald-800 via-emerald-900 to-slate-900 text-white">
          <div>
            <div className="flex items-center space-x-3 mb-8">
              <img src="/apkamunim-playstore-icon-512.png" alt="Apka Munim" className="w-10 h-10 rounded-xl bg-white p-1" />
              <span className="font-bold text-2xl tracking-tight">Apka Munim</span>
            </div>
            
            <h1 className="text-3xl font-extrabold leading-tight mb-6">
              Complete Accounting & Billing Workspace
            </h1>

            <div className="space-y-4 text-emerald-100 text-sm font-medium">
              <div className="flex items-start space-x-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Track every transaction and ledger balance with precision</span>
              </div>
              <div className="flex items-start space-x-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Create GST compliant professional invoices & challans</span>
              </div>
              <div className="flex items-start space-x-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Manage customer receivables & automated Udhaar reminders</span>
              </div>
              <div className="flex items-start space-x-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Real-time Financial Reports & AI Business Insights</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-emerald-300">
            © 2026 Apka Munim. Safe & Encrypted Accounting.
          </p>
        </div>

        {/* Right Form Panel */}
        <div className="p-8 sm:p-10 flex flex-col justify-center bg-white dark:bg-slate-900">
          <div className="md:hidden flex items-center space-x-2 mb-6">
            <img src="/apkamunim-playstore-icon-512.png" alt="Apka Munim" className="w-8 h-8 rounded-lg" />
            <span className="font-bold text-xl text-emerald-800 dark:text-emerald-400">Apka Munim</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Welcome Back</h2>
          <p className="text-sm text-slate-500 mb-6">Log in to manage your accounting workspace.</p>

          <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1 mb-6">
            <button
              onClick={() => setMode('email')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                mode === 'email' ? 'bg-white dark:bg-slate-700 shadow text-emerald-700 dark:text-white' : 'text-slate-500'
              }`}
            >
              Email Login
            </button>
            <button
              onClick={() => setMode('pin')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                mode === 'pin' ? 'bg-white dark:bg-slate-700 shadow text-emerald-700 dark:text-white' : 'text-slate-500'
              }`}
            >
              Quick PIN Login
            </button>
          </div>

          {mode === 'email' ? (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@business.com"
                    required
                    className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Password</label>
                  <Link to="/forgot-password" className="text-xs font-semibold text-emerald-600 hover:underline">
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
                    className="w-full pl-9 pr-10 py-2 text-sm border rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg text-sm transition-colors shadow-md disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>
          ) : (
            <form onSubmit={handlePinLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Security PIN</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Enter PIN"
                    required
                    className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg text-sm transition-colors shadow-md disabled:opacity-50"
              >
                {loading ? 'Verifying PIN...' : 'Verify PIN & Enter'}
              </button>
            </form>
          )}

          {googleLogin && (
            <div className="mt-6">
              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-700" /></div>
                <div className="relative flex justify-center text-xs text-slate-400"><span className="bg-white dark:bg-slate-900 px-2">OR</span></div>
              </div>
              <button
                type="button"
                onClick={googleLogin}
                className="w-full flex items-center justify-center space-x-2 py-2 px-4 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continue with Google</span>
              </button>
            </div>
          )}

          <p className="mt-8 text-center text-xs text-slate-500">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-emerald-600 hover:underline">
              Create Free Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
