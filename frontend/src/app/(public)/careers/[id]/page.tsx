import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';

export const revalidate = 60;

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let { data: job, error } = await supabase
    .from('job_openings')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !job) {
    notFound();
  }

  // Parse structured requirements
  const reqs = job.requirements_json || {};
  const reqSkills = reqs.required_skills || [];
  const niceSkills = reqs.nice_to_have_skills || [];

  return (
    <div className="max-w-3xl mx-auto py-8">
      <Link href="/careers" className="text-slate-500 hover:text-primary mb-6 inline-flex items-center gap-1 font-medium transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        Back to roles
      </Link>
      
      <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6 border-b border-slate-100 pb-8 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-4 tracking-tight">{job.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-slate-600 font-medium text-sm">
              <span className="flex items-center gap-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                {job.location}
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                {reqs.min_years_experience || '0'}+ years experience
              </span>
            </div>
          </div>
        </div>

        <div className="prose prose-slate prose-blue max-w-none">
          <h2 className="text-xl font-bold text-slate-900 mb-4">About the Role</h2>
          <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{job.description}</p>
          
          <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">Requirements</h2>
          {reqs.education_requirement && (
            <p className="text-slate-700 mb-4"><strong>Education:</strong> {reqs.education_requirement}</p>
          )}
          
          {reqSkills.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Required Skills:</h3>
              <ul className="list-disc pl-5 space-y-1 text-slate-700">
                {reqSkills.map((s: any, i: number) => (
                  <li key={i}>{s.skill}</li>
                ))}
              </ul>
            </div>
          )}

          {niceSkills.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Nice to Have:</h3>
              <ul className="list-disc pl-5 space-y-1 text-slate-700">
                {niceSkills.map((s: any, i: number) => (
                  <li key={i}>{s.skill}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        <div className="mt-12 pt-8 border-t border-slate-100 flex justify-center">
          <Link href={`/apply/${job.id}`} className="bg-primary text-white hover:bg-primary-hover px-10 py-4 rounded-xl font-semibold text-lg transition-all shadow-md inline-block w-full text-center sm:w-auto">
            Apply for this Role
          </Link>
        </div>
      </div>
    </div>
  );
}
