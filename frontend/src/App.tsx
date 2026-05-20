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

const BG_SIDEBAR = '#070708';
const BORDER = 'rgba(255,255,255,0.04)';
const FG = '#F0F0F0';
const FG_MUTED = 'rgba(240,240,240,0.4)';
const FG_SUBTLE = 'rgba(240,240,240,0.18)';
const BG_HOVER = 'rgba(255,255,255,0.04)';
const BG_ACTIVE = 'rgba(255,255,255,0.07)';
const S_RED = '#F87171';

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
  fontSize: '10px',
  fontWeight: 600,
  color: FG_SUBTLE,
  letterSpacing: '0.06em',
  padding: '0 10px 6px',
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
        gap: '9px',
        padding: '8px 10px',
        marginBottom: '1px',
        borderRadius: '7px',
        textDecoration: 'none',
        fontSize: '13px',
        fontWeight: isActive ? 500 : 400,
        color: isActive ? FG : FG_MUTED,
        background: isActive ? BG_ACTIVE : 'transparent',
        transition: 'background 0.15s ease, color 0.15s ease',
      })}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        if (!el.getAttribute('aria-current')) {
          el.style.background = BG_HOVER;
        }
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        if (!el.getAttribute('aria-current')) {
          el.style.background = 'transparent';
        }
      }}
    >
      {({ isActive }) => (
        <>
          <Icon
            size={15}
            color={isActive ? 'rgba(240,240,240,0.85)' : 'rgba(240,240,240,0.25)'}
          />
          {label}
        </>
      )}
    </NavLink>
  );
}

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [logoutHovered, setLogoutHovered] = useState(false);
  const [settingsHovered, setSettingsHovered] = useState(false);

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
          background: BG_SIDEBAR,
          borderRight: `1px solid ${BORDER}`,
          display: 'flex',
          flexDirection: 'column',
          zIndex: 50,
          transition: 'transform 0.25s ease',
        }}
      >
        {/* Logo block */}
        <div style={{ padding: '18px 16px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Logo size={28} />
          <div>
            <div style={{ color: FG, fontSize: '13px', fontWeight: 600, letterSpacing: '-0.2px' }}>
              êxodos
            </div>
            <div style={{ color: 'rgba(240,240,240,0.35)', fontSize: '8px', letterSpacing: '0.15em', fontWeight: 500 }}>
              PRO
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
          {/* Group: ANÁLISE */}
          <div style={GROUP_LABEL_STYLE}>Análise</div>
          {NAV_MAIN.map(({ to, label, icon, exact }) => (
            <NavItem key={to} to={to} label={label} icon={icon} exact={exact} onClose={onClose} />
          ))}

          {/* Group: AÇÕES */}
          <div style={{ ...GROUP_LABEL_STYLE, marginTop: '16px' }}>Ações</div>
          {NAV_ACTIONS.map(({ to, label, icon }) => (
            <NavItem key={to} to={to} label={label} icon={icon} onClose={onClose} />
          ))}
        </nav>

        {/* Bottom: Configurações + Sair */}
        <div
          style={{
            padding: '10px 8px',
            borderTop: `1px solid ${BORDER}`,
          }}
        >
          <NavLink
            to="/settings"
            onClick={onClose}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '9px',
              padding: '8px 10px',
              marginBottom: '1px',
              borderRadius: '7px',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: isActive ? 500 : 400,
              color: isActive ? FG : FG_MUTED,
              background: isActive ? BG_ACTIVE : settingsHovered ? BG_HOVER : 'transparent',
              transition: 'background 0.15s ease, color 0.15s ease',
            })}
            onMouseEnter={() => setSettingsHovered(true)}
            onMouseLeave={() => setSettingsHovered(false)}
          >
            {({ isActive }) => (
              <>
                <Settings size={15} color={isActive ? 'rgba(240,240,240,0.85)' : 'rgba(240,240,240,0.25)'} />
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
              gap: '9px',
              padding: '8px 10px',
              borderRadius: '7px',
              border: 'none',
              background: 'transparent',
              color: logoutHovered ? S_RED : FG_SUBTLE,
              fontSize: '13px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'color 0.15s ease',
              textAlign: 'left',
            }}
          >
            <LogOut
              size={15}
              color={logoutHovered ? S_RED : FG_SUBTLE}
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
    <div style={{ display: 'flex', minHeight: '100vh', background: '#090909' }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Hamburger button - mobile only */}
      <button
        className="mobile-menu-btn"
        onClick={() => setSidebarOpen((o) => !o)}
        style={{
          display: 'none',
          position: 'fixed', top: '14px', left: '14px', zIndex: 60,
          width: '40px', height: '40px', borderRadius: '10px',
          background: BG_SIDEBAR, border: `1px solid ${BORDER}`,
          color: FG, cursor: 'pointer',
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
