import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertCircle, TrendingUp, Users, DollarSign, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { campaignsApi, metricsApi } from '../lib/api';

interface Campaign {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'completed' | 'draft';
  avg_cpa: number;
  avg_ctr: number;
  total_spend: number;
  total_leads: number;
}

interface Summary {
  spend: number;
  leads: number;
  cpa: number;
  roas: number;
  campaigns: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [weekly, setWeekly] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [metricsRes, campaignsRes] = await Promise.all([
          metricsApi.dashboard().catch(() => null),
          campaignsApi.list(),
        ]);

        if (metricsRes?.data?.summary) {
          setSummary(metricsRes.data.summary);
          setWeekly(metricsRes.data.weekly || []);
        } else {
          setSummary({ spend: 0, leads: 0, cpa: 0, roas: 0, campaigns: 0 });
        }

        setCampaigns(campaignsRes.data.campaigns || []);
      } catch (err) {
        setError('Erro ao carregar dashboard. Verifique sua conexão.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const activeCampaigns = campaigns.filter((c) => c.status === 'active');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Carregando dados...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-red-400">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-4 text-sm text-slate-400 hover:text-white underline">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-slate-400 mt-1">Visão geral das suas campanhas</p>
      </div>

      {/* Métricas */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <MetricCard label="Investimento" value={`R$ ${summary.spend.toLocaleString('pt-BR')}`} icon={<DollarSign className="w-5 h-5" />} color="blue" />
          <MetricCard label="Leads" value={summary.leads.toLocaleString('pt-BR')} icon={<Users className="w-5 h-5" />} color="green" />
          <MetricCard label="CPA Médio" value={summary.cpa > 0 ? `R$ ${summary.cpa.toFixed(2)}` : '—'} icon={<TrendingUp className="w-5 h-5" />} color="orange" />
          <MetricCard label="ROAS" value={summary.roas > 0 ? `${summary.roas.toFixed(1)}x` : '—'} icon={<TrendingUp className="w-5 h-5" />} color="purple" />
        </div>
      )}

      {/* Campanhas */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            Campanhas Ativas ({activeCampaigns.length})
          </h2>
          <button
            onClick={() => navigate('/wizard')}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Criar Nova
          </button>
        </div>

        {campaigns.length === 0 ? (
          <div className="bg-slate-800 rounded-lg p-12 text-center">
            <p className="text-slate-400 mb-4">Nenhuma campanha criada ainda</p>
            <button
              onClick={() => navigate('/wizard')}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-2.5 rounded-lg text-sm font-medium transition"
            >
              Criar primeira campanha
            </button>
          </div>
        ) : (
          <div className="bg-slate-800 rounded-lg divide-y divide-slate-700">
            {campaigns.map((c) => (
              <div key={c.id} className="p-4 hover:bg-slate-700 transition flex justify-between items-center">
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-sm text-slate-400 mt-0.5">
                    {c.status === 'active' ? '🟢 Ativa' :
                     c.status === 'paused' ? '🔴 Pausada' :
                     c.status === 'draft' ? '⚪ Rascunho' : '✅ Concluída'}
                  </p>
                </div>
                {c.status === 'active' && (
                  <div className="flex gap-8">
                    <div className="text-right">
                      <p className="text-xs text-slate-400">CPA</p>
                      <p className={`font-bold ${c.avg_cpa > 60 ? 'text-red-400' : c.avg_cpa > 0 ? 'text-green-400' : 'text-slate-400'}`}>
                        {c.avg_cpa > 0 ? `R$ ${Number(c.avg_cpa).toFixed(0)}` : '—'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">CTR</p>
                      <p className="font-bold">{c.avg_ctr > 0 ? `${Number(c.avg_ctr).toFixed(1)}%` : '—'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Spend</p>
                      <p className="font-bold">R$ {Number(c.total_spend).toLocaleString('pt-BR')}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Gráfico */}
      {weekly.length > 0 && (
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-lg font-bold mb-4">Performance (Últimos 7 dias)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weekly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="day" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
              <Legend />
              <Line type="monotone" dataKey="spend" name="Spend (R$)" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="leads" name="Leads" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {weekly.length === 0 && campaigns.length > 0 && (
        <div className="bg-slate-800 rounded-lg p-6 text-center">
          <p className="text-slate-400 text-sm">Sem dados de performance ainda — adicione métricas às campanhas para ver o gráfico.</p>
        </div>
      )}
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'orange' | 'purple';
}

function MetricCard({ label, value, icon, color }: MetricCardProps) {
  const colors = {
    blue: 'bg-blue-900/30 border-blue-700/50 text-blue-400',
    green: 'bg-green-900/30 border-green-700/50 text-green-400',
    orange: 'bg-orange-900/30 border-orange-700/50 text-orange-400',
    purple: 'bg-purple-900/30 border-purple-700/50 text-purple-400',
  };
  return (
    <div className={`${colors[color]} border rounded-lg p-6`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm">{label}</p>
          <p className="text-2xl font-bold mt-2 text-white">{value}</p>
        </div>
        <div className="opacity-50">{icon}</div>
      </div>
    </div>
  );
}
