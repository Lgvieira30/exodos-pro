import React, { useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Wizard from './pages/Wizard';
import CreativeStudio from './pages/CreativeStudio';
import Professor from './pages/Professor';
import CommandCenter from './pages/CommandCenter';
import './styles/globals.css';

type Page = 'command' | 'professor' | 'dashboard' | 'analytics' | 'wizard' | 'creative';

const NAV_ITEMS: { id: Page; label: string }[] = [
  { id: 'command', label: 'Command' },
  { id: 'professor', label: 'Professor' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'wizard', label: 'Campanha' },
  { id: 'creative', label: 'Studio' },
];

const PAPER = '#FBF8F1';
const INK = '#0A0A0A';
const INK_MUTED = '#6B6B63';
const RULE = 'rgba(10,10,10,0.18)';
const GOLD = '#8B6F2D';

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>('command');

  return (
    <div style={{ minHeight: '100vh', background: PAPER, color: INK, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <nav style={{
        background: PAPER,
        borderBottom: `0.5px solid ${RULE}`,
        padding: '14px 24px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div style={{
          maxWidth: '900px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          flexWrap: 'wrap',
        }}>
          <span style={{
            fontFamily: "'Fraunces', Georgia, serif",
            fontSize: '20px',
            fontWeight: 500,
            letterSpacing: '-0.4px',
          }}>
            <span style={{ color: GOLD }}>Ê</span>xodos
          </span>
          <div style={{ display: 'flex', gap: '4px', flex: 1, overflowX: 'auto' }}>
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                style={{
                  padding: '6px 12px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '1.5px',
                  color: currentPage === item.id ? INK : INK_MUTED,
                  fontWeight: currentPage === item.id ? 600 : 500,
                  borderBottom: currentPage === item.id ? `1.5px solid ${GOLD}` : '1.5px solid transparent',
                  transition: 'all 0.15s',
                  fontFamily: "'Inter', sans-serif",
                  whiteSpace: 'nowrap',
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main>
        {currentPage === 'command' && <CommandCenter />}
        {currentPage === 'professor' && <Professor />}
        {currentPage === 'dashboard' && <Dashboard />}
        {currentPage === 'analytics' && <Analytics />}
        {currentPage === 'wizard' && <Wizard />}
        {currentPage === 'creative' && <CreativeStudio />}
      </main>
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
