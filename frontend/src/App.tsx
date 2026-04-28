import React, { useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import {
  LayoutDashboard,
  Sparkles,
  GraduationCap,
  BarChart3,
  Rocket,
  Palette,
  Menu,
  X,
} from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Wizard from './pages/Wizard';
import CreativeStudio from './pages/CreativeStudio';
import Professor from './pages/Professor';
import CommandCenter from './pages/CommandCenter';
import './styles/globals.css';

type Page = 'command' | 'professor' | 'dashboard' | 'analytics' | 'wizard' | 'creative';

const NAV_ITEMS: { id: Page; label: string; icon: React.ReactNode }[] = [
  { id: 'command', label: 'Command Center', icon: <Sparkles size={18} /> },
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { id: 'professor', label: 'Professor IA', icon: <GraduationCap size={18} /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={18} /> },
  { id: 'wizard', label: 'Nova Campanha', icon: <Rocket size={18} /> },
  { id: 'creative', label: 'Studio Criativo', icon: <Palette size={18} /> },
];

const COLORS = {
  primary: '#00B7B7',
  primaryDark: '#008A8A',
  primaryLight: '#E0F7F7',
  bg: '#F5F7FA',
  surface: '#FFFFFF',
  border: '#E5E9F0',
  sidebar: '#1A1F2E',
  sidebarHover: '#252B3D',
  text: '#1A1F2E',
  textSoft: '#4A5568',
  textMuted: '#8B95A7',
  sidebarText: '#A0AEC0',
  sidebarTextActive: '#FFFFFF',
};

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>('command');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        style={{
          display: 'none',
          position: 'fixed',
          top: '16px',
          left: '16px',
          zIndex: 100,
          width: '40px',
          height: '40px',
          background: COLORS.sidebar,
          border: 'none',
          borderRadius: '8px',
          color: '#fff',
          cursor: 'pointer',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        className="mobile-menu-btn"
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside style={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: '240px',
        background: COLORS.sidebar,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
        transform: sidebarOpen ? 'translateX(0)' : undefined,
      }} className="sidebar">

        {/* Logo */}
        <div style={{
          padding: '24px 24px 28px',
          borderBottom: `1px solid rgba(255,255,255,0.08)`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              background: COLORS.primary,
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '16px',
              fontWeight: 700,
              letterSpacing: '-0.5px',
            }}>
              Ê
            </div>
            <div>
              <div style={{ color: '#fff', fontSize: '15px', fontWeight: 700, letterSpacing: '-0.2px' }}>
                Êxodos Pro
              </div>
              <div style={{ color: COLORS.sidebarText, fontSize: '11px' }}>
                Tráfego inteligente
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '16px 12px', flex: 1 }}>
          <div style={{
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            color: COLORS.sidebarText,
            padding: '8px 12px 12px',
            fontWeight: 600,
            opacity: 0.6,
          }}>
            Menu principal
          </div>
          {NAV_ITEMS.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentPage(item.id);
                  setSidebarOpen(false);
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  marginBottom: '2px',
                  background: isActive ? COLORS.primary : 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  color: isActive ? '#fff' : COLORS.sidebarText,
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = COLORS.sidebarHover;
                    e.currentTarget.style.color = '#fff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = COLORS.sidebarText;
                  }
                }}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User footer */}
        <div style={{
          padding: '16px 20px',
          borderTop: `1px solid rgba(255,255,255,0.08)`,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: COLORS.primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 600,
          }}>
            LV
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#fff', fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Lucas Vieira
            </div>
            <div style={{ color: COLORS.sidebarText, fontSize: '11px' }}>
              Plano Pro
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ marginLeft: '240px' }} className="main-content">
        {currentPage === 'command' && <CommandCenter />}
        {currentPage === 'professor' && <Professor />}
        {currentPage === 'dashboard' && <Dashboard />}
        {currentPage === 'analytics' && <Analytics />}
        {currentPage === 'wizard' && <Wizard />}
        {currentPage === 'creative' && <CreativeStudio />}
      </main>

      <style>{`
        @media (max-width: 768px) {
          .sidebar {
            transform: translateX(-100%);
            transition: transform 0.2s ease;
            width: 280px !important;
          }
          .mobile-menu-btn {
            display: flex !important;
          }
          .main-content {
            margin-left: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
