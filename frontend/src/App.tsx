import React, { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import CampaignWizard from './pages/CampaignWizard';
import CreativeStudio from './pages/CreativeStudio';
import Professor from './pages/Professor';
import CommandCenter from './pages/CommandCenter';
import './styles/globals.css';

type Page = 'command' | 'professor' | 'dashboard' | 'analytics' | 'wizard' | 'creative';

const NAV_ITEMS: { id: Page; label: string; icon: string }[] = [
  { id: 'command', label: 'Command Center', icon: '⚡' },
  { id: 'professor', label: 'Professor', icon: '🧠' },
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'analytics', label: 'Analytics', icon: '📈' },
  { id: 'wizard', label: 'Campanha', icon: '🚀' },
  { id: 'creative', label: 'Studio', icon: '🎨' },
];

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('command');

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex gap-2 overflow-x-auto">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`px-4 py-2 rounded-lg transition whitespace-nowrap text-sm font-medium ${
                currentPage === item.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              <span className="mr-2">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        {currentPage === 'command' && <CommandCenter />}
        {currentPage === 'professor' && <Professor />}
        {currentPage === 'dashboard' && <Dashboard onNavigate={setCurrentPage as any} />}
        {currentPage === 'analytics' && <Analytics />}
        {currentPage === 'wizard' && <CampaignWizard />}
        {currentPage === 'creative' && <CreativeStudio />}
      </div>
    </div>
  );
}
