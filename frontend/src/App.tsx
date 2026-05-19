import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { LayoutDashboard, GraduationCap, BarChart3, Rocket, Settings, LogOut, Menu, X, Layers, Database } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Wizard from './pages/Wizard';
import SettingsPage from './pages/Settings';
import Professor from './pages/Professor';
import Login from './pages/Login';
import Register from './pages/Register';
import Campaigns from './pages/Campaigns';
import Diagnostico from './pages/Diagnostico';
import { Logo } from './components/Logo';
import './styles/globals.css';

const NEON = '#00FFB2';
const GREEN = NEON;
const SIDEBAR_BG = '#0D1117';
const BORDER = 'rgba(0,255,178,0.1)';

const NAV_MAIN = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/campanhas', label: 'Campanhas', icon: Layers },
  { to: '/professor', label: 'Professor IA', icon: GraduationCap },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
];

const NAV_ACTIONS = [
  { to: '/wizard', label: 'Nova Campanha', icon: Rocket },
  { to: '/diagnostico', label: 'Diagnóstico', icon: Database },
];

const GROUP_LABEL_STYLE: React.CSSProperties = {
  fontSize: '9px',
  fontWeight: 700,
  color: 'rgba(0,255,178,0.35)',
  letterSpacing: '0.12em',
  padding: '10px 12px 5px',
  textTransform: 'uppercase' as const,
};

function NavItem({
  to,
  label,
  icon: Icon,
  exact,
  onClose,
}: {
  to: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  onClose: () => void;
}) {
  return (
    <NavLink
      to={to}
      end={exact}
      onClick={onClose}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '9px 12px',
        marginBottom: '2px',
        borderRadius: '8px',
        textDecoration: 'none',
        fontSize: '13px',
        fontWeight: isActive ? 600 : 400,
        color: isActive ? NEON : 'rgba(201,209,217,0.45)',
        background: isActive ? 'rgba(0,255,178,0.07)' : 'transparent',
        borderLeft: isActive ? `2px solid ${NEON}` : '2px solid transparent',
        transition: 'all 0.15s',
      })}
      className="btn-ghost"
    >
      {({ isActive }) => (
        <>
          <Icon
            size={15}
            color={isActive ? NEON : 'rgba(201,209,217,0.35)'}
          />
          {label}
        </>
      )}
    </NavLink>
  );
}

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [logoutHovered, setLogoutHovered] = useState(false);

  function handleLogout() {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }

  return (
    <>
      {/* Overlay mobile */}
      <div
        className="sidebar-overlay"
        onClick={onClose}
        style={{
          display: 'none',
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 49,
        }}
      />

      <aside
        className={`app-sidebar${open ? ' sidebar-open' : ''}`}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: '220px',
          background: SIDEBAR_BG,
          borderRight: `1px solid ${BORDER}`,
          display: 'flex',
          flexDirection: 'column',
          zIndex: 50,
          transition: 'transform 0.25s ease',
        }}
      >
        {/* Logo */}
        <div style={{ padding: '20px 16px 16px', borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Logo size={36} />
            <div>
              <div style={{ color: '#C9D1D9', fontSize: '13px', fontWeight: 700, letterSpacing: '-0.3px' }}>
                êxodos
              </div>
              <div style={{ color: NEON, fontSize: '9px', letterSpacing: '0.15em', fontWeight: 600, opacity: 0.8 }}>
                PRO
              </div>
            </div>
          </div>
        </div>

        {/* ── Nav ── */}
        <nav style={{ flex: 1, padding: '14px 10px', overflowY: 'auto' }}>
          {/* Group: ANÁLISE */}
          <div style={GROUP_LABEL_STYLE}>Análise</div>
          {NAV_MAIN.map(({ to, label, icon, exact }) => (
            <NavItem key={to} to={to} label={label} icon={icon} exact={exact} onClose={onClose} />
          ))}

          {/* Group: AÇÕES */}
          <div style={{ ...GROUP_LABEL_STYLE, marginTop: '6px' }}>Ações</div>
          {NAV_ACTIONS.map(({ to, label, icon }) => (
            <NavItem key={to} to={to} label={label} icon={icon} onClose={onClose} />
          ))}
        </nav>

        {/* ── Bottom: Configurações + Sair ── */}
        <div
          style={{
            padding: '12px 10px',
            borderTop: `1px solid ${BORDER}`,
          }}
        >
          <NavLink
            to="/settings"
            onClick={onClose}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '9px 12px',
              marginBottom: '4px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: isActive ? 600 : 400,
              color: isActive ? '#fff' : 'rgba(255,255,255,0.45)',
              background: isActive ? 'rgba(47,125,79,0.12)' : 'transparent',
              borderLeft: isActive ? `2px solid ${GREEN}` : '2px solid transparent',
              transition: 'all 0.15s',
            })}
            className="btn-ghost"
          >
            {({ isActive }) => (
              <>
                <Settings size={15} color={isActive ? GREEN : 'rgba(255,255,255,0.35)'} />
                Configurações
              </>
            )}
          </NavLink>

          <button
            onClick={handleLogout}
            onMouseEnter={() => setLogoutHovered(true)}
            onMouseLeave={() => setLogoutHovered(false)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '9px 12px',
              borderRadius: '8px',
              border: 'none',
              background: logoutHovered ? 'rgba(220,38,38,0.08)' : 'transparent',
              color: logoutHovered ? '#DC2626' : 'rgba(255,255,255,0.3)',
              fontSize: '13px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s',
              textAlign: 'left',
            }}
          >
            <LogOut
              size={16}
              color={logoutHovered ? '#DC2626' : 'rgba(255,255,255,0.3)'}
            />
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}

function ProtectedLayout() {
  const token = localStorage.getItem('token');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  if (!token) return <Navigate to="/login" replace />;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#080B14' }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Hamburger button - mobile only */}
      <button
        className="mobile-menu-btn"
        onClick={() => setSidebarOpen((o) => !o)}
        style={{
          display: 'none',
          position: 'fixed', top: '14px', left: '14px', zIndex: 60,
          width: '40px', height: '40px', borderRadius: '10px',
          background: SIDEBAR_BG, border: '1px solid rgba(255,255,255,0.1)',
          color: '#fff', cursor: 'pointer',
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <main className="app-main" style={{ marginLeft: '220px', flex: 1, minWidth: 0 }}>
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="campanhas" element={<Campaigns />} />
          <Route path="professor" element={<Professor />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="wizard" element={<Wizard />} />
          <Route path="diagnostico" element={<Diagnostico />} />
          <Route path="settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/*" element={<ProtectedLayout />} />
      </Routes>
    </BrowserRouter>
  );
}
