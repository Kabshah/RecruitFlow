'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function StatusPage() {
  const [email, setEmail] = useState('');
  const [refCode, setRefCode] = useState('');
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const checkStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setStatus(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanRefCode = refCode.trim().toUpperCase();

    try {
      // Fetch application by reference code
      const { data, error: fetchErr } = await supabase
        .from('applications')
        .select('application_stage, reference_code, created_at, candidates!inner(name, email)')
        .ilike('reference_code', cleanRefCode)
        .ilike('candidates.email', cleanEmail)
        .maybeSingle();

      if (fetchErr || !data) {
        setError("Application not found. Please verify your email address and reference code.");
      } else {
        setStatus(data);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching status.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Check Application Status</h1>
        <p className="text-slate-600">Enter your details below to see the current stage of your application.</p>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <form onSubmit={checkStatus} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reference Code</label>
            <input 
              type="text" 
              required
              value={refCode}
              onChange={(e) => setRefCode(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
              placeholder="e.g. RF-2G7K9"
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary-hover disabled:opacity-50 transition-colors"
          >
            {loading ? 'Checking...' : 'Check Status'}
          </button>
        </form>

        {error && (
          <div className="mt-6 p-4 bg-red-50 text-red-600 border border-red-100 rounded-xl text-center text-sm">
            {error}
          </div>
        )}

        {status && (
          <div className="mt-8 p-6 bg-blue-50 border border-blue-100 rounded-2xl text-center animate-in fade-in slide-in-from-bottom-4">
            <h3 className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-2">Current Status</h3>
            <div className="text-3xl font-bold text-slate-900 mb-4">{status.application_stage || "Under Review"}</div>
            <p className="text-slate-600 text-sm">
              Hello <span className="font-semibold">{status.candidates?.name || 'Candidate'}</span>, your application is currently in the <span className="text-primary font-semibold">{status.application_stage}</span> stage.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
