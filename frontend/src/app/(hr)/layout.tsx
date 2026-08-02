'use client';

import Link from 'next/link';
import { ReactNode, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Briefcase, BarChart3, ExternalLink, LogOut, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

const NAV_GROUPS = [
  {
    label: 'Workspace',
    items: [
      { href: '/dashboard', label: 'Pipeline Dashboard', Icon: LayoutDashboard },
    ]
  },
  {
    label: 'Hiring',
    items: [
      { href: '/candidates', label: 'Candidate Ranking', Icon: Users },
      { href: '/jobs', label: 'Job Openings', Icon: Briefcase },
    ]
  },
  {
    label: 'Insights',
    items: [
      { href: '/analytics', label: 'Analytics', Icon: BarChart3 },
    ]
  }
];

export default function HRLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/login';
        return;
      }
      const role = session.user?.user_metadata?.role;
      if (role && role !== 'hr' && role !== 'admin') {
        await supabase.auth.signOut();
        window.location.href = '/login';
        return;
      }
      setUser(session.user);
      setLoading(false);
    };
    checkAuth();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        window.location.href = '/login';
      } else {
        const role = session.user?.user_metadata?.role;
        if (role && role !== 'hr' && role !== 'admin') {
          supabase.auth.signOut().then(() => {
            window.location.href = '/login';
          });
        } else {
          setUser(session.user);
        }
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">Verifying access</p>
        </div>
      </div>
    );
  }

  const initials = (user?.email || 'HR')[0].toUpperCase();

  return (
    <div className="min-h-screen flex text-slate-900 font-sans w-full selection:bg-blue-100 selection:text-blue-900 overflow-hidden bg-white">
      
      {/* ── Sidebar ── */}
      <aside className="w-[260px] flex flex-col shrink-0 z-20 relative bg-gradient-to-b from-[#172554] via-[#0F172A] to-[#111827] shadow-xl border-r border-white/5">
        
        {/* Logo / Workspace Area */}
        <div className="px-5 pt-8 pb-8">
          <Link href="/dashboard" className="flex items-center gap-3.5 group relative w-max outline-none">
            <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-[#2563EB] via-[#3B82F6] to-[#4F46E5] shadow-[0_4px_14px_rgba(37,99,235,0.4)] text-white flex items-center justify-center font-black text-[16px] group-hover:scale-[1.03] transition-transform duration-300">
              R
            </div>
            <div>
              <div className="font-bold tracking-tight text-white text-[15px] leading-tight group-hover:text-blue-200 transition-colors">RecruitFlow</div>
              <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                AI Hiring Platform
              </div>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 relative">
                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                </span>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">System Live</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 overflow-y-auto custom-scrollbar flex flex-col gap-8">
          {NAV_GROUPS.map((group, gIdx) => (
            <div key={gIdx} className="flex flex-col gap-2">
              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-widest px-3 mb-1">
                {group.label}
              </div>
              <div className="flex flex-col gap-1">
                {group.items.map(item => {
                  const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="relative block outline-none group"
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeSidebarIndicator"
                          className="absolute left-0 top-0 bottom-0 w-[4px] bg-blue-500 rounded-r-md z-10 shadow-[0_0_8px_rgba(59,130,246,0.6)]"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.2 }}
                        />
                      )}
                      <div className={`flex items-center gap-3.5 px-3 h-[44px] rounded-[10px] text-[13px] font-medium transition-all duration-200 relative ${
                        isActive
                          ? 'bg-[rgba(37,99,235,0.18)] text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_2px_4px_rgba(0,0,0,0.1)]'
                          : 'text-slate-300 hover:bg-white/5 hover:translate-x-1 hover:text-white hover:shadow-sm'
                      }`}>
                        <item.Icon className={`w-[22px] h-[22px] transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} strokeWidth={isActive ? 2.5 : 2} />
                        {item.label}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="pt-2">
            <Link
              href="/"
              target="_blank"
              className="flex items-center gap-3.5 px-3 h-[44px] rounded-[10px] text-[13px] font-medium text-slate-300 hover:text-white hover:bg-white/5 hover:translate-x-1 transition-all duration-200 group outline-none"
            >
              <ExternalLink className="w-[22px] h-[22px] text-slate-400 group-hover:text-white transition-colors" strokeWidth={2} />
              Careers Site
            </Link>
          </div>
        </nav>

        {/* Bottom User Card */}
        <div className="p-4 mt-auto">
          <div className="group relative rounded-[20px] bg-white/5 backdrop-blur-md border border-white/10 p-3 hover:-translate-y-1 hover:shadow-[0_8px_20px_rgba(0,0,0,0.2)] hover:bg-white/10 transition-all duration-300 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-[12px] bg-white/10 border border-white/10 text-white flex items-center justify-center font-bold text-[14px]">
                  {initials}
                </div>
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#111827] rounded-full"></div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold text-white truncate">HR Admin</div>
                <div className="text-[11px] font-medium text-slate-400 truncate mt-0.5">{user?.email}</div>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
              <button className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-white/10 rounded-[8px] transition-colors">
                <Settings className="w-3.5 h-3.5" /> Settings
              </button>
              <div className="w-px h-3 bg-white/10"></div>
              <button 
                onClick={handleLogout}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-semibold text-slate-300 hover:text-rose-400 hover:bg-rose-500/10 rounded-[8px] transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" /> Logout
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 flex flex-col min-h-screen relative z-10 h-screen overflow-y-auto overflow-x-hidden bg-[#F8FAFC]">
        
        {/* Header */}
        <header className="h-[72px] bg-white/90 backdrop-blur-md border-b border-[#EEF2F7] flex items-center justify-between px-8 shrink-0 sticky top-0 z-50 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-4">
            <h2 className="font-extrabold text-[20px] text-slate-900 tracking-tight flex items-center gap-2">
              {NAV_GROUPS.flatMap(g => g.items).find(i => pathname === i.href || pathname?.startsWith(i.href + '/'))?.label ?? 'HR Portal'}
            </h2>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 p-8 md:p-10 pb-24 max-w-[1400px] w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
