import Link from 'next/link';
import { supabase } from '@/lib/supabase';

// Use standard caching for 60s
export const revalidate = 60;

export default async function CareersPage() {
  // Fetch from Supabase
  const { data: jobs, error } = await supabase
    .from('job_openings')
    .select('id, title, location, description')
    .order('created_at', { ascending: false });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-16 text-center max-w-2xl mx-auto">
        <h1 className="text-5xl font-extrabold text-slate-900 mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-slate-900 to-slate-600">
          Open Roles
        </h1>
        <p className="text-xl text-slate-600 leading-relaxed">
          Find your next big opportunity at TalentBridge and help us build the future of AI-driven recruitment.
        </p>
      </div>

      {error ? (
        <div className="bg-red-50 text-red-600 p-8 rounded-3xl text-center shadow-sm border border-red-100">
          <p className="font-semibold text-lg">Failed to load job openings.</p>
          <p className="text-sm mt-2 opacity-80">Please try again later.</p>
        </div>
      ) : jobs && jobs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {jobs.map((job) => (
            <Link key={job.id} href={`/careers/${job.id}`} className="group relative block bg-white/70 backdrop-blur-xl border border-slate-200/60 rounded-[2rem] p-8 hover:shadow-2xl hover:shadow-blue-500/10 hover:border-blue-200 hover:-translate-y-1 transition-all duration-300">
              {/* Decorative gradient blob inside card */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-100 to-white/0 rounded-tr-[1.9rem] opacity-50 group-hover:opacity-100 transition-opacity"></div>
              
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-3 leading-tight pr-4">
                      {job.title}
                    </h2>
                    <div className="inline-flex items-center text-slate-500 text-sm font-medium bg-slate-100/80 px-3 py-1.5 rounded-lg gap-2">
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {job.location}
                    </div>
                  </div>
                </div>
                
                <p className="text-slate-600 line-clamp-3 mb-8 leading-relaxed flex-grow">
                  {job.description}
                </p>
                
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100 group-hover:border-blue-100/50 transition-colors">
                  <span className="text-blue-600 font-semibold group-hover:text-blue-700">Read more</span>
                  <div className="w-10 h-10 rounded-full bg-slate-50 group-hover:bg-blue-600 text-slate-400 group-hover:text-white flex items-center justify-center transition-colors">
                    <svg className="w-5 h-5 -rotate-45 group-hover:rotate-0 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-slate-50/50 backdrop-blur-sm border border-dashed border-slate-300 rounded-[2rem] p-16 text-center text-slate-500 shadow-inner">
          <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p className="text-lg font-medium">No active job openings at the moment.</p>
          <p className="text-sm mt-2">Check back later for new opportunities.</p>
        </div>
      )}
    </div>
  );
}
