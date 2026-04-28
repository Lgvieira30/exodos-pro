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
const CYAN_DIM = 'rgba(61,184,232,0.15)';
const CYAN_BORDER = 'rgba(61,184,232,0.25)';

export default function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem('token');
    navigate('/login');
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#070b12' }}>
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 flex flex-col" style={{
        background: 'linear-gradient(180deg, #0b1422 0%, #080d18 100%)',
        borderRight: '1px solid rgba(61,184,232,0.08)',
      }}>

        {/* Logo / Brand */}
        <div className="px-5 py-6 mb-2">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0" style={{
              filter: `drop-shadow(0 0 12px ${CYAN}60)`,
            }}>
              <Logo size={38} />
            </div>
            <div>
              <p className="font-bold text-white text-sm leading-tight tracking-wide">êxodos</p>
              <p className="text-xs leading-tight" style={{ color: CYAN, opacity: 0.8 }}>system conversion</p>
            </div>
          </div>
        </div>

        {/* Divisor */}
        <div className="mx-5 mb-4" style={{ height: '1px', background: 'rgba(61,184,232,0.08)' }} />

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive ? 'text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]'
                }`
              }
              style={({ isActive }) => isActive ? {
                background: CYAN_DIM,
                border: `1px solid ${CYAN_BORDER}`,
                color: 'white',
                boxShadow: `0 0 15px rgba(61,184,232,0.1)`,
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
          <div className="mx-2 mb-3" style={{ height: '1px', background: 'rgba(255,255,255,0.04)' }} />
          <div className="px-3 py-2.5 rounded-xl mb-1" style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.05)',
          }}>
            <p className="text-xs text-slate-600 mb-0.5">Conta</p>
            <p className="text-xs text-slate-400 font-medium truncate">lgvieira.far@gmail.com</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-red-400 hover:bg-red-500/[0.08] transition-all w-full"
            style={{ border: '1px solid transparent' }}
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto fade-in">
        {children}
      </main>
    </div>
  );
}
