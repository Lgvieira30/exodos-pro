import React from 'react';
import { BarChart3, TrendingUp, Zap, Palette, Settings, LogOut, Menu } from 'lucide-react';

interface SidebarProps {
  currentPage: 'dashboard' | 'analytics' | 'wizard' | 'creative';
  onPageChange: (page: 'dashboard' | 'analytics' | 'wizard' | 'creative') => void;
  isOpen: boolean;
  onToggle: () => void;
}

export default function Sidebar({ currentPage, onPageChange, isOpen, onToggle }: SidebarProps) {
  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={onToggle}
        className="fixed top-4 left-4 z-50 lg:hidden bg-slate-800 p-2 rounded-lg text-white hover:bg-slate-700 transition"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-screen w-64 bg-slate-800 border-r border-slate-700 p-6 transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 z-40`}
      >
        {/* Logo */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-blue-400">ÊXODOS PRO</h1>
          <p className="text-xs text-slate-400 mt-1">Gestor de Campanhas</p>
        </div>

        {/* Menu Items */}
        <nav className="space-y-2">
          <MenuItem
            icon={<BarChart3 className="w-5 h-5" />}
            label="Dashboard"
            onClick={() => {
              onPageChange('dashboard');
              onToggle();
            }}
            active={currentPage === 'dashboard'}
          />
          <MenuItem
            icon={<TrendingUp className="w-5 h-5" />}
            label="Analytics"
            onClick={() => {
              onPageChange('analytics');
              onToggle();
            }}
            active={currentPage === 'analytics'}
          />
          <MenuItem
            icon={<Zap className="w-5 h-5" />}
            label="Criar Campanha"
            onClick={() => {
              onPageChange('wizard');
              onToggle();
            }}
            active={currentPage === 'wizard'}
          />
          <MenuItem
            icon={<Palette className="w-5 h-5" />}
            label="Creative Studio"
            onClick={() => {
              onPageChange('creative');
              onToggle();
            }}
            active={currentPage === 'creative'}
          />
        </nav>

        {/* Bottom Menu */}
        <div className="absolute bottom-6 left-6 right-6 space-y-2">
          <MenuItem
            icon={<Settings className="w-5 h-5" />}
            label="Settings"
            onClick={() => {}}
          />
          <MenuItem
            icon={<LogOut className="w-5 h-5" />}
            label="Logout"
            onClick={() => {}}
          />
        </div>
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 lg:hidden z-30"
          onClick={onToggle}
        />
      )}
    </>
  );
}

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}

function MenuItem({ icon, label, onClick, active }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
        active
          ? 'bg-blue-600 text-white'
          : 'text-slate-300 hover:bg-slate-700/50'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
