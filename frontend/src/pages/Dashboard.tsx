import React, { useEffect, useState, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, DollarSign, Zap, Plus, Target, RefreshCw, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { campaignsApi, metricsApi, syncApi, analyzeApi } from '../lib/api';

const CYAN = '#3DB8E8';

interface Campaign {
  id: string; name: string; platform: string;
  status: 'active' | 'paused' | 'completed' | 'draft';
  avg_cpa: number; total_spend: number; total_leads: number;
}

interface Analysis {
  score: number;
  status: 'saudavel' | 'atencao' | 'critico';
  issues: string[];
  actions: { priority: 'alta' | 'media' | 'baixa'; acao: string; motivo: string }[];
}

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  active:    { label: 'Ativa',     color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  paused:    { label: 'Pausada',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  draft:     { label: 'Rascunho', color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
  completed: { label: 'Concluida', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
};

const PRIORITY_COLOR: Record<string, string> = {
  alta: '#ef4444', media: '#f59e0b', baixa: '#10b981',
};

const PLATFORM_LABEL: Record<string, string> = {
  meta: 'Meta Ads', google: 'Google Ads', linkedin: 'LinkedIn',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [weekly, setWeekly] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const [metricsRes, campaignsRes] = await Promise.all([
        metricsApi.dashboard().catch(() => null),
        campaignsApi.list().catch(() => ({ campaigns: [] })),
      ]);
      setSummary(metricsRes?.data?.summary || { spend: 0, leads: 0, cpa: 0, roas: 0, campaigns: 0 });
      setWeekly(metricsRes?.data?.weekly || []);
      setCampaigns(campaignsRes?.data?.campaigns || []);

      const analysisRes = await analyzeApi.dashboard().catch(() => null);
      if (analysisRes?.data) setAnalysis(analysisRes.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSync() {
    setSyncing(true);
    setSyncMsg('');
    try {
      const res = await syncApi.meta();
      setSyncMsg(res.data?.message || res.message || 'Sincronizado com sucesso!');
      await load();
    } catch (err: any) {
      setSyncMsg(err.response?.data?.error?.message || 'Erro ao sincronizar. Configure o Meta Ads em Configuracoes.');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(''), 5000);
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: `2px solid ${CYAN}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const kpis = [
    { label: 'Investimento', value: `R$ ${(summary?.spend || 0).toLocaleString('pt-BR')}`, icon: DollarSign, color: '#3b82f6' },
    { label: 'Leads Gerados', value: (summary?.leads || 0).toLocaleString('pt-BR'), icon: Users, color: '#10b981' },
    { label: 'CPA Medio', value: summary?.cpa > 0 ? `R$ ${Number(summary.cpa).toFixed(2)}` : '--', icon: Target, color: '#f97316' },
    { label: 'ROAS', value: summary?.roas > 0 ? `${Number(summary.roas).toFixed(1)}x` : '--', icon: Zap, color: '#a78bfa' },
  ];

  const scoreColor = !analysis ? '#64748b' : analysis.score >= 75 ? '#10b981' : analysis.score >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ minHeight: '100vh', background: '#000', padding: '32px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Dashboard</h1>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>Visao geral das suas campanhas</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {syncMsg && (
            <span style={{ fontSize: '12px', color: syncMsg.includes('Erro') ? '#ef4444' : '#10b981', padding: '6px 12px', borderRadius: '8px', background: syncMsg.includes('Erro') ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)' }}>
              {syncMsg}
            </span>
          )}
          <button
            onClick={handleSync}
            disabled={syncing}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: '10px', border: `1px solid ${CYAN}40`,
              background: `${CYAN}15`, color: CYAN, fontSize: '13px',
              fontWeight: 600, cursor: syncing ? 'not-allowed' : 'pointer',
              opacity: syncing ? 0.6 : 1, fontFamily: 'inherit',
            }}
          >
            <RefreshCw size={14} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
            {syncing ? 'Sincronizando...' : 'Sincronizar Meta Ads'}
          </button>
          <button
            onClick={() => navigate('/wizard')}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: '10px', border: 'none',
              background: `linear-gradient(135deg, ${CYAN}, #1a8ab8)`,
              color: '#000', fontSize: '13px', fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <Plus size={14} /> Nova Campanha
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {kpis.map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
              <Icon size={18} color={color} />
            </div>
            <p style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>{value}</p>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{label}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>

        {/* Coluna principal */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Analise IA */}
          {analysis && (
            <div style={{
              background: 'rgba(15,23,42,0.8)', border: `1px solid ${scoreColor}30`,
              borderRadius: '16px', padding: '20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <GraduationCapIcon color={scoreColor} />
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Analise IA</p>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Baseada nas suas metricas dos ultimos 7 dias</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '28px', fontWeight: 800, color: scoreColor, lineHeight: 1 }}>{analysis.score}</p>
                  <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>score / 100</p>
                </div>
              </div>

              {analysis.actions.slice(0, 3).map((action, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '10px',
                  padding: '10px 12px', borderRadius: '10px', marginBottom: '8px',
                  background: `${PRIORITY_COLOR[action.priority]}08`,
                  border: `1px solid ${PRIORITY_COLOR[action.priority]}20`,
                }}>
                  <div style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: PRIORITY_COLOR[action.priority], flexShrink: 0, marginTop: '5px',
                  }} />
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '2px' }}>{action.acao}</p>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{action.motivo}</p>
                  </div>
                  <span style={{
                    marginLeft: 'auto', fontSize: '10px', fontWeight: 700, flexShrink: 0,
                    padding: '2px 8px', borderRadius: '12px',
                    color: PRIORITY_COLOR[action.priority],
                    background: `${PRIORITY_COLOR[action.priority]}15`,
                  }}>{action.priority.toUpperCase()}</span>
                </div>
              ))}

              <button
                onClick={() => navigate('/professor')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  marginTop: '4px', background: 'none', border: 'none',
                  color: CYAN, fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'inherit', padding: 0,
                }}
              >
                Ver analise completa <ArrowRight size={13} />
              </button>
            </div>
          )}

          {/* Campanhas */}
          <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Campanhas</p>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>{campaigns.length} no total</span>
            </div>
            {campaigns.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginBottom: '12px' }}>Nenhuma campanha ainda.</p>
                <button onClick={() => navigate('/wizard')} style={{ background: CYAN, border: 'none', color: '#000', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Criar campanha
                </button>
              </div>
            ) : (
              <div>
                {campaigns.map((c) => {
                  const badge = STATUS_BADGE[c.status];
                  return (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '3px' }}>{c.name}</p>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '12px', color: badge.color, background: badge.bg }}>{badge.label}</span>
                          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{PLATFORM_LABEL[c.platform] || c.platform}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', marginLeft: '16px' }}>
                        <p style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>R$ {Number(c.total_spend).toLocaleString('pt-BR')}</p>
                        <p style={{ fontSize: '11px', color: c.avg_cpa > 60 ? '#ef4444' : c.avg_cpa > 0 ? '#10b981' : 'rgba(255,255,255,0.3)' }}>
                          {c.avg_cpa > 0 ? `CPA R$ ${Number(c.avg_cpa).toFixed(0)}` : 'Sem metricas'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Coluna lateral */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px' }}>
            <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Leads por dia</p>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginBottom: '16px' }}>Ultimos 7 dias</p>
            {weekly.length > 0 ? (
              <ResponsiveContainer width="100%" height={150}>
                <AreaChart data={weekly}>
                  <defs>
                    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CYAN} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={CYAN} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" stroke="transparent" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '11px' }} />
                  <Area type="monotone" dataKey="leads" stroke={CYAN} strokeWidth={2} fill="url(#g)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <TrendingUp size={24} color="rgba(255,255,255,0.15)" />
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '8px' }}>Grafico aparece apos sincronizar</p>
                </div>
              </div>
            )}
          </div>

          {analysis && analysis.issues.length > 0 && (
            <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px' }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={14} color="#f59e0b" /> Problemas detectados
              </p>
              {analysis.issues.map((issue, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#f59e0b', flexShrink: 0, marginTop: '6px' }} />
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.5' }}>{issue}</p>
                </div>
              ))}
            </div>
          )}

          {analysis && analysis.issues.length === 0 && (
            <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
              <CheckCircle size={28} color="#10b981" style={{ margin: '0 auto 8px' }} />
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>Tudo saudavel!</p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Suas metricas estao dentro do esperado.</p>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function GraduationCapIcon({ color }: { color: string }) {
  return (
    <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
        <path d="M6 12v5c3 3 9 3 12 0v-5"/>
      </svg>
    </div>
  );
}
