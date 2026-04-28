import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BarChart2, Megaphone, Paintbrush, Settings, LogOut } from 'lucide-react';
import { Logo } from './Logo';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/analytics', label: 'Analytics', icon: BarChart2, end: false },
  { to: '/wizard', label: 'Nova Campanha', icon: Megaphone, end: false },
  { to: '/creative', label: 'Creative Studio', icon: Paintbrush, end: false },
  { to: '/settings', label: 'Configurações', icon: Settings, end: false },
];

const CYAN = '#3DB8E8';

export default function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#000000' }}>
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 flex flex-col" style={{
        background: '#0a0a0a',
        borderRight: '1px solid #1a1a1a',
      }}>
        {/* Brand */}
        <div className="px-5 py-6">
          <div className="flex items-center gap-3">
            <div style={{ filter: `drop-shadow(0 0 10px ${CYAN}60)` }}>
              <Logo size={36} />
            </div>
            <div>
              <p className="font-semibold text-white text-sm tracking-wide">êxodos</p>
              <p className="text-xs" style={{ color: CYAN }}>system conversion</p>
            </div>
          </div>
        </div>

        <div className="mx-5 mb-3" style={{ height: '1px', background: '#1a1a1a' }} />

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive ? 'text-white' : 'text-[#666] hover:text-white hover:bg-white/[0.05]'
                }`
              }
              style={({ isActive }) => isActive ? {
                background: 'rgba(61,184,232,0.1)',
                border: `1px solid rgba(61,184,232,0.2)`,
              } : { border: '1px solid transparent' }}
            >
              {({ isActive }) => (
                <>
                  <Icon className="w-4 h-4 flex-shrink-0" style={isActive ? { color: CYAN } : {}} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 mt-auto">
          <div className="mx-2 mb-2" style={{ height: '1px', background: '#1a1a1a' }} />
          <div className="px-3 py-2.5 rounded-lg mb-1" style={{ background: '#111', border: '1px solid #1a1a1a' }}>
            <p className="text-xs text-[#444] mb-0.5">Conta</p>
            <p className="text-xs text-[#888] font-medium truncate">lgvieira.far@gmail.com</p>
          </div>
          <button
            onClick={() => { localStorage.removeItem('token'); navigate('/login'); }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#555] hover:text-red-400 hover:bg-red-500/[0.06] transition-all w-full"
            style={{ border: '1px solid transparent' }}
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto fade-in" style={{ background: '#000' }}>
        {children}
      </main>
    </div>
  );
}
