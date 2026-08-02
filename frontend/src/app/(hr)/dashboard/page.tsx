'use client';

import { supabase } from '@/lib/supabase';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Zap, Search, Target, UserPlus, 
  MapPin, Clock, ExternalLink, Activity, 
  ChevronRight, ArrowUpRight, ShieldAlert,
  ClipboardList, X, Briefcase, FileText
} from 'lucide-react';

// ── Stage config ──────────────────────────────────────────────────────────────
const STAGES = ['New', 'Shortlisted', 'Interviewing', 'Offered', 'Rejected'] as const;
type Stage = typeof STAGES[number];

const STAGE_META: Record<Stage, { dot: string; badge: string; label: string; glow: string }> = {
  New:          { dot: 'bg-blue-500',    badge: 'bg-blue-50 text-blue-700 ring-blue-200',       label: 'New',          glow: 'shadow-blue-100' },
  Shortlisted:  { dot: 'bg-violet-500',  badge: 'bg-violet-50 text-violet-700 ring-violet-200',  label: 'Shortlisted',  glow: 'shadow-violet-100' },
  Interviewing: { dot: 'bg-amber-500',   badge: 'bg-amber-50 text-amber-700 ring-amber-200',     label: 'Interviewing', glow: 'shadow-amber-100' },
  Offered:      { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', label: 'Offered',    glow: 'shadow-emerald-100' },
  Rejected:     { dot: 'bg-rose-500',    badge: 'bg-rose-50 text-rose-700 ring-rose-200',        label: 'Rejected',     glow: 'shadow-rose-100' },
};

const SCORE_COLOR = (s: number) =>
  s >= 85 ? 'bg-emerald-500' : s >= 70 ? 'bg-blue-500' : s >= 50 ? 'bg-amber-500' : 'bg-rose-500';

const SCORE_LABEL = (s: number) =>
  s >= 85 ? { text: 'Strong Match', cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' }
  : s >= 70 ? { text: 'Good Match', cls: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' }
  : s >= 50 ? { text: 'Needs Review', cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' }
  : { text: 'Low Match', cls: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200' };

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

// ── Insight Card ─────────────────────────────────────────────────────────────
function InsightCard({
  label, value, sub, Icon, color
}: { label: string; value: string | number; sub?: string; Icon: any; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[20px] border border-[#EEF2F7] p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow duration-200 group"
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-[12px] ${color} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
          <Icon className="w-5 h-5 opacity-90" />
        </div>
        <p className="text-[12px] font-bold text-slate-500 uppercase tracking-widest leading-none">{label}</p>
      </div>
      <div>
        <p className="text-[28px] font-black text-slate-900 leading-none">{value}</p>
        {sub && <p className="text-[12px] text-slate-400 mt-2 font-medium">{sub}</p>}
      </div>
    </motion.div>
  );
}

// ── Candidate Card ────────────────────────────────────────────────────────────
function CandidateCard({ app, index, onClick }: { app: any; index: number; onClick: () => void }) {
  const name = app.candidates?.name || 'Unknown';
  const location = app.candidates?.location || '';
  const exp = app.candidates?.years_experience;
  const score = app.score ?? 0;
  const scoreLabel = SCORE_LABEL(score);
  const avatarGrad = AVATAR_BG[name.charCodeAt(0) % AVATAR_BG.length];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.04 }}
      whileHover={{ y: -3, boxShadow: '0 8px 30px rgba(0,0,0,0.06)' }}
      onClick={onClick}
      className="bg-white rounded-[20px] border border-[#EEF2F7] p-5 cursor-pointer relative group overflow-hidden"
      style={{ boxShadow: '0 1px 3px 0 rgba(0,0,0,0.04)' }}
    >
      {/* subtle linear hover bg */}
      <div className="absolute inset-0 bg-slate-50/0 group-hover:bg-slate-50/50 transition-colors pointer-events-none rounded-[20px]" />

      <div className="flex items-start gap-4 mb-4 relative z-10">
        <div className={`w-10 h-10 rounded-[14px] bg-gradient-to-br ${avatarGrad} text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-sm`}>
          {initials(name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 text-[14px] truncate group-hover:text-blue-600 transition-colors">{name}</p>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] font-medium text-slate-500 truncate">
            {location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {location}</span>}
            {location && exp != null && <span>·</span>}
            {exp != null && <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {exp}y</span>}
          </div>
        </div>
      </div>

      {app.score != null && (
        <div className="mb-4 relative z-10">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Activity className="w-3 h-3" /> AI Match
            </span>
            <span className="text-[11px] font-black text-slate-700">{score}%</span>
          </div>
          <div className="h-1.5 bg-[#EEF2F7] rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${SCORE_COLOR(score)}`}
              initial={{ width: 0 }}
              animate={{ width: `${score}%` }}
              transition={{ duration: 0.8, delay: index * 0.04 + 0.2, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 relative z-10 mt-1 pb-1">
        {app.score != null ? (
          <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${scoreLabel.cls}`}>
            {scoreLabel.text}
          </span>
        ) : (
          <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-slate-50 text-slate-400 border border-slate-200">
            Unscored
          </span>
        )}
        {app.classification && (
          <span className="text-[10px] font-bold text-slate-500 bg-[#F8FAFC] border border-[#EEF2F7] px-2 py-1 rounded-md uppercase tracking-wider truncate">
            {app.classification}
          </span>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-[#EEF2F7] p-2 flex items-center justify-between gap-2 translate-y-full group-hover:translate-y-0 transition-transform duration-300 rounded-b-[20px] z-20">
        <Link
          href={`/candidates/${app.id}`}
          onClick={e => e.stopPropagation()}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-[11px] font-bold text-blue-600 hover:bg-blue-50 transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          View Profile
        </Link>
      </div>
    </motion.div>
  );
}

// ── Kanban Column ─────────────────────────────────────────────────────────────
function KanbanColumn({ stage, apps, onCardClick }: { stage: Stage; apps: any[]; onCardClick: (app: any) => void }) {
  const meta = STAGE_META[stage];
  const pct = apps.length === 0 ? 0 : Math.min(100, apps.length * 20);

  return (
    <div className="flex flex-col min-w-0 group">
      <div className="sticky top-0 z-10 bg-[#F8FAFC] pb-4 pt-2">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-sm ${meta.dot}`} />
            <span className="text-[12px] font-bold text-slate-800 truncate">{meta.label}</span>
          </div>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${meta.badge}`}>
            {apps.length}
          </span>
        </div>
        {/* Progress indicator */}
        <div className="h-0.5 bg-[#EEF2F7] rounded-full overflow-hidden mx-1">
          <motion.div
            className={`h-full ${meta.dot} rounded-full`}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 flex-1 px-1 custom-scrollbar">
        <AnimatePresence>
          {apps.map((app, i) => (
            <CandidateCard key={app.id} app={app} index={i} onClick={() => onCardClick(app)} />
          ))}
        </AnimatePresence>

        {apps.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-10 px-4 text-center rounded-[20px] border border-dashed border-[#EEF2F7] bg-slate-50/50"
          >
            <p className="text-[12px] font-bold text-slate-400">Empty</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ── Drawer ────────────────────────────────────────────────────────────────────
function CandidateDrawer({ app, onClose }: { app: any; onClose: () => void }) {
  const name = app.candidates?.name || 'Unknown';
  const email = app.candidates?.email || '';
  const score = app.score ?? null;
  const stage = (app.application_stage || 'New') as Stage;
  const stageMeta = STAGE_META[stage];
  const avatarGrad = AVATAR_BG[name.charCodeAt(0) % AVATAR_BG.length];

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed top-0 right-0 h-full w-[440px] bg-[#F8FAFC] border-l border-[#EEF2F7] shadow-xl z-50 flex flex-col overflow-hidden"
    >
      <div className="p-6 border-b border-[#EEF2F7] bg-white shrink-0 relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center transition-colors text-slate-500"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-5 mb-5 pr-10">
          <div className={`w-14 h-14 rounded-[16px] bg-gradient-to-br ${avatarGrad} text-white font-black text-xl flex items-center justify-center shadow-sm`}>
            {initials(name)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[20px] font-black text-slate-900 leading-tight truncate">{name}</h2>
            <p className="text-[13px] text-slate-500 font-medium mt-1 truncate">{email}</p>
          </div>
        </div>

        {/* Stage + Classification */}
        <div className="flex flex-wrap gap-2">
          <span className={`text-[11px] font-bold px-3 py-1 rounded-full ring-1 ${stageMeta.badge}`}>
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${stageMeta.dot} mr-1.5`} />
            {stage}
          </span>
          {app.classification && (
            <span className="text-[11px] font-bold px-3 py-1 rounded-full ring-1 bg-slate-50 text-slate-600 ring-slate-200">
              {app.classification}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* AI Match Score */}
        {score != null && (
          <div className="bg-white rounded-[16px] p-5 border border-[#EEF2F7] shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5"><Activity className="w-3 h-3" /> AI Match Score</span>
              <span className="text-2xl font-black text-slate-900">{score}%</span>
            </div>
            <div className="h-2 bg-slate-50 rounded-full overflow-hidden border border-[#EEF2F7]">
              <motion.div
                className={`h-full rounded-full ${SCORE_COLOR(score)}`}
                initial={{ width: 0 }}
                animate={{ width: `${score}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
            <div className="mt-4 flex">
              <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${SCORE_LABEL(score).cls}`}>
                {SCORE_LABEL(score).text}
              </span>
            </div>
          </div>
        )}

        {/* AI Rationale */}
        {app.score_explanation && (
          <div>
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">AI Summary</h3>
            <div className="bg-blue-50 border-l-4 border-blue-500 rounded-r-xl p-4 text-slate-700 text-sm leading-relaxed italic">
              "{app.score_explanation}"
            </div>
          </div>
        )}

        {/* Skills */}
        {Array.isArray(app.candidates?.skills_json) && app.candidates.skills_json.length > 0 && (
          <div>
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Skills</h3>
            <div className="flex flex-wrap gap-2">
              {app.candidates.skills_json.map((s: string, i: number) => (
                <span key={i} className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-3 py-1 rounded-full">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Experience */}
        {app.candidates?.years_experience != null && (
          <div className="flex items-center gap-4 bg-white border border-[#EEF2F7] rounded-[16px] p-4 shadow-sm">
            <div className="w-10 h-10 bg-slate-50 border border-[#EEF2F7] rounded-[10px] flex items-center justify-center text-slate-500">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500">Experience</p>
              <p className="text-[14px] font-bold text-slate-900">{app.candidates.years_experience} years</p>
            </div>
          </div>
        )}

        {/* Skill Gap */}
        {app.skill_gap_json?.missing_required_skills?.length > 0 && (
          <div>
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Skill Gaps</h3>
            <div className="bg-rose-50 rounded-xl p-4 space-y-1.5">
              {app.skill_gap_json.missing_required_skills.map((s: string, i: number) => (
                <div key={i} className="flex items-center gap-2 text-sm text-rose-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                  {s}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div>
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Application Info</h3>
          <div className="space-y-3">
            {[
              { label: 'Applied', value: app.created_at ? new Date(app.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' },
              { label: 'Reference', value: app.reference_code || '—' },
              { label: 'Consent', value: app.consent_given ? '✓ Given' : '✕ Not given' },
              ...(app.interview_datetime ? [{ label: 'Interview', value: new Date(app.interview_datetime).toLocaleString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }] : []),
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center py-2 border-b border-slate-50">
                <span className="text-xs text-slate-400 font-semibold">{label}</span>
                <span className="text-xs font-bold text-slate-700">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-[#EEF2F7] bg-white shrink-0 flex gap-3 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)]">
        <Link
          href={`/candidates/${app.id}`}
          className="flex-1 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[13px] px-4 py-3 rounded-[12px] transition-all hover:shadow-lg hover:shadow-slate-900/10"
        >
          <ExternalLink className="w-4 h-4" />
          Full Profile
        </Link>
        {app.candidates?.resume_file_url && (
          <a
            href={app.candidates.resume_file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-[#EEF2F7] text-slate-700 font-bold text-[13px] px-5 py-3 rounded-[12px] transition-all"
          >
            <FileText className="w-4 h-4" />
            Resume
          </a>
        )}
      </div>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PipelineDashboard() {
  const [jobs, setJobs]           = useState<any[]>([]);
  const [apps, setApps]           = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selectedJob, setSelectedJob] = useState<string>('all');
  const [search, setSearch]       = useState('');
  const [scoreMin, setScoreMin]   = useState(0);
  const [drawerApp, setDrawerApp] = useState<any | null>(null);

  useEffect(() => {
    async function load() {
      const { data: jobData } = await supabase.from('job_openings').select('id, title');
      const { data: appData } = await supabase
        .from('applications')
        .select(`
          id, application_stage, score, classification, job_opening_id,
          score_explanation, skill_gap_json, reference_code, consent_given,
          created_at, interview_datetime,
          candidates(name, email, years_experience, location, skills_json, resume_file_url, linkedin_url)
        `)
        .order('score', { ascending: false });
      setJobs(jobData || []);
      setApps(appData || []);
      setLoading(false);
    }
    load();
  }, []);

  // Filtered apps
  const filtered = useMemo(() => {
    return apps.filter(a => {
      if (selectedJob !== 'all' && a.job_opening_id !== selectedJob) return false;
      const name = a.candidates?.name?.toLowerCase() || '';
      const email = a.candidates?.email?.toLowerCase() || '';
      if (search && !name.includes(search.toLowerCase()) && !email.includes(search.toLowerCase())) return false;
      if (scoreMin > 0 && (a.score ?? 0) < scoreMin) return false;
      return true;
    });
  }, [apps, selectedJob, search, scoreMin]);

  const total        = filtered.length;
  const strongMatch  = filtered.filter(a => (a.score ?? 0) >= 85).length;
  const needsReview  = filtered.filter(a => (a.score ?? 0) < 70 && a.score != null).length;
  const avgScore     = total === 0 ? 0 : Math.round(filtered.filter(a => a.score != null).reduce((s, a) => s + a.score, 0) / Math.max(1, filtered.filter(a => a.score != null).length));

  // Per-stage
  const forStage = (stage: Stage) =>
    filtered.filter(a => (a.application_stage || 'New') === stage);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-white rounded-2xl border border-slate-100" />)}
        </div>
        <div className="h-8 bg-white rounded-xl border border-slate-100 w-1/3" />
        <div className="grid grid-cols-5 gap-4">
          {STAGES.map(s => <div key={s} className="h-64 bg-white rounded-2xl border border-slate-100" />)}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Backdrop when drawer open */}
      <AnimatePresence>
        {drawerApp && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDrawerApp(null)}
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Drawer */}
      <AnimatePresence>
        {drawerApp && (
          <CandidateDrawer key="drawer" app={drawerApp} onClose={() => setDrawerApp(null)} />
        )}
      </AnimatePresence>

      <div className="space-y-6 w-full">

        {/* ── Top bar ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search */}
          <div className="relative max-w-xs w-full">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search candidates…"
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
            />
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {/* Job filter */}
            <select
              value={selectedJob}
              onChange={e => setSelectedJob(e.target.value)}
              className="text-sm bg-white border border-slate-200 rounded-xl px-3 py-2.5 font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer appearance-none pr-8"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', backgroundSize: '14px' }}
            >
              <option value="all">All Roles</option>
              {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>

            {/* Score filter */}
            <select
              value={scoreMin}
              onChange={e => setScoreMin(Number(e.target.value))}
              className="text-sm bg-white border border-slate-200 rounded-xl px-3 py-2.5 font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer appearance-none pr-8"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', backgroundSize: '14px' }}
            >
              <option value={0}>All Scores</option>
              <option value={85}>Strong Match (85+)</option>
              <option value={70}>Good Match (70+)</option>
              <option value={50}>Needs Review (50+)</option>
            </select>

            {/* Post role */}
            <Link
              href="/jobs"
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-all hover:shadow-lg"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Post Role
            </Link>
          </div>
        </div>

        {/* ── AI Insights ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InsightCard label="Total Applicants" value={total} Icon={Users} color="bg-[#F8FAFC] text-slate-500" sub={`across ${jobs.length} role${jobs.length !== 1 ? 's' : ''}`} />
          <InsightCard label="Strong Matches" value={strongMatch} Icon={Zap} color="bg-emerald-50 text-emerald-600" sub="Score ≥ 85" />
          <InsightCard label="Needs Review" value={needsReview} Icon={ShieldAlert} color="bg-amber-50 text-amber-600" sub="Score < 70" />
          <InsightCard label="Avg AI Score" value={total > 0 ? `${avgScore}%` : '–'} Icon={Target} color="bg-blue-50 text-blue-600" sub="of scored applicants" />
        </div>

        {/* ── Per-job Kanban boards ── */}
        {jobs.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-20 text-center">
            <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-5 text-2xl">📋</div>
            <h3 className="text-xl font-black text-slate-800 mb-2">No job openings yet</h3>
            <p className="text-slate-500 text-sm mb-6 max-w-xs mx-auto">Create your first role to start tracking candidates through the pipeline.</p>
            <Link href="/jobs" className="inline-flex items-center gap-2 bg-slate-900 text-white font-bold px-6 py-3 rounded-xl hover:bg-slate-800 transition-all">
              Create Job Opening →
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {jobs.map(job => {
              const jobApps = filtered.filter(a => a.job_opening_id === job.id);
              return (
                <div key={job.id} className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                  {/* Job header */}
                  <div className="px-8 py-5 border-b border-slate-50 flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-black text-slate-900 tracking-tight">{job.title}</h2>
                      <p className="text-[11px] text-slate-400 font-semibold mt-0.5">{jobApps.length} candidate{jobApps.length !== 1 ? 's' : ''} in pipeline</p>
                    </div>
                    <Link href={`/candidates?job=${job.id}`} className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1">
                      View all
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>

                  {/* Kanban grid */}
                  <div className="p-6 grid gap-4" style={{ gridTemplateColumns: `repeat(${STAGES.length}, minmax(0, 1fr))` }}>
                    {STAGES.map(stage => (
                      <KanbanColumn
                        key={stage}
                        stage={stage}
                        apps={forStage(stage).filter(a => a.job_opening_id === job.id)}
                        onCardClick={setDrawerApp}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
