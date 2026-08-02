'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Expand, Trash2, ExternalLink, Briefcase, MapPin, Search, Calendar, ChevronRight, PenTool } from 'lucide-react';

type Job = {
  id: string;
  title: string;
  location: string;
  description: string;
  requirements_json: any;
  created_at: string;
};

export default function JobsAdminPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [showForm, setShowForm] = useState(false);

  const loadJobs = async () => {
    setLoadingJobs(true);
    const { data } = await supabase
      .from('job_openings')
      .select('id, title, location, description, requirements_json, created_at')
      .order('created_at', { ascending: false });
    setJobs(data || []);
    setLoadingJobs(false);
  };

  useEffect(() => { loadJobs(); }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');

    const formData = new FormData(e.currentTarget);
    const jobData = {
      title: formData.get('title') as string,
      location: formData.get('location') as string,
      description: formData.get('description') as string,
      language_requirements: ['English'],
      requirements_json: {
        required_skills: (formData.get('req_skills') as string)
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
          .map(s => ({ skill: s, weight: 3 })),
        nice_to_have_skills: (formData.get('nice_skills') as string)
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
          .map(s => ({ skill: s, weight: 1 })),
        min_years_experience: Number(formData.get('experience')) || 0,
        education_requirement: formData.get('education') as string || '',
        location_preference: formData.get('location') as string || '',
        language_requirements: ['English'],
        certifications_required: [],
      },
    };

    const { error } = await supabase.from('job_openings').insert([jobData]);
    if (error) {
      setFormError(`Failed to save: ${error.message}`);
    } else {
      (e.target as HTMLFormElement).reset();
      setShowForm(false);
      await loadJobs();
    }
    setSaving(false);
  };

  const deleteJob = async (id: string) => {
    if (!window.confirm('Delete this job opening? This cannot be undone.')) return;
    await supabase.from('job_openings').delete().eq('id', id);
    await loadJobs();
  };

  return (
    <div className="max-w-5xl space-y-8 w-full">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-[#EEF2F7]">
        <div>
          <h1 className="text-[32px] font-black text-slate-900 tracking-tight leading-none mb-2">Job Openings</h1>
          <p className="text-[14px] text-slate-500 font-medium">Manage roles posted on the public careers site.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/careers"
            target="_blank"
            className="inline-flex items-center gap-2 text-[13px] font-bold text-slate-600 bg-white border border-[#EEF2F7] shadow-sm px-4 py-2.5 rounded-[12px] hover:bg-slate-50 transition-all"
          >
            <Expand className="w-4 h-4" />
            View Open Roles
          </Link>
          <button
            onClick={() => { setShowForm(!showForm); setFormError(''); }}
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-2.5 rounded-[12px] transition-all shadow-sm text-[13px]"
          >
            {showForm ? <Briefcase className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? 'Cancel Creation' : 'Create New Role'}
          </button>
        </div>
      </div>

      {/* ── Create Job Form ── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-[24px] shadow-sm border border-[#EEF2F7] overflow-hidden mb-8">
              <div className="bg-[#F8FAFC] border-b border-[#EEF2F7] p-6 flex flex-col justify-center">
                <h2 className="text-[16px] font-black text-slate-900 flex items-center gap-2"><Briefcase className="w-5 h-5 text-blue-600" /> Create New Job Opening</h2>
                <p className="text-[13px] text-slate-500 mt-1">Specify role details and requirements to power the AI scoring engine.</p>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-widest mb-2">Job Title *</label>
                    <input
                      type="text" name="title" required
                      placeholder="e.g. AI Intern, Backend Engineer"
                      className="w-full px-4 py-3 border border-[#EEF2F7] rounded-[14px] text-[14px] text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all bg-[#F8FAFC]/50 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-widest mb-2">Location *</label>
                    <input
                      type="text" name="location" required
                      placeholder="e.g. Remote / Sydney, AU"
                      className="w-full px-4 py-3 border border-[#EEF2F7] rounded-[14px] text-[14px] text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all bg-[#F8FAFC]/50 focus:bg-white"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-widest mb-2">Job Description *</label>
                    <textarea
                      name="description" required rows={4}
                      placeholder="Describe the role, responsibilities, and what success looks like..."
                      className="w-full px-4 py-3 border border-[#EEF2F7] rounded-[14px] text-[14px] text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all resize-none bg-[#F8FAFC]/50 focus:bg-white"
                    />
                  </div>

                  <div className="md:col-span-2 pt-2">
                    <div className="h-px bg-[#EEF2F7] w-full mb-6"></div>
                    <h3 className="text-[14px] font-black text-slate-900 mb-1">AI Scoring Criteria</h3>
                    <p className="text-[12px] text-slate-500 mb-5">The better these fields are defined, the more accurately the AI will score candidates.</p>
                  </div>

                  <div>
                    <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-widest mb-2">Min. Years Experience</label>
                    <input
                      type="number" name="experience" min="0" defaultValue="0"
                      className="w-full px-4 py-3 border border-[#EEF2F7] rounded-[14px] text-[14px] text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all bg-[#F8FAFC]/50 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-widest mb-2">Education Requirement</label>
                    <input
                      type="text" name="education"
                      placeholder="e.g. Bachelor's in CS or related"
                      className="w-full px-4 py-3 border border-[#EEF2F7] rounded-[14px] text-[14px] text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all bg-[#F8FAFC]/50 focus:bg-white"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                      Required Skills <span className="text-slate-400 font-medium lowercase normal-case tracking-normal">(comma-separated)</span>
                    </label>
                    <input
                      type="text" name="req_skills" required
                      placeholder="e.g. Python, Machine Learning, TypeScript"
                      className="w-full px-4 py-3 border border-[#EEF2F7] rounded-[14px] text-[14px] text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all bg-[#F8FAFC]/50 focus:bg-white"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                      Nice-to-Have Skills <span className="text-slate-400 font-medium lowercase normal-case tracking-normal">(comma-separated)</span>
                    </label>
                    <input
                      type="text" name="nice_skills"
                      placeholder="e.g. Next.js, n8n, Supabase"
                      className="w-full px-4 py-3 border border-[#EEF2F7] rounded-[14px] text-[14px] text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all bg-[#F8FAFC]/50 focus:bg-white"
                    />
                  </div>
                </div>

                {formError && (
                  <div className="bg-rose-50 border border-rose-100 text-rose-700 rounded-[12px] px-4 py-3 text-[13px] font-bold">
                    {formError}
                  </div>
                )}

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#EEF2F7] mt-6">
                  <button type="button" onClick={() => setShowForm(false)} className="text-[13px] font-bold text-slate-500 hover:text-slate-800 px-4 py-2.5 transition-colors">
                    Cancel
                  </button>
                  <button
                    type="submit" disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold px-6 py-2.5 rounded-[12px] transition-all text-[13px] shadow-sm flex items-center gap-2"
                  >
                    {saving ? 'Publishing...' : <><Expand className="w-4 h-4"/> Publish Opening</>}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Job Listings Table ── */}
      <div className="bg-white rounded-[24px] border border-[#EEF2F7] shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-[#EEF2F7] flex items-center justify-between bg-[#F8FAFC]">
          <h2 className="text-[14px] font-black text-slate-900 tracking-wide uppercase">Active Openings</h2>
          <span className="text-[12px] font-bold text-slate-400 bg-white border border-[#EEF2F7] px-2.5 py-1 rounded-md">{jobs.length} roles</span>
        </div>

        {loadingJobs ? (
          <div className="p-8 space-y-4 animate-pulse">
            {[1, 2].map(i => <div key={i} className="h-20 bg-[#F8FAFC] rounded-xl" />)}
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-[#F8FAFC] rounded-[16px] border border-[#EEF2F7] flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-[15px] font-bold text-slate-800 mb-1">No job openings yet</p>
            <p className="text-[13px] text-slate-500">Create your first role to start accepting candidates.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#EEF2F7]">
            {jobs.map(job => {
              const reqSkills = job.requirements_json?.required_skills || [];
              return (
                <div key={job.id} className="p-6 flex flex-col md:flex-row md:items-start justify-between gap-6 hover:bg-[#F8FAFC]/50 transition-colors group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-1">
                      <span className="text-[18px] font-black text-slate-900 tracking-tight">{job.title}</span>
                      <span className="text-[11px] font-bold bg-[#F8FAFC] border border-[#EEF2F7] text-slate-500 px-2 py-1 rounded-md flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {job.location}
                      </span>
                      <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 ml-2">
                        <Calendar className="w-3 h-3" />
                        Posted {new Date(job.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    <p className="text-[14px] font-medium text-slate-500 mt-2 line-clamp-2 leading-relaxed max-w-3xl">{job.description}</p>
                    
                    {reqSkills.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {reqSkills.slice(0, 5).map((s: any, i: number) => (
                          <span key={i} className="text-[11px] font-bold bg-blue-50/50 text-blue-700 px-2.5 py-1 rounded-md border border-blue-100">
                            {s.skill}
                          </span>
                        ))}
                        {reqSkills.length > 5 && <span className="text-[11px] font-bold text-slate-400 px-2 flex items-center">+{reqSkills.length - 5} more</span>}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link
                      href={`/careers/${job.id}`}
                      target="_blank"
                      className="inline-flex items-center gap-1.5 text-[12px] font-bold text-slate-600 bg-white border border-[#EEF2F7] px-3.5 py-2 rounded-[10px] hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Preview
                    </Link>
                    <button
                      onClick={() => deleteJob(job.id)}
                      className="inline-flex items-center gap-1.5 text-[12px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-3.5 py-2 rounded-[10px] hover:bg-rose-100 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
