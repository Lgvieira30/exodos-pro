import React, { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import CampaignWizard from './pages/CampaignWizard';
import CreativeStudio from './pages/CreativeStudio';
import Professor from './pages/Professor';
import './styles/globals.css';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'analytics' | 'wizard' | 'creative' | 'professor'>('professor');

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Simple Navigation */}
      <div className="bg-slate-800 border-b border-slate-700 p-4">
        <div className="max-w-7xl mx-auto flex gap-4">
          <button
            onClick={() => setCurrentPage('professor')}
            className={`px-4 py-2 rounded-lg transition ${
              currentPage === 'professor'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            🧠 Professor
          </button>
          <button
            onClick={() => setCurrentPage('dashboard')}
            className={`px-4 py-2 rounded-lg transition ${
              currentPage === 'dashboard'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            📊 Dashboard
          </button>
          <button
            onClick={() => setCurrentPage('analytics')}
            className={`px-4 py-2 rounded-lg transition ${
              currentPage === 'analytics'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            📈 Analytics
          </button>
          <button
            onClick={() => setCurrentPage('wizard')}
            className={`px-4 py-2 rounded-lg transition ${
              currentPage === 'wizard'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            🚀 Campanha
          </button>
          <button
            onClick={() => setCurrentPage('creative')}
            className={`px-4 py-2 rounded-lg transition ${
              currentPage === 'creative'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            🎨 Studio
          </button>
        </div>
      </div>

      {/* Pages */}
      <div>
        {currentPage === 'professor' && <Professor />}
        {currentPage === 'dashboard' && <Dashboard onNavigate={setCurrentPage} />}
        {currentPage === 'analytics' && <Analytics />}
        {currentPage === 'wizard' && <CampaignWizard />}
        {currentPage === 'creative' && <CreativeStudio />}
      </div>
    </div>
  );
}
