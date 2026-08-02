'use client';

import { supabase } from '@/lib/supabase';
import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, Briefcase, MapPin, Search, Calendar, 
  ExternalLink, Mail, Phone, GraduationCap, CheckCircle2, 
  AlertTriangle, Info, MessageSquare, Trash2, X, RefreshCw
} from 'lucide-react';

const STAGES = ['New', 'Shortlisted', 'Interviewing', 'Offered', 'Rejected'];

const STAGE_COLORS: Record<string, string> = {
  New: 'bg-slate-100 text-slate-600 border-slate-200',
  Shortlisted: 'bg-blue-50 text-blue-700 border-blue-200',
  Interviewing: 'bg-amber-50 text-amber-700 border-amber-200',
  Offered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Rejected: 'bg-rose-50 text-rose-700 border-rose-200',
};

const SCORE_COLOR = (score: number | null) => {
  if (score == null) return 'text-slate-500 bg-slate-50 border border-slate-200';
  if (score >= 85) return 'text-emerald-700 bg-emerald-50 border border-emerald-200';
  if (score >= 70) return 'text-blue-700 bg-blue-50 border border-blue-200';
  if (score >= 50) return 'text-amber-700 bg-amber-50 border border-amber-200';
  return 'text-rose-700 bg-rose-50 border border-rose-200';
};

const AVATAR_BG = [
  'from-blue-400 to-blue-600',
  'from-violet-400 to-violet-600',
  'from-emerald-400 to-emerald-600',
  'from-amber-400 to-amber-600',
  'from-rose-400 to-rose-600',
  'from-cyan-400 to-cyan-600',
];

