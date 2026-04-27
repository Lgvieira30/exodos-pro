import React, { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import CampaignWizard from './pages/CampaignWizard';
import CreativeStudio from './pages/CreativeStudio';
import Sidebar from './components/Sidebar';
import './styles/globals.css';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'analytics' | 'wizard' | 'creative'>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 flex">
      <Sidebar
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="flex-1 lg:ml-0">
        {currentPage === 'dashboard' && <Dashboard onNavigate={setCurrentPage} />}
        {currentPage === 'analytics' && <Analytics />}
        {currentPage === 'wizard' && <CampaignWizard />}
        {currentPage === 'creative' && <CreativeStudio />}
      </div>
    </div>
  );
}
