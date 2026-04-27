import React, { useState } from 'react';
import { BarChart3, TrendingUp, Zap, Palette, Settings, LogOut, Menu, ChevronLeft } from 'lucide-react';

interface SidebarProps {
  currentPage: 'dashboard' | 'analytics' | 'wizard' | 'creative';
  onPageChange: (page: 'dashboard' | 'analytics' | 'wizard' | 'creative') => void;
  isOpen: boolean;
  onToggle: () => void;
}

export default function Sidebar({ currentPage, onPageChange, isOpen, onToggle }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={onToggle}
        className="fixed top-4 left-4 z-50 lg:hidden bg-blue-600 p-2 rounded-lg text-white hover:bg-blue-700 transition"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-screen bg-gradient-to-b from-slate-800 to-slate-900 border-r border-blue-500/20 transform transition-all duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 z-40 ${collapsed ? 'w-20' : 'w-64'}`}
      >
        {/* Logo */}
        <div className={`p-4 border-b border-slate-700 flex items-center justify-between ${collapsed ? 'flex-col gap-2' : ''}`}>
          {!collapsed && (
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">ÊXODOS</h1>
              <p className="text-xs text-slate-400">Campanhas</p>
            </div>
          )}
          {collapsed && <span className="text-blue-400 font-bold text-lg">Ê</span>}
        </div>

        {/* Collapse Button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 bg-blue-600 p-1 rounded-full hover:bg-blue-700 text-white hidden lg:block z-50"
        >
          <ChevronLeft className={`w-4 h-4 transition ${collapsed ? 'rotate-180' : ''}`} />
        </button>

        {/* Menu Items */}
        <nav className="p-4 space-y-2">
          <MenuItem
            icon={<BarChart3 className="w-5 h-5" />}
            label="Dashboard"
            onClick={() => {
              onPageChange('dashboard');
              onToggle();
            }}
            active={currentPage === 'dashboard'}
            collapsed={collapsed}
          />
          <MenuItem
            icon={<TrendingUp className="w-5 h-5" />}
            label="Analytics"
            onClick={() => {
              onPageChange('analytics');
              onToggle();
            }}
            active={currentPage === 'analytics'}
            collapsed={collapsed}
          />
          <MenuItem
            icon={<Zap className="w-5 h-5" />}
            label="Campanha"
            onClick={() => {
              onPageChange('wizard');
              onToggle();
            }}
            active={currentPage === 'wizard'}
            collapsed={collapsed}
          />
          <MenuItem
            icon={<Palette className="w-5 h-5" />}
            label="Studio"
            onClick={() => {
              onPageChange('creative');
              onToggle();
            }}
            active={currentPage === 'creative' || currentPage === 'settings'}
            collapsed={collapsed}
          />
        </nav>

        {/* Bottom Menu */}
        <div className="absolute bottom-6 left-4 right-4 space-y-2">
          <MenuItem
            icon={<Settings className="w-5 h-5" />}
            label="Settings"
            onClick={() => {}}
            collapsed={collapsed}
          />
          <MenuItem
            icon={<LogOut className="w-5 h-5" />}
            label="Sair"
            onClick={() => {}}
            collapsed={collapsed}
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
  collapsed?: boolean;
}

function MenuItem({ icon, label, onClick, active, collapsed }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${
        active
          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/50'
          : 'text-slate-300 hover:bg-slate-700/50'
      }`}
    >
      {icon}
      {!collapsed && <span className="text-sm font-medium">{label}</span>}
    </button>
  );
}

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={onToggle}
        className="fixed top-4 left-4 z-50 lg:hidden bg-blue-600 p-2 rounded-lg text-white hover:bg-blue-700 transition"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-screen bg-gradient-to-b from-slate-800 to-slate-900 border-r border-blue-500/20 transform transition-all duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 z-40 ${collapsed ? 'w-20' : 'w-64'}`}
      >
        {/* Logo */}
        <div className={`p-4 border-b border-slate-700 flex items-center justify-between ${collapsed ? 'flex-col gap-2' : ''}`}>
          {!collapsed && (
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">ÊXODOS</h1>
              <p className="text-xs text-slate-400">Campanhas</p>
            </div>
          )}
          {collapsed && <span className="text-blue-400 font-bold text-lg">Ê</span>}
        </div>

        {/* Collapse Button */}
        <button
          onClick={() => handleCollapse(!collapsed)}
          className="absolute -right-3 top-20 bg-blue-600 p-1 rounded-full hover:bg-blue-700 text-white hidden lg:block"
        >
          <ChevronLeft className={`w-4 h-4 transition ${collapsed ? 'rotate-180' : ''}`} />
        </button>

        {/* Menu Items */}
        <nav className="p-4 space-y-2">
          <MenuItem
            icon={<BarChart3 className="w-5 h-5" />}
            label="Dashboard"
            onClick={() => {
              onPageChange('dashboard');
              onToggle();
            }}
            active={currentPage === 'dashboard'}
            collapsed={collapsed}
          />
          <MenuItem
            icon={<TrendingUp className="w-5 h-5" />}
            label="Analytics"
            onClick={() => {
              onPageChange('analytics');
              onToggle();
            }}
            active={currentPage === 'analytics'}
            collapsed={collapsed}
          />
          <MenuItem
            icon={<Zap className="w-5 h-5" />}
            label="Campanha"
            onClick={() => {
              onPageChange('wizard');
              onToggle();
            }}
            active={currentPage === 'wizard'}
            collapsed={collapsed}
          />
          <MenuItem
            icon={<Palette className="w-5 h-5" />}
            label="Studio"
            onClick={() => {
              onPageChange('creative');
              onToggle();
            }}
            active={currentPage === 'creative' || currentPage === 'settings'}
            collapsed={collapsed}
          />
        </nav>

        {/* Bottom Menu */}
        <div className="absolute bottom-6 left-4 right-4 space-y-2">
          <MenuItem
            icon={<Settings className="w-5 h-5" />}
            label="Settings"
            onClick={() => {}}
            collapsed={collapsed}
          />
          <MenuItem
            icon={<LogOut className="w-5 h-5" />}
            label="Sair"
            onClick={() => {}}
            collapsed={collapsed}
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
  collapsed?: boolean;
}

function MenuItem({ icon, label, onClick, active, collapsed }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${
        active
          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/50'
          : 'text-slate-300 hover:bg-slate-700/50'
      }`}
    >
      {icon}
      {!collapsed && <span className="text-sm font-medium">{label}</span>}
    </button>
  );
}
