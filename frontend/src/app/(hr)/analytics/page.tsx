'use client';

import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { PieChart as RePieChart, Pie } from 'recharts';
import { Activity, Users, Target, UserCheck, Sparkles, TrendingUp, BarChart3, PieChart } from 'lucide-react';

export default function RecruitmentAnalytics() {
  const [apps, setApps] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const [{ data: appData }, { data: jobData }] = await Promise.all([
        supabase.from('applications').select('id, score, classification, application_stage, created_at, job_opening_id, skill_gap_json'),
        supabase.from('job_openings').select('id, title'),
      ]);
      setApps(appData || []);
      setJobs(jobData || []);
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse w-full">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-white rounded-[20px] border border-[#EEF2F7]" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-80 bg-white rounded-[24px] border border-[#EEF2F7]" />
          <div className="h-80 bg-white rounded-[24px] border border-[#EEF2F7]" />
        </div>
      </div>
    );
  }

  const total = apps.length;
  const scored = apps.filter(a => a.score != null);
  const avgScore = scored.length
    ? Math.round(scored.reduce((sum, a) => sum + a.score, 0) / scored.length)
    : 0;
  const highQuality = scored.filter(a => a.score >= 75).length;
  const shortlisted = apps.filter(a => a.application_stage === 'Shortlisted').length;
  const rejected = apps.filter(a => a.application_stage === 'Rejected').length;
  const interviewing = apps.filter(a => a.application_stage === 'Interviewing').length;

  // Per-role breakdown
  const byRole = jobs.map(job => {
    const roleApps = apps.filter(a => a.job_opening_id === job.id);
    const roleScd = roleApps.filter(a => a.score != null);
    const roleAvg = roleScd.length
      ? Math.round(roleScd.reduce((s: number, a: any) => s + a.score, 0) / roleScd.length)
      : null;
    return { ...job, count: roleApps.length, avg: roleAvg };
  }).sort((a, b) => b.count - a.count);

  const stageData = [
    { name: 'New', count: apps.filter(a => (a.application_stage || 'New') === 'New').length, color: '#94a3b8' },
    { name: 'Shortlisted', count: shortlisted, color: '#3b82f6' },
    { name: 'Interviewing', count: interviewing, color: '#f59e0b' },
    { name: 'Offered', count: apps.filter(a => a.application_stage === 'Offered').length, color: '#10b981' },
    { name: 'Rejected', count: rejected, color: '#f43f5e' },
  ];

  const scoreDistribution = [
    { name: '90-100', count: scored.filter(a => a.score >= 90).length },
    { name: '75-89', count: scored.filter(a => a.score >= 75 && a.score < 90).length },
    { name: '60-74', count: scored.filter(a => a.score >= 60 && a.score < 75).length },
    { name: '<60', count: scored.filter(a => a.score < 60).length },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-md border border-[#EEF2F7] p-3 rounded-[12px] shadow-lg shadow-black/5">
          <p className="font-bold text-slate-800 text-[12px] uppercase tracking-wider mb-1">{label}</p>
          <p className="text-[20px] font-black text-slate-900 leading-none">
            {payload[0].value} <span className="text-[12px] font-bold text-slate-500 tracking-normal">candidates</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-6xl space-y-8 w-full">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-[#EEF2F7]">
        <div>
          <h1 className="text-[32px] font-black text-slate-900 tracking-tight leading-none mb-2">Analytics</h1>
          <p className="text-[14px] text-slate-500 font-medium">Live pipeline statistics and AI-generated insights.</p>
        </div>
      </div>

      {/* ── Top KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Applications', value: total, Icon: Users, color: 'text-slate-900', bg: 'bg-[#F8FAFC]' },
          { label: 'Avg AI Match', value: avgScore ? `${avgScore}%` : '—', Icon: Target, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'High Quality (≥75)', value: highQuality, Icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Conversion Rate', value: total > 0 ? `${Math.round((shortlisted / total) * 100)}%` : '—', Icon: UserCheck, color: 'text-violet-600', bg: 'bg-violet-50' },
        ].map(({ label, value, Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-[20px] border border-[#EEF2F7] p-6 shadow-sm group">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-[12px] ${bg} ${color} flex items-center justify-center shrink-0`}>
                <Icon className="w-5 h-5 opacity-90" />
              </div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500 leading-tight">{label}</div>
            </div>
            <div className={`text-[32px] font-black leading-none ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ── Pipeline Funnel (Recharts) ── */}
        <div className="bg-white rounded-[24px] border border-[#EEF2F7] p-6 shadow-sm flex flex-col min-h-[360px]">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-slate-400" />
            <h2 className="text-[15px] font-black text-slate-900 uppercase tracking-widest">Pipeline Funnel</h2>
          </div>
          <div className="flex-1 w-full h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF2F7" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} 
                  dy={10} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} 
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F8FAFC' }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={60}>
                  {stageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Score Distribution (Recharts) ── */}
        <div className="bg-white rounded-[24px] border border-[#EEF2F7] p-6 shadow-sm flex flex-col min-h-[360px]">
          <div className="flex items-center gap-2 mb-6">
            <PieChart className="w-5 h-5 text-slate-400" />
            <h2 className="text-[15px] font-black text-slate-900 uppercase tracking-widest">Score Distribution</h2>
          </div>
          <div className="flex-1 w-full h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF2F7" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} 
                  dy={10} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} 
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F8FAFC' }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={60} fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ── Applications by Role ── */}
        <div className="bg-white rounded-[24px] border border-[#EEF2F7] shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-[#EEF2F7] bg-[#F8FAFC] flex items-center justify-between">
            <h2 className="text-[13px] font-black text-slate-900 tracking-widest uppercase flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-400" /> Roles Overview
            </h2>
          </div>
          <div className="flex-1 overflow-auto">
            {byRole.length > 0 ? (
              <div className="divide-y divide-[#EEF2F7]">
                {byRole.map(job => (
                  <div key={job.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/50 transition-colors">
                    <div>
                      <div className="font-bold text-[14px] text-slate-900">{job.title}</div>
                      <div className="text-[12px] font-semibold text-slate-500 mt-1">{job.count} applicants</div>
                    </div>
                    <div className="text-right">
                      {job.avg != null ? (
                        <div className="flex flex-col items-end">
                          <span className={`text-[18px] font-black leading-none ${
                            job.avg >= 75 ? 'text-emerald-600' : job.avg >= 60 ? 'text-amber-600' : 'text-rose-600'
                          }`}>
                            {job.avg}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Avg Score</span>
                        </div>
                      ) : (
                        <span className="text-[11px] font-bold text-slate-400 bg-slate-50 border border-[#EEF2F7] px-2 py-1 rounded-md">No scores</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-slate-400 text-sm py-12 font-medium">No roles posted yet.</div>
            )}
          </div>
        </div>

        {/* ── AI Insight Block ── */}
        <div className="bg-white rounded-[24px] border border-[#EEF2F7] p-8 shadow-sm relative overflow-hidden flex flex-col">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-violet-500 to-emerald-500" />
          
          <div className="flex items-start gap-4 mb-8">
            <div className="w-12 h-12 bg-[#F8FAFC] border border-[#EEF2F7] rounded-[14px] flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-[18px] font-black text-slate-900">Gemini Fleet Insights</h2>
              <div className="text-[12px] font-bold text-slate-500 uppercase tracking-widest mt-1">Live AI Analysis</div>
            </div>
          </div>

          {total === 0 ? (
            <div className="text-slate-500 text-[14px] font-medium bg-[#F8FAFC] rounded-[16px] border border-[#EEF2F7] p-5">
              No applications in the pipeline yet. Insights will be generated once candidate data is available.
            </div>
          ) : (
            <div className="space-y-5 text-[14px] font-medium text-slate-600 leading-relaxed">
              <p>
                <strong className="text-slate-900">Pipeline Overview:</strong> You currently have <strong>{total} application{total !== 1 ? 's' : ''}</strong> across {jobs.length} role{jobs.length !== 1 ? 's' : ''}.
                {scored.length > 0 && ` The average AI match score is `}
                {scored.length > 0 && <strong className="text-blue-600">{avgScore}%</strong>}
                {scored.length > 0 && `, with ${highQuality} candidate${highQuality !== 1 ? 's' : ''} scoring ≥75 (high quality).`}
              </p>

              {shortlisted > 0 && (
                <p>
                  <strong className="text-slate-900">Shortlist Activity:</strong> {shortlisted} candidate{shortlisted !== 1 ? 's' : ''} have been shortlisted
                  ({total > 0 ? Math.round((shortlisted / total) * 100) : 0}% conversion rate).
                  {interviewing > 0 && ` ${interviewing} ${interviewing === 1 ? 'is' : 'are'} currently in the interview stage.`}
                </p>
              )}

              {rejected > 0 && (
                <p>
                  <strong className="text-slate-900">Health Check:</strong> {rejected} candidate{rejected !== 1 ? 's' : ''} have been rejected.
                  {total > 0 && ` That's a ${Math.round((rejected / total) * 100)}% rejection rate — `}
                  {total > 0 && rejected / total > 0.5
                    ? 'consider reviewing your job requirements or sourcing strategy.'
                    : 'your pipeline selectivity looks healthy.'}
                </p>
              )}

              <div className="bg-[#F8FAFC] border border-[#EEF2F7] rounded-[16px] p-4 mt-6">
                <strong className="text-[11px] uppercase tracking-widest text-slate-400 block mb-2">Recommendation</strong>
                <p className="text-[14px] text-slate-800 font-semibold">
                  {
                    highQuality === 0 && total > 0
                      ? 'No high-scoring candidates yet. Review job requirements in the AI scoring engine or expand the candidate pool.'
                      : shortlisted === 0 && highQuality > 0
                      ? `You have ${highQuality} high-scoring candidate${highQuality !== 1 ? 's' : ''} waiting for review. Consider shortlisting them immediately.`
                      : interviewing > 3
                      ? 'Multiple candidates in the interview stage. Ensure your recruiter bandwidth is sufficient to avoid bottlenecks.'
                      : 'Your pipeline looks healthy. Continue monitoring candidate scores and advancing them through the pipeline.'
                  }
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
