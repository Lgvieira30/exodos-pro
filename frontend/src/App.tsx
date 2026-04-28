import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { LayoutDashboard, GraduationCap, BarChart3, Rocket, Settings, LogOut } from 'lucide-react';
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

function Sidebar() {
  function handleLogout() {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }

  return (
    <aside style={{
      position: 'fixed', top: 0, left: 0, bottom: 0, width: '220px',
      background: '#0a0a0a', borderRight: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', flexDirection: 'column', zIndex: 50,
    }}>
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
  );
}

function ProtectedLayout() {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#000' }}>
      <Sidebar />
      <main style={{ marginLeft: '220px', flex: 1, minWidth: 0 }}>
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