export default function CandidateDetail({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [app, setApp] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [updatingStage, setUpdatingStage] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDetails() {
      const { data } = await supabase
        .from('applications')
        .select(`*, candidates(*), job_openings(*)`)
        .eq('id', resolvedParams.id)
        .single();
      setApp(data);

      const { data: qData } = await supabase
        .from('interview_questions')
        .select('*')
        .eq('application_id', resolvedParams.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (qData && qData.length > 0) {
        setQuestions(qData[0].questions_json || []);
      }
    }
    fetchDetails();
  }, [resolvedParams.id]);

  const updateStage = async (newStage: string) => {
    if (newStage === app.application_stage) return;
    setUpdatingStage(true);
    const { error } = await supabase
      .from('applications')
      .update({ application_stage: newStage, updated_at: new Date().toISOString() })
      .eq('id', resolvedParams.id);

    if (!error) setApp((prev: any) => ({ ...prev, application_stage: newStage }));
    setUpdatingStage(false);
  };

  const generateQuestions = async () => {
    setIsGeneratingQuestions(true);
    setGenerateError(null);
    try {
      const response = await fetch('http://localhost:8000/generate_questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_description: app.job_openings?.description || '',
          candidate_profile: app.candidates || {},
          gap_analysis: app.skill_gap_json || {},
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `Backend error ${response.status}`);
      }

      const data = await response.json();
      const newQuestions: any[] = data.questions || [];

      await supabase.from('interview_questions').insert({
        application_id: resolvedParams.id,
        questions_json: newQuestions,
      });

      setQuestions(newQuestions);
    } catch (err: any) {
      console.error('Question generation failed:', err);
      setGenerateError(err.message || 'Failed to generate questions. Is the backend running?');
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`http://localhost:8000/candidates/${app.candidates.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/candidates');
      } else {
        alert('Failed to delete candidate. Please try again.');
      }
    } catch (error) {
      console.error('Deletion error:', error);
      alert('An error occurred while deleting the candidate.');
    } finally {
      setIsDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  if (!app) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-[14px] font-bold text-slate-400 uppercase tracking-widest">Loading Profile</p>
        </div>
      </div>
    );
  }

  const gap = app.skill_gap_json || {};
  const currentStage = app.application_stage || 'New';
  const score = app.score;

  const initials = (app.candidates?.name || 'Unknown').split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
  const avatarGrad = AVATAR_BG[(app.candidates?.name || 'A').charCodeAt(0) % AVATAR_BG.length];

  return (
    <>
    <div className="max-w-6xl space-y-6 w-full">
      {/* ── Back nav ── */}
      <Link href="/candidates" className="inline-flex items-center gap-1.5 text-[13px] font-bold text-slate-500 hover:text-slate-900 transition-colors">
        <ChevronLeft className="w-4 h-4" />
        Back to Rankings
      </Link>

      {/* ── Profile Header ── */}
      <div className="bg-white rounded-[24px] border border-[#EEF2F7] shadow-sm p-8 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 relative z-10">
          <div className="flex items-start gap-6">
            <div className={`w-20 h-20 rounded-[18px] bg-gradient-to-br ${avatarGrad} text-white flex items-center justify-center font-black text-3xl shadow-sm shrink-0`}>
              {initials}
            </div>
            <div>
              <h1 className="text-[28px] font-black text-slate-900 leading-tight tracking-tight">{app.candidates?.name}</h1>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-[14px] font-medium text-slate-500">
                <span className="flex items-center gap-1.5"><Mail className="w-4 h-4" /> {app.candidates?.email}</span>
                {app.candidates?.phone && <span className="flex items-center gap-1.5"><Phone className="w-4 h-4" /> {app.candidates.phone}</span>}
                {app.candidates?.location && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {app.candidates.location}</span>}
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-4">
                <span className="text-[12px] font-bold bg-[#F8FAFC] border border-[#EEF2F7] text-slate-600 px-3 py-1.5 rounded-md flex items-center gap-2">
                  <span className="text-slate-400 font-normal">Role:</span> {app.job_openings?.title}
                </span>
                <span className={`text-[12px] font-bold px-3 py-1.5 rounded-md border ${STAGE_COLORS[currentStage]}`}>
                  {currentStage}
                </span>
                {app.candidates?.years_experience != null && (
                  <span className="text-[12px] font-bold bg-[#F8FAFC] border border-[#EEF2F7] text-slate-600 px-3 py-1.5 rounded-md">
                    {app.candidates.years_experience}y exp
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className={`px-6 py-5 rounded-[20px] text-center shrink-0 min-w-[140px] flex flex-col justify-center ${SCORE_COLOR(score)}`}>
            {score != null ? (
              <>
                <div className="text-[40px] font-black leading-none tracking-tighter">{score}<span className="text-[20px]">%</span></div>
                <div className="text-[11px] font-bold uppercase tracking-widest mt-2">{app.classification || 'AI Match'}</div>
              </>
            ) : (
              <>
                <div className="text-[32px] font-black leading-none mb-1 text-slate-400">--</div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Pending</div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Stage Mover ── */}
      <div className="bg-white rounded-[24px] border border-[#EEF2F7] shadow-sm p-6 overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {STAGES.map(stage => (
              <button
                key={stage}
                disabled={updatingStage}
                onClick={() => updateStage(stage)}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-[10px] text-[13px] font-bold border transition-all ${
                  stage === currentStage
                    ? `${STAGE_COLORS[stage]} ring-2 ring-${STAGE_COLORS[stage].split(' ')[1].replace('text-', '')}/30`
                    : 'bg-white text-slate-600 border-[#EEF2F7] hover:bg-slate-50'
                } disabled:opacity-50`}
              >
                {stage === currentStage ? `✓ ${stage}` : stage}
              </button>
            ))}
          </div>

          <div className="flex gap-2 w-full sm:w-auto border-t sm:border-t-0 sm:border-l border-[#EEF2F7] pt-4 sm:pt-0 sm:pl-4">
            <button
              onClick={() => updateStage('Shortlisted')}
              disabled={updatingStage || currentStage === 'Shortlisted'}
              className="flex-1 sm:flex-none bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold px-5 py-2 rounded-[10px] text-[13px] transition-all shadow-sm flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" /> Shortlist
            </button>
            <button
              onClick={() => updateStage('Rejected')}
              disabled={updatingStage || currentStage === 'Rejected'}
              className="flex-1 sm:flex-none bg-white hover:bg-rose-50 disabled:opacity-50 text-rose-600 border border-[#EEF2F7] hover:border-rose-200 font-bold px-5 py-2 rounded-[10px] text-[13px] transition-all flex items-center justify-center gap-1.5"
            >
              <X className="w-4 h-4" /> Reject
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left Column ── */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* AI Scoring Rationale */}
          {app.score_explanation && (
            <div className="bg-white rounded-[24px] border border-[#EEF2F7] shadow-sm p-8">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-[8px] bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Search className="w-4 h-4 stroke-[3]" />
                </div>
                <h2 className="text-[18px] font-black text-slate-900 tracking-tight">AI Scoring Rationale</h2>
              </div>
              <div className="bg-[#F8FAFC] border-l-[3px] border-blue-500 p-5 rounded-r-[16px] text-slate-700 leading-relaxed text-[14px]">
                {app.score_explanation}
              </div>
            </div>
          )}

          {/* Skill Gap Analysis */}
          <div className="bg-white rounded-[24px] border border-[#EEF2F7] shadow-sm p-8">
            <h2 className="text-[18px] font-black text-slate-900 tracking-tight mb-6">Skill Gap Analysis</h2>
            
            <div className="space-y-4">
              {gap?.domain_mismatch_flag && (
                <div className="border border-rose-200 bg-rose-50 p-5 rounded-[16px]">
                  <h3 className="font-bold text-rose-900 text-[14px] mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Domain Mismatch
                  </h3>
                  <p className="text-rose-700 text-[13px] font-medium leading-relaxed">
                    This candidate's profile indicates they are from a completely different professional field than the one required for this role.
                  </p>
                </div>
              )}

              <div className="border border-[#EEF2F7] p-5 rounded-[16px]">
                <h3 className="font-bold text-rose-700 text-[13px] mb-3 flex items-center gap-2">
                  <X className="w-4 h-4" /> Missing Core Requirements
                </h3>
                {gap?.missing_required_skills?.length > 0 ? (
                  <ul className="flex flex-wrap gap-2">
                    {gap.missing_required_skills.map((s: string, i: number) => (
                      <li key={i} className="bg-rose-50 border border-rose-100 text-rose-700 px-3 py-1.5 rounded-lg text-[12px] font-bold">{s}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[13px] italic text-emerald-600 font-bold flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4"/> None detected — strong match!</p>
                )}
              </div>

              <div className="border border-[#EEF2F7] p-5 rounded-[16px]">
                <h3 className="font-bold text-amber-700 text-[13px] mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4" /> Partially Matched Skills
                </h3>
                {gap?.partially_matched_skills?.length > 0 ? (
                  <ul className="flex flex-wrap gap-2">
                    {gap.partially_matched_skills.map((s: string, i: number) => (
                      <li key={i} className="bg-amber-50 border border-amber-100 text-amber-800 px-3 py-1.5 rounded-lg text-[12px] font-bold">{s}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[13px] italic text-slate-400 font-medium">N/A</p>
                )}
              </div>

              {gap?.nice_to_have_gaps && gap.nice_to_have_gaps.length > 0 && (
                <div className="border border-[#EEF2F7] p-5 rounded-[16px]">
                  <h3 className="font-bold text-slate-700 text-[13px] mb-3 flex items-center gap-2">
                    <Info className="w-4 h-4" /> Missing Nice-to-Have Skills
                  </h3>
                  <ul className="flex flex-wrap gap-2">
                    {gap.nice_to_have_gaps.map((s: string, i: number) => (
                      <li key={i} className="bg-[#F8FAFC] border border-[#EEF2F7] text-slate-600 px-3 py-1.5 rounded-lg text-[12px] font-semibold">{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-[#EEF2F7]">
                <div className="bg-[#F8FAFC] border border-[#EEF2F7] p-4 rounded-[16px]">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Education Match</span>
                  {gap?.education_match === false ? (
                    <span className="text-rose-600 font-bold text-[13px] flex items-center gap-1.5"><X className="w-4 h-4"/> Missing Required</span>
                  ) : (
                    <span className="text-emerald-700 font-bold text-[13px] flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4"/> Matches Requirement</span>
                  )}
                </div>
                <div className="bg-[#F8FAFC] border border-[#EEF2F7] p-4 rounded-[16px]">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Experience Gap</span>
                  {gap?.experience_gap_years > 0 ? (
                    <span className="text-rose-600 font-bold text-[13px] flex items-center gap-1.5"><X className="w-4 h-4"/> Short {gap.experience_gap_years} years</span>
                  ) : (
                    <span className="text-emerald-700 font-bold text-[13px] flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4"/> Meets Requirement</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Interview Questions */}
          <div className="bg-white rounded-[24px] border border-[#EEF2F7] shadow-sm p-8">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-8">
              <h2 className="text-[18px] font-black text-slate-900 tracking-tight">AI Interview Questions</h2>
              <button
                onClick={generateQuestions}
                disabled={isGeneratingQuestions}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-[12px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingQuestions ? 'animate-spin' : ''}`} />
                {questions.length > 0 ? 'Regenerate' : 'Generate with DeepSeek'}
              </button>
            </div>

            {generateError && (
              <div className="mb-6 flex items-start gap-2 bg-rose-50 border border-rose-100 text-rose-700 text-[13px] px-4 py-3 rounded-[12px] font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{generateError}</span>
              </div>
            )}

            {questions.length > 0 ? (
              <div className="space-y-4">
                {questions.map((q: any, idx: number) => (
                  <div key={idx} className="bg-[#F8FAFC] border border-[#EEF2F7] p-5 rounded-[16px]">
                    <div className="text-[11px] font-black text-blue-500 uppercase tracking-widest mb-2">Question {idx + 1}</div>
                    <div className="font-bold text-slate-800 text-[14px] leading-relaxed mb-3">{q.question || q}</div>
                    {q.reason && <div className="text-[12px] text-slate-500 font-medium">🎯 Target: {q.reason}</div>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-[#F8FAFC] border border-dashed border-[#EEF2F7] rounded-[16px] p-10 text-center">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 text-[14px] font-bold mb-1">No questions generated yet</p>
                <p className="text-slate-500 text-[13px] font-medium">Click generate to create tailored interview questions based on skill gaps.</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Right Column ── */}
        <div className="space-y-6">
          
          {/* Extracted Profile */}
          <div className="bg-white rounded-[24px] border border-[#EEF2F7] shadow-sm p-6 overflow-hidden">
            <h2 className="text-[16px] font-black text-slate-900 tracking-tight mb-6">Extracted Profile</h2>
            <div className="space-y-6">
              
              {app.candidates?.resume_file_url && (
                <a
                  href={app.candidates.resume_file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 bg-slate-900 hover:bg-slate-800 text-white rounded-[16px] transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/10 rounded-[8px] flex items-center justify-center shrink-0">
                      <ExternalLink className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-[13px] font-bold">View Original Resume</span>
                  </div>
                </a>
              )}

              {app.candidates?.linkedin_url && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">LinkedIn</span>
                  <a href={app.candidates.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-[13px] font-bold text-blue-600 hover:underline truncate block">
                    {app.candidates.linkedin_url}
                  </a>
                </div>
              )}

              {Array.isArray(app.candidates?.skills_json) && app.candidates.skills_json.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">Skills</span>
                  <div className="flex flex-wrap gap-2">
                    {app.candidates.skills_json.map((s: string, i: number) => (
                      <span key={i} className="bg-[#F8FAFC] border border-[#EEF2F7] text-slate-700 px-3 py-1.5 rounded-[8px] text-[11px] font-bold">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {Array.isArray(app.candidates?.education_json) && app.candidates.education_json.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">Education</span>
                  <div className="space-y-3">
                    {app.candidates.education_json.map((e: any, i: number) => (
                      <div key={i} className="flex gap-3">
                        <GraduationCap className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold text-slate-900 text-[13px]">{e.degree}</div>
                          <div className="text-[12px] font-medium text-slate-500 mt-0.5">{e.institution} {e.year ? `· ${e.year}` : ''}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {Array.isArray(app.candidates?.previous_employers_json) && app.candidates.previous_employers_json.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">Experience</span>
                  <div className="space-y-4">
                    {app.candidates.previous_employers_json.map((e: any, i: number) => (
                      <div key={i} className="flex gap-3 relative before:absolute before:left-[7px] before:top-6 before:bottom-[-16px] before:w-[2px] before:bg-[#EEF2F7] last:before:hidden">
                        <div className="w-4 h-4 rounded-full bg-[#F8FAFC] border-2 border-[#EEF2F7] shrink-0 mt-0.5 z-10" />
                        <div>
                          <div className="font-bold text-slate-900 text-[13px]">{e.title || e.role}</div>
                          <div className="text-[12px] font-medium text-slate-500 mt-0.5 mb-1">{e.company || e.employer} {e.duration ? `· ${e.duration}` : ''}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Duplicate Flag */}
          {app.is_duplicate_of && (
             <div className="bg-rose-50 border border-rose-200 rounded-[24px] p-6">
              <h2 className="text-[14px] font-black text-rose-900 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Potential Duplicate
              </h2>
              <p className="text-[12px] font-medium text-rose-700 leading-relaxed">
                This candidate's profile is very similar to another application for this role. Review for accidental double submissions.
              </p>
            </div>
          )}

          {/* Application Info */}
          <div className="bg-white rounded-[24px] border border-[#EEF2F7] shadow-sm p-6">
            <h2 className="text-[14px] font-black text-slate-900 tracking-tight uppercase mb-5">Details</h2>
            <div className="space-y-4 text-[13px]">
              <div className="flex justify-between items-center border-b border-[#EEF2F7] pb-3">
                <span className="text-slate-500 font-medium">Reference</span>
                <span className="font-mono font-bold text-slate-800 bg-[#F8FAFC] px-2 py-1 rounded-md">{app.reference_code || '—'}</span>
              </div>
              <div className="flex justify-between items-center border-b border-[#EEF2F7] pb-3">
                <span className="text-slate-500 font-medium">Consent Form</span>
                <span className={`font-bold ${app.consent_given ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {app.consent_given ? '✓ Verified' : '✕ Missing'}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-[#EEF2F7] pb-3">
                <span className="text-slate-500 font-medium">Applied Date</span>
                <span className="font-bold text-slate-900">{new Date(app.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year:'numeric' })}</span>
              </div>
              {app.interview_datetime && (
                <div className="pt-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">📅 Scheduled Interview</span>
                  <div className="text-[13px] font-bold text-blue-700 bg-blue-50 border border-blue-100 p-3 rounded-[12px]">
                    {new Date(app.interview_datetime).toLocaleString('en-AU', {
                      weekday: 'long', day: 'numeric', month: 'long',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Danger Zone */}
            <div className="mt-8 pt-6 border-t border-dashed border-[#EEF2F7]">
              <button
                onClick={() => setShowConfirmDelete(true)}
                disabled={isDeleting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-[12px] text-[12px] font-bold text-rose-600 bg-white hover:bg-rose-50 border border-[#EEF2F7] hover:border-rose-200 transition-all disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Candidate
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Delete Confirmation Modal */}
    <AnimatePresence>
      {showConfirmDelete && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-[24px] shadow-2xl border border-[#EEF2F7] max-w-sm w-full p-8"
          >
            <div className="w-12 h-12 rounded-[16px] bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mb-5">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-[18px] font-black text-slate-900 mb-2">Delete Candidate?</h3>
            <p className="text-slate-500 text-[13px] font-medium leading-relaxed mb-8">
              This action cannot be undone. All data including their resume and AI evaluation will be permanently erased.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="flex-1 px-4 py-2.5 rounded-[12px] text-[13px] font-bold text-slate-600 bg-[#F8FAFC] hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 rounded-[12px] text-[13px] font-bold bg-rose-600 text-white hover:bg-rose-700 transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Confirm'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
