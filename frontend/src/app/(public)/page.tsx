import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="relative overflow-hidden flex flex-col min-h-[calc(100vh-5rem)]">
      {/* Background glowing blobs */}
      <div className="absolute top-0 inset-x-0 h-[800px] overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[10%] left-[20%] w-[500px] h-[500px] bg-blue-500/10 rounded-full mix-blend-multiply filter blur-[100px] animate-blob"></div>
        <div className="absolute top-[20%] right-[20%] w-[500px] h-[500px] bg-sky-500/10 rounded-full mix-blend-multiply filter blur-[100px] animate-blob" style={{ animationDelay: '2s' }}></div>
        <div className="absolute -bottom-8 left-[30%] w-[500px] h-[500px] bg-blue-500/10 rounded-full mix-blend-multiply filter blur-[100px] animate-blob" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-5xl mx-auto px-4 py-20 md:py-32 w-full">
        <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/60 backdrop-blur-md border border-slate-200/60 text-slate-700 w-max mb-10 text-sm font-semibold shadow-sm hover:bg-white/80 transition-all cursor-default">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
          </span>
          Next-Generation AI Recruitment
        </div>
        
        <h1 className="text-5xl sm:text-6xl md:text-8xl font-extrabold tracking-tight text-slate-900 mb-8 leading-[1.1] z-10">
          Hire the <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-sky-500 to-blue-500 bg-[length:200%_auto] animate-gradient">top 1%</span><br className="hidden sm:block"/> talent, faster.
        </h1>
        
        <p className="text-lg sm:text-xl md:text-2xl text-slate-600 max-w-3xl mb-12 leading-relaxed z-10 px-4">
          RecruitFlow's AI-driven system automatically screens, scores, and schedules exceptional candidates for your open roles.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-5 w-full sm:w-auto z-20 px-4">
          <Link href="/careers" className="group flex items-center justify-center gap-2 bg-slate-900 text-white hover:bg-blue-600 px-8 py-4.5 rounded-2xl font-semibold text-lg transition-all duration-300 shadow-xl hover:shadow-blue-500/25 hover:-translate-y-1 w-full sm:w-auto">
            Explore Open Roles
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
          <Link href="/status" className="flex items-center justify-center gap-2 bg-white text-slate-700 hover:text-slate-900 border border-slate-200 hover:border-slate-300 px-8 py-4.5 rounded-2xl font-semibold text-lg transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-1 w-full sm:w-auto">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400 group-hover:text-slate-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Track Application
          </Link>
        </div>

        {/* Trusted By Section */}
        <div className="mt-28 pt-10 border-t border-slate-200/50 w-full">
          <p className="text-xs sm:text-sm font-semibold text-slate-400 tracking-widest uppercase mb-8">Trusted by innovative teams worldwide</p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500 cursor-default">
            {/* Simple SVG logos to avoid missing images */}
            <svg className="h-6 sm:h-8" viewBox="0 0 100 30" fill="currentColor"><text x="0" y="24" fontSize="24" fontWeight="bold" fontFamily="sans-serif">Acme Corp</text></svg>
            <svg className="h-6 sm:h-8" viewBox="0 0 100 30" fill="currentColor"><text x="0" y="24" fontSize="26" fontWeight="900" fontFamily="serif" fontStyle="italic">Globex</text></svg>
            <svg className="h-6 sm:h-8 hidden md:block" viewBox="0 0 100 30" fill="currentColor"><text x="0" y="22" fontSize="22" fontWeight="bold" fontFamily="monospace">SOYLENT</text></svg>
            <svg className="h-6 sm:h-8 hidden sm:block" viewBox="0 0 100 30" fill="currentColor"><text x="0" y="24" fontSize="24" fontWeight="bold" fontFamily="sans-serif">Initech</text></svg>
          </div>
        </div>
      </div>
      
      {/* Ensure animations are defined as globals in case globals.css does not have them by adding inline style for keyframes if we wanted, but we will add them to globals.css */}
    </div>
  );
}
