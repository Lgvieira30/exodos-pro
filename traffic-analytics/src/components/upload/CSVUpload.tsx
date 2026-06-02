'use client';
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { Upload, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { normalizeAdsData } from '@/lib/normalizeAdsData';
import { normalizeCrmData } from '@/lib/normalizeCrmData';
import { useDashboardStore } from '@/store/dashboardStore';
import { cn } from '@/lib/utils';

interface CSVUploadProps {
  onClose: () => void;
}

interface UploadResult {
  type: 'ads' | 'crm';
  count: number;
  label: string;
}

export function CSVUpload({ onClose }: CSVUploadProps) {
  const { setAdsData, setCrmData } = useDashboardStore();
  const [results, setResults] = useState<UploadResult[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const processFile = useCallback(async (file: File) => {
    setLoading(true);
    const name = file.name.toLowerCase();

    const text = await file.text();

    let rows: Record<string, string>[] = [];

    if (name.endsWith('.json')) {
      try {
        const parsed = JSON.parse(text);
        rows = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        setErrors((e) => [...e, `${file.name}: JSON inválido`]);
        setLoading(false);
        return;
      }
    } else {
      const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
      rows = parsed.data;
    }

    const firstKey = Object.keys(rows[0] || {}).join(' ').toLowerCase();
    const isAds =
      firstKey.includes('investimento') || firstKey.includes('cost') ||
      firstKey.includes('impressions') || firstKey.includes('impressoes') ||
      firstKey.includes('conta') || firstKey.includes('account');
    const isCrm =
      firstKey.includes('lead') || firstKey.includes('nome') ||
      firstKey.includes('status') || firstKey.includes('palavra');

    if (isAds) {
      const normalized = normalizeAdsData(rows);
      setAdsData(normalized);
      setResults((r) => [...r, { type: 'ads', count: normalized.length, label: file.name }]);
    } else if (isCrm) {
      const normalized = normalizeCrmData(rows);
      setCrmData(normalized);
      setResults((r) => [...r, { type: 'crm', count: normalized.length, label: file.name }]);
    } else {
      setErrors((e) => [...e, `${file.name}: não foi possível detectar o tipo (Ads ou CRM)`]);
    }

    setLoading(false);
  }, [setAdsData, setCrmData]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'text/csv': ['.csv'], 'application/json': ['.json'] },
    onDrop: (files) => files.forEach(processFile),
    multiple: true,
  });

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Importar dados</h2>
            <p className="text-xs text-gray-500 mt-0.5">Arraste arquivos CSV ou JSON de Ads e CRM</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div
            {...getRootProps()}
            className={cn(
              'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
              isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
              loading && 'opacity-60 pointer-events-none',
            )}
          >
            <input {...getInputProps()} />
            <Upload className={cn('w-8 h-8 mx-auto mb-3', isDragActive ? 'text-blue-500' : 'text-gray-300')} />
            {loading ? (
              <p className="text-sm text-gray-500">Processando...</p>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-600">
                  {isDragActive ? 'Solte aqui' : 'Clique ou arraste seus arquivos'}
                </p>
                <p className="text-xs text-gray-400 mt-1">CSV ou JSON — Ads e CRM detectados automaticamente</p>
              </>
            )}
          </div>

          {results.length > 0 && (
            <div className="space-y-2">
              {results.map((r, i) => (
                <div key={i} className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-green-800 truncate">{r.label}</p>
                    <p className="text-xs text-green-600">{r.count} registros importados ({r.type === 'ads' ? 'Ads' : 'CRM'})</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {errors.length > 0 && (
            <div className="space-y-2">
              {errors.map((e, i) => (
                <div key={i} className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  <p className="text-xs text-red-700">{e}</p>
                </div>
              ))}
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs font-medium text-gray-600 mb-1.5">Campos esperados no CSV</p>
            <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-400">
              <div>
                <p className="font-semibold text-gray-500 mb-0.5">Ads</p>
                date, campaign, ad_group, cost, impressions, clicks, conversions
              </div>
              <div>
                <p className="font-semibold text-gray-500 mb-0.5">CRM</p>
                date, lead_name, status, campaign, keyword, state, segment
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 pb-6">
          {results.length > 0 && (
            <button
              onClick={onClose}
              className="bg-blue-600 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Ver dashboard
            </button>
          )}
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
