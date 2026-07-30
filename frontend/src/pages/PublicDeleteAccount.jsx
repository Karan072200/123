import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';
import api from '../lib/api';
import { toast } from 'sonner';

export default function PublicDeleteAccount() {
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your registered email');
      return;
    }
    try {
      setLoading(true);
      await api.post('/public/delete-account-request', { email, reason });
      setSubmitted(true);
      toast.success('Account deletion request registered');
    } catch (err) {
      toast.error('Failed to submit request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col justify-between p-4">
      <div className="max-w-xl mx-auto w-full my-auto bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 sm:p-8 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-3 mb-6">
          <img src="/apkamunim-playstore-icon-512.png" alt="Apka Munim" className="w-10 h-10 rounded-lg" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Apka Munim — Account Deletion</h1>
        </div>

        {submitted ? (
          <div className="text-center py-8 space-y-4">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Deletion Request Received</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Your request for account deletion has been recorded. Verification details have been logged and you will receive email confirmation once completed.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="p-4 bg-rose-50 dark:bg-rose-950/30 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs sm:text-sm space-y-1">
              <div className="font-bold flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>Permanent Data Removal Notice</span>
              </div>
              <p>
                Submitting this request will schedule permanent deletion of your profile, business records, invoices, and accounting history in compliance with Google Play Developer policies.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Registered Email / Phone
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="registered@email.com"
                required
                className="w-full px-3 py-2 text-sm border rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Reason for Deletion (Optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Let us know why you are leaving..."
                className="w-full px-3 py-2 text-sm border rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg text-sm transition-colors shadow"
            >
              {loading ? 'Submitting Request...' : 'Submit Deletion Request'}
            </button>
          </form>
        )}
      </div>

      <footer className="text-center text-xs text-slate-500 py-4">
        © 2026 Apka Munim. Privacy Policy & Account Security.
      </footer>
    </div>
  );
}
