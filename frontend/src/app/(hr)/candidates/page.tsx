'use client';

import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, MapPin, Briefcase, ChevronRight, ExternalLink, Activity, Target, ShieldAlert, CheckCircle2 } from 'lucide-react';

const SCORE_COLOR = (s: number) =>
  s >= 85 ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' :
  s >= 70 ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' :
  s >= 50 ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' :
  'bg-rose-50 text-rose-700 ring-1 ring-rose-200';

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

const AVATAR_BG = [
  'from-blue-400 to-blue-600',
  'from-violet-400 to-violet-600',
  'from-emerald-400 to-emerald-600',
  'from-amber-400 to-amber-600',
  'from-rose-400 to-rose-600',
  'from-cyan-400 to-cyan-600',
];

export default function ResumeRankingPage() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterJob, setFilterJob] = useState('');
  const [search, setSearch] = useState('');
  const [jobs, setJobs] = useState<any[]>([]);

  useEffect(() => {
    async function loadRankings() {
      const [{ data: apps }, { data: jobList }] = await Promise.all([
        supabase
          .from('applications')
          .select(`
            id, score, classification, application_stage, created_at,
            candidates(name, email, years_experience, location, skills_json, linkedin_url, resume_file_url),
            job_openings(id, title)
          `)
          .order('score', { ascending: false }),
        supabase.from('job_openings').select('id, title'),
      ]);

      setCandidates(apps || []);
      setJobs(jobList || []);
      setLoading(false);
    }
    loadRankings();
  }, []);

  const filtered = candidates.filter(a => {
    if (filterJob && a.job_openings?.id !== filterJob) return false;
    if (search) {
      const q = search.toLowerCase();
      const n = a.candidates?.name?.toLowerCase() || '';
      const e = a.candidates?.email?.toLowerCase() || '';
      if (!n.includes(q) && !e.includes(q)) return false;
    }
    return true;
  });

  const total = filtered.length;
  const topTier = filtered.filter(a => (a.score || 0) >= 85).length;
  const goodMatch = filtered.filter(a => (a.score || 0) >= 70 && (a.score || 0) < 85).length;
  const review = filtered.filter(a => (a.score || 0) < 70).length;

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 bg-white border border-slate-100 rounded-[20px]" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* ── Top bar ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search candidates by name or email…"
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-[#EEF2F7] rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Job filter */}
          <select
            value={filterJob}
            onChange={(e) => setFilterJob(e.target.value)}
            className="text-sm bg-white border border-[#EEF2F7] rounded-xl px-4 py-2.5 font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer appearance-none pr-9 shadow-sm"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '14px' }}
          >
            <option value="">All Roles</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>{j.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Candidates', val: total, color: 'text-slate-800' },
          { label: 'Strong Match (≥85)', val: topTier, color: 'text-emerald-600' },
          { label: 'Good Match (70-84)', val: goodMatch, color: 'text-blue-600' },
          { label: 'Needs Review', val: review, color: 'text-amber-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-[20px] border border-[#EEF2F7] p-5 shadow-sm">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{s.label}</p>
            <p className={`text-[28px] font-black mt-2 leading-none ${s.color}`}>{s.val}</p>
          </div>
        ))}
      </div>

      {/* ── Candidates Table ── */}
      <div className="bg-white rounded-[24px] border border-[#EEF2F7] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC]/50 border-b border-[#EEF2F7]">
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Candidate</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Target Role</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap text-center">AI Match</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Stage</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF2F7]">
              {filtered.map((app, idx) => {
                const name = app.candidates?.name || 'Unknown';
                const avatarGrad = AVATAR_BG[name.charCodeAt(0) % AVATAR_BG.length];
                
                return (
                  <motion.tr
                    key={app.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4 w-[300px]">
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-[12px] bg-gradient-to-br ${avatarGrad} text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm mt-0.5 group-hover:scale-105 transition-transform`}>
                          {initials(name)}
                        </div>
                        <div className="min-w-0">
                          <Link href={`/candidates/${app.id}`} className="font-bold text-[14px] text-slate-900 group-hover:text-blue-600 transition-colors truncate block">
                            {name}
                          </Link>
                          <div className="text-[12px] font-medium text-slate-500 truncate mt-0.5">{app.candidates?.email}</div>
                          <div className="flex items-center gap-2 mt-1.5 text-[10px] font-semibold text-slate-400">
                            {app.candidates?.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {app.candidates.location}</span>}
                            {app.candidates?.location && app.candidates?.years_experience != null && <span>·</span>}
                            {app.candidates?.years_experience != null && <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {app.candidates.years_experience}y</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F8FAFC] border border-[#EEF2F7] text-[11px] font-bold text-slate-600 whitespace-nowrap">
                        <Target className="w-3 h-3 text-slate-400" />
                        {app.job_openings?.title || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center space-y-1.5">
                      {app.score != null ? (
                        <>
                          <div className={`inline-flex items-center justify-center px-3 py-1 rounded-md text-[13px] font-black ${SCORE_COLOR(app.score)}`}>
                            {app.score}%
                          </div>
                          {app.classification && (
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block truncate">
                              {app.classification}
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-[11px] font-bold text-slate-400 bg-slate-50 border border-slate-100 px-3 py-1 rounded-md">Unscored</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-bold uppercase tracking-widest bg-[#F8FAFC] border border-[#EEF2F7] text-slate-500 px-2.5 py-1.5 rounded-md whitespace-nowrap">
                        {app.application_stage || 'New'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {app.candidates?.resume_file_url && (
                           <a
                             href={app.candidates.resume_file_url}
                             target="_blank"
                             rel="noopener noreferrer"
                             className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                             title="View Resume"
                             onClick={e => e.stopPropagation()}
                           >
                             <ExternalLink className="w-4 h-4" />
                           </a>
                        )}
                        <Link
                          href={`/candidates/${app.id}`}
                          className="inline-flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-700 bg-white hover:bg-slate-50 shadow-sm px-4 py-2 rounded-[10px] border border-[#EEF2F7] transition-all group-hover:border-blue-200 group-hover:text-blue-700 whitespace-nowrap"
                        >
                          Profile
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#EEF2F7] shadow-sm">
                      <Search className="w-8 h-8" />
                    </div>
                    <p className="text-[14px] font-bold text-slate-600 mb-1">No candidates found</p>
                    <p className="text-[12px] text-slate-400">Try adjusting your filters or search term.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
