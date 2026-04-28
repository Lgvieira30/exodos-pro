import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { LayoutDashboard, GraduationCap, BarChart3, Rocket, Settings, LogOut, Menu, X } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Wizard from './pages/Wizard';
import SettingsPage from './pages/Settings';
import Professor from './pages/Professor';
import Login from './pages/Login';
import Register from './pages/Register';
import { Logo } from './components/Logo';
import './styles/globals.css';

const CYAN = '#6B9AE8';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/professor', label: 'Professor IA', icon: GraduationCap },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/wizard', label: 'Nova Campanha', icon: Rocket },
  { to: '/settings', label: 'Configuracoes', icon: Settings },
];

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
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
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 49,
        }}
      />

      <aside
        className={`app-sidebar${open ? ' sidebar-open' : ''}`}
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0, width: '220px',
          background: '#0a0a0a', borderRight: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', flexDirection: 'column', zIndex: 50,
          transition: 'transform 0.25s ease',
        }}
      >
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Logo size={38} />
            <div>
              <div style={{ color: '#fff', fontSize: '13px', fontWeight: 700, letterSpacing: '-0.2px' }}>êxodos</div>
              <div style={{ color: CYAN, fontSize: '10px', opacity: 0.9, letterSpacing: '0.3px' }}>conversion</div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '12px 10px' }}>
          {NAV.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              onClick={onClose}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '9px 12px', marginBottom: '2px', borderRadius: '8px',
                textDecoration: 'none', fontSize: '13px', fontWeight: isActive ? 600 : 400,
                color: isActive ? '#fff' : 'rgba(255,255,255,0.45)',
                background: isActive ? `${CYAN}18` : 'transparent',
                borderLeft: isActive ? `2px solid ${CYAN}` : '2px solid transparent',
                transition: 'all 0.15s',
              })}
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
              padding: '9px 12px', borderRadius: '8px', border: 'none',
              background: 'transparent', color: 'rgba(255,255,255,0.35)',
              fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <LogOut size={16} /> Sair
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
    <div style={{ display: 'flex', minHeight: '100vh', background: '#000' }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Hamburger button - mobile only */}
      <button
        className="mobile-menu-btn"
        onClick={() => setSidebarOpen((o) => !o)}
        style={{
          display: 'none',
          position: 'fixed', top: '14px', left: '14px', zIndex: 60,
          width: '40px', height: '40px', borderRadius: '10px',
          background: '#111', border: '1px solid rgba(255,255,255,0.1)',
          color: '#fff', cursor: 'pointer',
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <main className="app-main" style={{ marginLeft: '220px', flex: 1, minWidth: 0 }}>
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="professor" element={<Professor />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="wizard" element={<Wizard />} />
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
