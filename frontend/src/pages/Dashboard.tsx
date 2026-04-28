import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, DollarSign, Zap, Plus, ArrowUpRight, Target, BarChart3, Megaphone, Paintbrush } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { campaignsApi, metricsApi } from '../lib/api';
import { Tooltip as MetricTooltip } from '../components/Tooltip';

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

function StatusBadge({ status }: { status: Campaign['status'] }) {
  const map = {
    active: { label: 'Ativa', color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)', dot: true },
    paused: { label: 'Pausada', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)', dot: false },
    draft: { label: 'Rascunho', color: '#64748b', bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.25)', dot: false },
    completed: { label: 'Concluída', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.25)', dot: false },
  };
  const s = map[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full" style={{
      color: s.color, background: s.bg, border: `1px solid ${s.border}`,
    }}>
      {s.dot && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: s.color }} />}
      {s.label}
    </span>
  );
}

const PLATFORM_LABEL: Record<string, string> = { meta: 'Meta Ads', google: 'Google Ads', linkedin: 'LinkedIn' };

export default function Dashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [weekly, setWeekly] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-screen" style={{ background: '#080c14' }}>
      <div className="text-center">
        <div className="w-10 h-10 rounded-full border-2 border-blue-500 border-t-transparent spinner mx-auto mb-4" />
        <p className="text-slate-500 text-sm">Carregando seu painel...</p>
      </div>
    </div>
  );

  const activeCampaigns = campaigns.filter(c => c.status === 'active');
  const hasData = campaigns.length > 0;

  const metrics = [
    {
      label: 'Investimento Total',
      value: `R$ ${(summary?.spend || 0).toLocaleString('pt-BR')}`,
      desc: 'Total gasto em anúncios',
      tooltip: 'Soma de todo o orçamento investido nas campanhas ativas no período.',
      icon: DollarSign,
      gradient: ['#1d4ed8', '#3b82f6'],
      glow: 'rgba(59,130,246,0.15)',
    },
    {
      label: 'Leads Gerados',
      value: (summary?.leads || 0).toLocaleString('pt-BR'),
      desc: 'Contatos capturados',
      tooltip: 'Número de pessoas que demonstraram interesse e deixaram seus dados.',
      icon: Users,
      gradient: ['#047857', '#10b981'],
      glow: 'rgba(16,185,129,0.15)',
    },
    {
      label: 'CPA Médio',
      value: summary?.cpa ? `R$ ${summary.cpa.toFixed(2)}` : '—',
      desc: 'Custo por aquisição',
      tooltip: 'Custo Por Aquisição — quanto você paga em média para conquistar um lead. Quanto menor, melhor.',
      icon: Target,
      gradient: ['#c2410c', '#f97316'],
      glow: 'rgba(249,115,22,0.15)',
    },
    {
      label: 'ROAS',
      value: summary?.roas ? `${summary.roas.toFixed(1)}x` : '—',
      desc: 'Retorno sobre investimento',
      tooltip: 'Return On Ad Spend — para cada R$1 investido, quanto retornou em receita. Acima de 3x é considerado bom.',
      icon: Zap,
      gradient: ['#7c3aed', '#a78bfa'],
      glow: 'rgba(139,92,246,0.15)',
    },
  ];

  const quickActions = [
    { label: 'Nova Campanha', desc: 'Crie uma campanha em 5 passos', icon: Megaphone, path: '/wizard', color: '#3b82f6' },
    { label: 'Ver Analytics', desc: 'Gráficos e relatórios detalhados', icon: BarChart3, path: '/analytics', color: '#8b5cf6' },
    { label: 'Creative Studio', desc: 'Monte copies para seus anúncios', icon: Paintbrush, path: '/creative', color: '#10b981' },
  ];

  return (
    <div className="min-h-screen p-8" style={{ background: '#000' }}>

      {/* Header */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <p className="text-slate-500 text-sm mb-1">Bom dia, Lucas 👋</p>
          <h1 className="text-3xl font-bold text-white">Seu Painel</h1>
          <p className="text-slate-500 text-sm mt-2 max-w-md">
            Acompanhe o desempenho das suas campanhas em tempo real. Todas as métricas abaixo são atualizadas conforme você registra dados.
          </p>
        </div>
        <button
          onClick={() => navigate('/wizard')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #3DB8E8, #1a8ab8)', boxShadow: '0 0 24px rgba(61,184,232,0.3)' }}
        >
          <Plus className="w-4 h-4" /> Nova Campanha
        </button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {metrics.map(({ label, value, desc, tooltip, icon: Icon, gradient, glow }) => (
          <div key={label} className="rounded-2xl p-5 group transition-all duration-300 cursor-default" style={{
            background: 'rgba(15,23,42,0.8)',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: `0 0 0 rgba(0,0,0,0)`,
          }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 0 30px ${glow}`)}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = `0 0 0 rgba(0,0,0,0)`)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{
                background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
                boxShadow: `0 0 15px ${glow}`,
              }}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <MetricTooltip text={tooltip} />
            </div>
            <p className="text-2xl font-bold text-white mb-1">{value}</p>
            <p className="text-xs text-slate-500">{label}</p>
            <p className="text-xs text-slate-600 mt-0.5">{desc}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

        {/* Lista de Campanhas */}
        <div className="lg:col-span-2 rounded-2xl overflow-hidden" style={{
          background: 'rgba(15,23,42,0.8)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div className="px-6 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-white">Suas Campanhas</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activeCampaigns.length} ativa{activeCampaigns.length !== 1 ? 's' : ''} · {campaigns.length} no total
                </p>
              </div>
              {hasData && (
                <button onClick={() => navigate('/wizard')} className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Adicionar
                </button>
              )}
            </div>
          </div>

          {!hasData ? (
            <div className="p-12 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{
                background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.15))',
                border: '1px solid rgba(59,130,246,0.2)',
              }}>
                <Megaphone className="w-6 h-6 text-blue-400" />
              </div>
              <p className="text-white font-medium mb-2">Nenhuma campanha ainda</p>
              <p className="text-slate-500 text-sm mb-6 max-w-xs mx-auto">
                Crie sua primeira campanha para começar a acompanhar métricas aqui no painel.
              </p>
              <button
                onClick={() => navigate('/wizard')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #3b82f6, #6d28d9)', boxShadow: '0 0 20px rgba(59,130,246,0.25)' }}
              >
                <Plus className="w-4 h-4" /> Criar primeira campanha
              </button>
            </div>
          ) : (
            <>
              {/* Cabeçalho da tabela */}
              <div className="grid grid-cols-4 px-6 py-2.5 text-xs font-medium text-slate-600 uppercase tracking-wider" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span className="col-span-2">Campanha</span>
                <span className="text-right">Invest.</span>
                <span className="text-right">CPA</span>
              </div>
              <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                {campaigns.map((c) => (
                  <div key={c.id} className="grid grid-cols-4 items-center px-6 py-4 hover:bg-white/[0.02] transition-colors">
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-white mb-1">{c.name}</p>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={c.status} />
                        <span className="text-xs text-slate-600">{PLATFORM_LABEL[c.platform] || c.platform}</span>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-white text-right">
                      R$ {Number(c.total_spend).toLocaleString('pt-BR')}
                    </p>
                    <p className={`text-sm font-semibold text-right ${c.avg_cpa > 60 ? 'text-red-400' : c.avg_cpa > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>
                      {c.avg_cpa > 0 ? `R$ ${Number(c.avg_cpa).toFixed(0)}` : '—'}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Coluna lateral */}
        <div className="space-y-4">

          {/* Gráfico */}
          <div className="rounded-2xl p-5" style={{
            background: 'rgba(15,23,42,0.8)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-white">Leads por dia</h3>
              <span className="text-xs text-slate-600">7 dias</span>
            </div>
            <p className="text-xs text-slate-600 mb-4">Evolução dos leads gerados na semana</p>
            {weekly.length > 0 ? (
              <ResponsiveContainer width="100%" height={130}>
                <AreaChart data={weekly}>
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" stroke="transparent" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', fontSize: '12px' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Area type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={2} fill="url(#grad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-32 flex flex-col items-center justify-center text-center">
                <TrendingUp className="w-6 h-6 text-slate-700 mb-2" />
                <p className="text-xs text-slate-600">Gráfico aparece quando<br />você registrar métricas</p>
              </div>
            )}
          </div>

          {/* Ações rápidas */}
          <div className="rounded-2xl p-5" style={{
            background: 'rgba(15,23,42,0.8)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <h3 className="text-sm font-semibold text-white mb-1">Ações rápidas</h3>
            <p className="text-xs text-slate-600 mb-4">Navegue pelas ferramentas da plataforma</p>
            <div className="space-y-2">
              {quickActions.map(({ label, desc, icon: Icon, path, color }) => (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all hover:bg-white/5"
                  style={{ border: '1px solid rgba(255,255,255,0.04)' }}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}20` }}>
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{label}</p>
                    <p className="text-xs text-slate-600">{desc}</p>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-700 ml-auto flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Dica para usuário novo */}
      {!hasData && (
        <div className="rounded-2xl p-6 mt-2" style={{
          background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(139,92,246,0.08))',
          border: '1px solid rgba(59,130,246,0.15)',
        }}>
          <h3 className="text-sm font-semibold text-white mb-1">Como funciona o ÊXODOS PRO?</h3>
          <p className="text-xs text-slate-400 mb-4 max-w-2xl">
            Esta plataforma centraliza a gestão das suas campanhas de anúncios. Você cria campanhas, registra métricas diárias e acompanha tudo aqui no painel.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { step: '1', title: 'Crie uma campanha', desc: 'Use o Wizard para registrar uma campanha com plataforma, objetivo e orçamento.' },
              { step: '2', title: 'Registre métricas', desc: 'Adicione dados diários de spend, leads e conversões via API ou pelo painel.' },
              { step: '3', title: 'Acompanhe tudo', desc: 'Visualize CPA, ROAS, CTR e performance semana a semana no Dashboard e Analytics.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5" style={{
                  background: 'linear-gradient(135deg, #3b82f6, #6d28d9)',
                }}>
                  {step}
                </div>
                <div>
                  <p className="text-sm font-medium text-white mb-0.5">{title}</p>
                  <p className="text-xs text-slate-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
