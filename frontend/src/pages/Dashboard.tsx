import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, DollarSign, Zap, Plus, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { campaignsApi, metricsApi } from '../lib/api';

interface Campaign {
  id: string;
  name: string;
  platform: string;
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

const PLATFORM_COLORS: Record<string, string> = {
  meta: '#1877f2',
  google: '#ea4335',
  linkedin: '#0a66c2',
};

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
        const [metricsRes, campaignsRes] = await Promise.all([
          metricsApi.dashboard().catch(() => null),
          campaignsApi.list(),
        ]);
        setSummary(metricsRes?.data?.summary || { spend: 0, leads: 0, cpa: 0, roas: 0, campaigns: 0 });
        setWeekly(metricsRes?.data?.weekly || []);
        setCampaigns(campaignsRes.data.campaigns || []);
      } catch {
        setError('Erro ao carregar dados.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="w-10 h-10 rounded-full border-2 border-blue-500 border-t-transparent spinner mx-auto mb-3" />
        <p className="text-slate-500 text-sm">Carregando...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <p className="text-red-400 mb-3">{error}</p>
        <button onClick={() => window.location.reload()} className="text-sm text-slate-400 hover:text-white underline">Tentar novamente</button>
      </div>
    </div>
  );

  const activeCampaigns = campaigns.filter(c => c.status === 'active');

  const metrics = [
    { label: 'Investimento', value: `R$ ${(summary?.spend || 0).toLocaleString('pt-BR')}`, icon: DollarSign, gradient: 'from-blue-600 to-blue-400', glow: 'rgba(59,130,246,0.2)' },
    { label: 'Leads Gerados', value: (summary?.leads || 0).toLocaleString('pt-BR'), icon: Users, gradient: 'from-emerald-600 to-emerald-400', glow: 'rgba(16,185,129,0.2)' },
    { label: 'CPA Médio', value: summary?.cpa ? `R$ ${summary.cpa.toFixed(2)}` : '—', icon: TrendingUp, gradient: 'from-orange-600 to-orange-400', glow: 'rgba(249,115,22,0.2)' },
    { label: 'ROAS', value: summary?.roas ? `${summary.roas.toFixed(1)}x` : '—', icon: Zap, gradient: 'from-purple-600 to-purple-400', glow: 'rgba(139,92,246,0.2)' },
  ];

  return (
    <div className="p-8 min-h-screen" style={{ background: '#080c14' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Visão geral das suas campanhas</p>
        </div>
        <button
          onClick={() => navigate('/wizard')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
          style={{ background: 'linear-gradient(135deg, #3b82f6, #6d28d9)', boxShadow: '0 0 20px rgba(59,130,246,0.25)' }}
        >
          <Plus className="w-4 h-4" /> Nova Campanha
        </button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {metrics.map(({ label, value, icon: Icon, gradient, glow }) => (
          <div key={label} className="rounded-2xl p-5 card-hover" style={{
            background: 'rgba(15,23,42,0.8)',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: `0 0 30px ${glow}`,
          }}>
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4 opacity-90`}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">{label}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Campanhas */}
        <div className="lg:col-span-2 rounded-2xl overflow-hidden" style={{
          background: 'rgba(15,23,42,0.8)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div>
              <h2 className="text-base font-semibold text-white">Campanhas</h2>
              <p className="text-xs text-slate-500 mt-0.5">{activeCampaigns.length} ativas</p>
            </div>
          </div>

          {campaigns.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
                <Zap className="w-5 h-5 text-blue-400" />
              </div>
              <p className="text-slate-400 text-sm mb-4">Nenhuma campanha ainda</p>
              <button onClick={() => navigate('/wizard')} className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors">
                Criar primeira campanha →
              </button>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              {campaigns.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{
                      background: c.status === 'active' ? '#10b981' : c.status === 'paused' ? '#f59e0b' : '#64748b',
                      boxShadow: c.status === 'active' ? '0 0 6px #10b981' : 'none',
                    }} />
                    <div>
                      <p className="text-sm font-medium text-white">{c.name}</p>
                      <p className="text-xs text-slate-500 capitalize">{c.platform} · {c.status === 'active' ? 'Ativa' : c.status === 'paused' ? 'Pausada' : c.status === 'draft' ? 'Rascunho' : 'Concluída'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-right">
                    <div>
                      <p className="text-xs text-slate-500">Spend</p>
                      <p className="text-sm font-semibold text-white">R$ {Number(c.total_spend).toLocaleString('pt-BR')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Leads</p>
                      <p className="text-sm font-semibold text-white">{c.total_leads}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">CPA</p>
                      <p className={`text-sm font-semibold ${c.avg_cpa > 60 ? 'text-red-400' : c.avg_cpa > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {c.avg_cpa > 0 ? `R$ ${Number(c.avg_cpa).toFixed(0)}` : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Gráfico / Quick Stats */}
        <div className="space-y-4">
          <div className="rounded-2xl p-5" style={{
            background: 'rgba(15,23,42,0.8)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Performance</h3>
              <span className="text-xs text-slate-500">7 dias</span>
            </div>
            {weekly.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={weekly}>
                  <XAxis dataKey="day" stroke="#334155" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Line type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-40 flex items-center justify-center">
                <p className="text-slate-600 text-xs text-center">Sem dados ainda.<br />Adicione métricas às campanhas.</p>
              </div>
            )}
          </div>

          <div className="rounded-2xl p-5" style={{
            background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(139,92,246,0.1))',
            border: '1px solid rgba(59,130,246,0.2)',
          }}>
            <div className="flex items-center gap-3 mb-3">
              <ArrowUpRight className="w-4 h-4 text-blue-400" />
              <p className="text-sm font-semibold text-white">Ir para Analytics</p>
            </div>
            <p className="text-xs text-slate-400 mb-4">Veja gráficos detalhados e compare performance.</p>
            <button onClick={() => navigate('/analytics')} className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors">
              Ver Analytics →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
