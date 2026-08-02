import Link from 'next/link';
import { ReactNode } from 'react';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans w-full selection:bg-blue-500/30">
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-white/20 shadow-[0_4px_30px_rgba(0,0,0,0.03)] selection:bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group relative z-50">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-sky-500 text-white flex items-center justify-center font-bold text-2xl group-hover:scale-105 transition-transform shadow-lg shadow-blue-500/25">
              R
            </div>
            <span className="font-bold text-2xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">RecruitFlow</span>
          </Link>
          
          {/* Mobile Menu Checkbox Hack */}
          <input type="checkbox" id="mobile-menu-toggle" className="peer hidden" />
          <label htmlFor="mobile-menu-toggle" className="md:hidden z-50 cursor-pointer p-2 text-slate-600 hover:text-slate-900 transition-colors relative">
            <div className="w-6 h-5 flex flex-col justify-between">
              <span className="w-full h-0.5 bg-current transform transition-all duration-300 peer-checked:rotate-45 peer-checked:translate-y-2"></span>
              <span className="w-full h-0.5 bg-current transition-all duration-300 peer-checked:opacity-0"></span>
              <span className="w-full h-0.5 bg-current transform transition-all duration-300 peer-checked:-rotate-45 peer-checked:-translate-y-2"></span>
            </div>
          </label>
          
          {/* Desktop Nav */}
          <nav className="hidden md:flex space-x-1 items-center bg-slate-50/50 rounded-full p-1 border border-slate-200/50">
            <Link href="/" className="px-5 py-2 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-white rounded-full transition-all">Home</Link>
            <Link href="/careers" className="px-5 py-2 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-white rounded-full transition-all">Careers</Link>
            <Link href="/status" className="px-5 py-2 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-white rounded-full transition-all">Check Status</Link>
          </nav>

          <div className="hidden md:flex">
             <Link href="/login" className="text-sm font-medium bg-slate-900 text-white px-5 py-2.5 rounded-full hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-500/25 transition-all">HR Portal</Link>
          </div>

          {/* Mobile Nav Overlay */}
          <div className="fixed inset-0 bg-white/95 backdrop-blur-md z-40 md:hidden flex-col items-center justify-center space-y-8 opacity-0 pointer-events-none peer-checked:opacity-100 peer-checked:pointer-events-auto transition-opacity duration-300 flex">
            <Link href="/" className="text-2xl font-bold text-slate-800 hover:text-blue-600">Home</Link>
            <Link href="/careers" className="text-2xl font-bold text-slate-800 hover:text-blue-600">Careers</Link>
            <Link href="/status" className="text-2xl font-bold text-slate-800 hover:text-blue-600">Check Status</Link>
            <Link href="/login" className="text-xl font-bold text-white bg-blue-600 px-8 py-3 rounded-full shadow-lg shadow-blue-600/30">HR Portal</Link>
          </div>
        </div>
      </header>
      
      <main className="flex-1 w-full mx-auto relative z-10 flex flex-col">
        {children}
      </main>
      
      <footer className="bg-slate-900 text-slate-400 mt-auto py-12 border-t border-slate-800 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-blue-500 text-white flex items-center justify-center font-bold text-xs">R</div>
            <span className="font-semibold text-slate-200">RecruitFlow</span>
          </div>
          <p className="text-sm">© {new Date().getFullYear()} RecruitFlow Recruitment. All rights reserved.</p>
          <div className="flex gap-6 text-sm">
            <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
