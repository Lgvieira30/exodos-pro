'use client';
import { BarChart2, RefreshCw, Upload } from 'lucide-react';
import { useDashboardStore } from '@/store/dashboardStore';

interface HeaderProps {
  onUploadClick: () => void;
}

export function Header({ onUploadClick }: HeaderProps) {
  const { usingMock, resetToMock } = useDashboardStore();

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 bg-blue-600 rounded-lg">
          <BarChart2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900 leading-none">Painel Analytics</h1>
          <p className="text-xs text-gray-500 mt-0.5">Ads + CRM — Inteligência de Tráfego Pago</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {!usingMock && (
          <button
            onClick={resetToMock}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Usar dados demo
          </button>
        )}
        {usingMock && (
          <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full font-medium">
            Dados demo
          </span>
        )}
        <button
          onClick={onUploadClick}
          className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Upload className="w-4 h-4" />
          Importar dados
        </button>
      </div>
    </header>
  );
}
