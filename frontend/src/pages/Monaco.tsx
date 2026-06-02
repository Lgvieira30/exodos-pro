import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Building2, RefreshCw, Upload, ChevronDown, ChevronRight, TrendingUp, TrendingDown,
  Minus, DollarSign, Users, Target, Trophy, Clock, Zap, AlertCircle, CheckCircle,
  X, Copy, Eye, EyeOff, Info,
} from 'lucide-react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from 'recharts';
import { monacoApi, integrationsApi } from '../lib/api';

// ─── Theme ────────────────────────────────────────────────────────────────────
const BG = '#090909';
const BG_CARD = '#0E0F12';
const BG_ELEVATED = '#13141A';
const BORDER = 'rgba(255,255,255,0.06)';
const BORDER_MED = 'rgba(255,255,255,0.1)';
const FG = '#F0F0F0';
const FG_MUTED = 'rgba(240,240,240,0.45)';
const FG_SUBTLE = 'rgba(240,240,240,0.2)';
const CYAN = '#3DB8E8';
const CYAN_DIM = 'rgba(61,184,232,0.12)';
const GREEN = '#4ADE80';
const GREEN_DIM = 'rgba(74,222,128,0.12)';
const RED = '#F87171';
const RED_DIM = 'rgba(248,113,113,0.12)';
const AMBER = '#FCD34D';
const AMBER_DIM = 'rgba(252,211,77,0.1)';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtBRL = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 });
const fmtNum = (n: number) => Math.round(n).toLocaleString('pt-BR');
const fmtPct = (n: number) => n.toFixed(1) + '%';
const fmtShort = (n: number) =>
  n >= 1000 ? (n / 1000).toFixed(1) + 'k' : fmtNum(n);

function delta(curr: number, prev: number): number {
  if (!prev || prev === 0) return 0;
  return ((curr - prev) / prev) * 100;
}

function parseBRNum(s: string): number {
  const clean = String(s || '').replace(/[R$\s]/g, '');
  if (clean.includes(',') && clean.includes('.')) return parseFloat(clean.replace(/\./g, '').replace(',', '.'));
  if (clean.includes(',')) return parseFloat(clean.replace(',', '.'));
  return parseFloat(clean) || 0;
}

function parseDateStr(val: any): string {
  if (!val) return '';
  const s = String(val);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.split('T')[0];
  if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) {
    const [d, m, y] = s.split('/');
    return `${y}-${m}-${d}`;
  }
  // Google Sheets serial
  if (/^\d+(\.\d+)?$/.test(s)) {
    const serial = parseFloat(s);
    const d = new Date(Math.round((serial - 25569) * 86400 * 1000));
    return d.toISOString().split('T')[0];
  }
  return s;
}

function getWeekRange(offsetWeeks = 0) {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offsetWeeks * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const today = now.toISOString().split('T')[0];
  return {
    from: monday.toISOString().split('T')[0],
    to: offsetWeeks === 0 ? today : sunday.toISOString().split('T')[0],
  };
}

function getLast(days: number, offset = 0) {
  const end = new Date(Date.now() - offset * days * 86400000);
  const start = new Date(end.getTime() - days * 86400000);
  return {
    from: start.toISOString().split('T')[0],
    to: end.toISOString().split('T')[0],
  };
}

const PRESETS = [
  { label: 'Esta Semana', get: () => getWeekRange(0), compare: () => getWeekRange(-1) },
  { label: 'Semana Passada', get: () => getWeekRange(-1), compare: () => getWeekRange(-2) },
  { label: 'Últimos 7d', get: () => getLast(7), compare: () => getLast(7, 1) },
  { label: 'Maio 2026', get: () => ({ from: '2026-05-01', to: '2026-05-31' }), compare: () => ({ from: '2026-04-01', to: '2026-04-30' }) },
  { label: 'Últimos 30d', get: () => getLast(30), compare: () => getLast(30, 1) },
];

// ─── Build campaign tree from flat rows ───────────────────────────────────────
function buildTree(rows: any[]) {
  const map = new Map<string, any>();
  for (const r of rows) {
    const k = r.campanha || '(sem campanha)';
    if (!map.has(k)) map.set(k, { campanha: k, invest: 0, impressoes: 0, cliques: 0, conversoes_ads: 0, leads_crm: 0, ganhou: 0, perdeu: 0, aberto: 0, groups: new Map() });
    const c = map.get(k)!;
    c.invest += r.invest; c.impressoes += r.impressoes; c.cliques += r.cliques;
    c.conversoes_ads += r.conversoes_ads; c.leads_crm += r.leads_crm;
    c.ganhou += r.ganhou; c.perdeu += r.perdeu; c.aberto += r.aberto;
    const gk = r.grupo || '(sem grupo)';
    if (!c.groups.has(gk)) c.groups.set(gk, { grupo: gk, invest: 0, impressoes: 0, cliques: 0, leads_crm: 0, ganhou: 0, perdeu: 0, aberto: 0, ads: [] });
    const g = c.groups.get(gk)!;
    g.invest += r.invest; g.impressoes += r.impressoes; g.cliques += r.cliques;
    g.leads_crm += r.leads_crm; g.ganhou += r.ganhou; g.perdeu += r.perdeu; g.aberto += r.aberto;
    g.ads.push(r);
  }
  return Array.from(map.values()).map((c) => ({
    ...c,
    groups: Array.from(c.groups.values()).map((g: any) => ({
      ...g,
      cpl_crm: g.leads_crm > 0 ? g.invest / g.leads_crm : 0,
      win_rate: g.leads_crm > 0 ? (g.ganhou / g.leads_crm) * 100 : 0,
      ctr: g.impressoes > 0 ? (g.cliques / g.impressoes) * 100 : 0,
    })).sort((a: any, b: any) => b.invest - a.invest),
    cpl_crm: c.leads_crm > 0 ? c.invest / c.leads_crm : 0,
    win_rate: c.leads_crm > 0 ? (c.ganhou / c.leads_crm) * 100 : 0,
    ctr: c.impressoes > 0 ? (c.cliques / c.impressoes) * 100 : 0,
    cpc: c.cliques > 0 ? c.invest / c.cliques : 0,
  })).sort((a, b) => b.invest - a.invest);
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function DeltaBadge({ curr, prev, inverse = false, suffix = '%' }: { curr: number; prev: number | null; inverse?: boolean; suffix?: string }) {
  if (!prev) return null;
  const d = delta(curr, prev);
  if (Math.abs(d) < 0.5) return <span style={{ color: FG_SUBTLE, fontSize: 11 }}>→ sem mudança</span>;
  const positive = inverse ? d < 0 : d > 0;
  const color = positive ? GREEN : RED;
  const Icon = d > 0 ? TrendingUp : TrendingDown;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color, fontSize: 11, fontWeight: 500 }}>
      <Icon size={10} />
      {d > 0 ? '+' : ''}{d.toFixed(1)}{suffix}
    </span>
  );
}

function KpiCard({ icon: Icon, label, value, prevValue, sub, color = CYAN, inverse = false, suffix = '' }: any) {
  const d = prevValue != null ? delta(typeof value === 'number' ? value : 0, prevValue) : null;
  const positive = d != null ? (inverse ? d < 0 : d > 0) : null;

  return (
    <div style={{
      background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '18px 20px',
      display: 'flex', flexDirection: 'column', gap: 10, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${color}60, transparent)` }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: FG_MUTED, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</span>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={13} color={color} />
        </div>
      </div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 700, color: FG, letterSpacing: '-0.5px', lineHeight: 1.1 }}>
          {typeof value === 'number' ? (suffix === 'brl' ? fmtBRL(value) : suffix === 'pct' ? fmtPct(value) : fmtShort(value)) : value}
        </div>
        {sub && <div style={{ fontSize: 11, color: FG_SUBTLE, marginTop: 3 }}>{sub}</div>}
      </div>
      {d !== null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, borderTop: `1px solid ${BORDER}`, paddingTop: 8 }}>
          {positive !== null && (
            <span style={{ color: positive ? GREEN : RED, fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
              {d > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {d > 0 ? '+' : ''}{d.toFixed(1)}%
            </span>
          )}
          {prevValue != null && (
            <span style={{ color: FG_SUBTLE, fontSize: 11 }}>
              vs {suffix === 'brl' ? fmtBRL(prevValue) : suffix === 'pct' ? fmtPct(prevValue) : fmtShort(prevValue)} anterior
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; color: string; label: string }> = {
    Ganhou: { bg: GREEN_DIM, color: GREEN, label: 'Ganhou' },
    Perdeu: { bg: RED_DIM, color: RED, label: 'Perdeu' },
    Aberto: { bg: AMBER_DIM, color: AMBER, label: 'Aberto' },
  };
  const s = cfg[status] || { bg: 'rgba(255,255,255,0.05)', color: FG_MUTED, label: status };
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4, letterSpacing: '0.04em' }}>
      {s.label}
    </span>
  );
}

function WinBar({ ganhou, aberto, perdeu }: { ganhou: number; aberto: number; perdeu: number }) {
  const total = ganhou + aberto + perdeu;
  if (!total) return <span style={{ color: FG_SUBTLE, fontSize: 11 }}>—</span>;
  const gPct = (ganhou / total) * 100;
  const aPct = (aberto / total) * 100;
  const pPct = (perdeu / total) * 100;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 80 }}>
      <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', gap: 1 }}>
        {gPct > 0 && <div style={{ width: `${gPct}%`, background: GREEN, borderRadius: 3 }} />}
        {aPct > 0 && <div style={{ width: `${aPct}%`, background: AMBER, borderRadius: 3 }} />}
        {pPct > 0 && <div style={{ width: `${pPct}%`, background: RED, borderRadius: 3 }} />}
      </div>
      <div style={{ fontSize: 10, color: FG_SUBTLE, display: 'flex', gap: 6 }}>
        <span style={{ color: GREEN }}>{ganhou}G</span>
        {aberto > 0 && <span style={{ color: AMBER }}>{aberto}A</span>}
        <span style={{ color: RED }}>{perdeu}P</span>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: BG_ELEVATED, border: `1px solid ${BORDER_MED}`, borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ color: FG_MUTED, marginBottom: 6, fontWeight: 600 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color || FG, display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color, display: 'inline-block' }} />
          <span style={{ color: FG_MUTED }}>{p.name}:</span>
          <span style={{ fontWeight: 600 }}>
            {p.name === 'Invest' ? fmtBRL(p.value) : fmtNum(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Monaco() {
  const [report, setReport] = useState<any>(null);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [presetIdx, setPresetIdx] = useState(0);
  const [period, setPeriod] = useState(PRESETS[0].get());
  const [comparePeriod, setComparePeriod] = useState(PRESETS[0].compare());
  const [expandedCamps, setExpandedCamps] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const [showImportCrm, setShowImportCrm] = useState(false);
  const [importCrmText, setImportCrmText] = useState('');
  const [importingCrm, setImportingCrm] = useState(false);
  const [importCrmMsg, setImportCrmMsg] = useState('');
  const [showSetup, setShowSetup] = useState(false);
  const [moskitKey, setMoskitKey] = useState('');
  const [moskitNick, setMoskitNick] = useState('Monaco - Produção');
  const [savingKey, setSavingKey] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [showSnippet, setShowSnippet] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const r = await monacoApi.syncStatus();
      setSyncStatus(r.data);
    } catch {}
  }, []);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const r = await monacoApi.report({
        from: period.from,
        to: period.to,
        compare_from: comparePeriod.from,
        compare_to: comparePeriod.to,
      });
      setReport(r.data);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [period, comparePeriod]);

  useEffect(() => { loadStatus(); }, []);
  useEffect(() => { loadReport(); }, [loadReport]);

  const handlePreset = (idx: number) => {
    setPresetIdx(idx);
    setPeriod(PRESETS[idx].get());
    setComparePeriod(PRESETS[idx].compare());
  };

  const handleSyncMoskit = async () => {
    setSyncing(true);
    setSyncMsg('');
    try {
      const r = await monacoApi.syncMoskit();
      const d = r.data;
      setSyncMsg(`✅ ${d.synced} novos, ${d.updated} atualizados — buscados: ${d.total_fetched ?? '?'} deals (${d.excluded_filter ?? 0} excluídos pelo filtro Mônaco, ${d.older_than_cutoff ?? 0} mais antigos que 01/05)`);
      await Promise.all([loadStatus(), loadReport()]);
    } catch (e: any) {
      setSyncMsg('❌ ' + (e.response?.data?.error?.message || e.message));
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveKey = async () => {
    if (!moskitKey.trim()) return;
    setSavingKey(true);
    try {
      await integrationsApi.save({
        platform: 'moskit',
        access_token: moskitKey.trim(),
        account_id: 'monaco',
        nickname: moskitNick || 'Monaco - Produção',
      });
      setShowSetup(false);
      setMoskitKey('');
      await loadStatus();
    } catch (e: any) {
      alert('Erro: ' + (e.response?.data?.error?.message || e.message));
    } finally {
      setSavingKey(false);
    }
  };

  const handleImport = async () => {
    if (!importText.trim()) return;
    setImporting(true);
    setImportMsg('');
    try {
      let rows: any[];
      const text = importText.trim();
      if (text.startsWith('[') || text.startsWith('{')) {
        rows = JSON.parse(text);
        if (!Array.isArray(rows)) rows = [rows];
      } else {
        // CSV parse
        const lines = text.split('\n').filter((l) => l.trim());
        const headerLine = lines[0].split(/[,\t;]/);
        const headers = headerLine.map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
        rows = lines.slice(1).map((line) => {
          const vals = line.split(/[,\t;]/);
          const obj: any = {};
          headers.forEach((h, i) => { obj[h] = (vals[i] || '').trim().replace(/^"|"$/g, ''); });
          return obj;
        });
      }
      // Normalize
      const normalized = rows.map((r) => ({
        data: parseDateStr(r.data || r.date || r.Data || r.Date),
        conta: r.conta || r.Conta || r.account || 'Mônaco',
        campanha: r.campanha || r.Campanha || r.campaign || '',
        grupo: r.grupo || r.Grupo || r.ad_group || '',
        anuncio: r.anuncio || r.Anuncio || r.ad || r.id || '',
        investimento: parseBRNum(String(r.investimento || r.Investimento || r.cost || r.invest || 0)),
        impressoes: parseBRNum(String(r.impressoes || r.Impressoes || r.impressions || 0)),
        cliques: parseBRNum(String(r.cliques || r.Cliques || r.clicks || 0)),
        conversoes: parseBRNum(String(r.conversoes || r.Conversoes || r.conversions || 0)),
      })).filter((r) => r.data && r.data.length === 10);

      if (!normalized.length) throw new Error('Nenhuma linha válida encontrada. Verifique o formato.');
      const resp = await monacoApi.ingestAds(normalized);
      setImportMsg(`✅ ${resp.data.inserted} inseridas, ${resp.data.updated} atualizadas (${normalized.length} linhas processadas)`);
      setImportText('');
      await Promise.all([loadStatus(), loadReport()]);
    } catch (e: any) {
      setImportMsg('❌ ' + e.message);
    } finally {
      setImporting(false);
    }
  };

  const handleImportCrm = async () => {
    if (!importCrmText.trim()) return;
    setImportingCrm(true);
    setImportCrmMsg('');
    try {
      let rows: any[];
      const text = importCrmText.trim();
      if (text.startsWith('[') || text.startsWith('{')) {
        rows = JSON.parse(text);
        if (!Array.isArray(rows)) rows = [rows];
      } else {
        const lines = text.split('\n').filter((l) => l.trim());
        const headers = lines[0].split(/[,\t;]/).map((h) => h.trim().toLowerCase().replace(/[\s-]+/g, '_'));
        rows = lines.slice(1).map((line) => {
          const vals = line.split(/[,\t;]/);
          const obj: any = {};
          headers.forEach((h, i) => { obj[h] = (vals[i] || '').trim().replace(/^"|"$/g, ''); });
          return obj;
        });
      }
      const normalized = rows.map((r) => ({
        data: parseDateStr(r.data || r.date || r.Data || r.Date),
        lead: String(r.lead || r.Lead || r.nome || r.Nome || ''),
        status: String(r.status || r.Status || 'Aberto'),
        campanha: String(r.campanha || r.Campanha || ''),
        grupo: String(r.grupo || r.Grupo || ''),
        anuncio: String(r.anuncio || r.Anuncio || r.anúncio || ''),
        lp: String(r.lp || r.LP || ''),
        match: String(r.match || r.Match || ''),
        palavra_chave: String(r.palavra_chave || r['palavra-chave'] || r.palavrachave || ''),
      })).filter((r) => r.data && r.lead);
      if (!normalized.length) throw new Error('Nenhuma linha válida encontrada. Campos obrigatórios: data, lead.');
      const resp = await monacoApi.ingestCrm(normalized);
      setImportCrmMsg(`✅ ${resp.data.inserted} inseridos, ${resp.data.updated} atualizados (${normalized.length} linhas)`);
      setImportCrmText('');
      await Promise.all([loadStatus(), loadReport()]);
    } catch (e: any) {
      setImportCrmMsg('❌ ' + e.message);
    } finally {
      setImportingCrm(false);
    }
  };

  const campaignTree = useMemo(() => buildTree(report?.campaigns || []), [report]);

  const summary = report?.summary;
  const comparison = report?.comparison;
  const daily = report?.daily || [];
  const keywords = report?.keywords || [];
  const hasMoskit = syncStatus?.moskit != null;
  const hasData = (syncStatus?.leads_count || 0) > 0 || (syncStatus?.ads_count || 0) > 0;

  const snippetCode = `// Adicione esta função ao seu script do Google Ads (MCC)
// Chame enviarParaExodosPro() no final de processarCliente() para conta Mônaco

function enviarParaExodosPro(dados) {
  var TOKEN = PropertiesService.getScriptProperties().getProperty('EXODOS_TOKEN');
  // Salve seu token: Projeto > Propriedades do script > EXODOS_TOKEN
  // Para pegar o token: faça login no Êxodos Pro > F12 > Application > localStorage > token

  var ENDPOINT = 'SEU_BACKEND_URL/api/monaco/ingest/ads';

  try {
    UrlFetchApp.fetch(ENDPOINT, {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + TOKEN },
      muteHttpExceptions: true,
      payload: JSON.stringify({ rows: dados })
    });
  } catch(e) { Logger.log('Êxodos erro: ' + e.message); }
}`;

  const formatDateLabel = (s: string) => {
    if (!s) return '';
    const parts = s.split('-');
    return `${parts[2]}/${parts[1]}`;
  };

  return (
    <div style={{ padding: '28px 28px 48px', minHeight: '100vh', background: BG }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: CYAN_DIM, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${CYAN}30` }}>
              <Building2 size={18} color={CYAN} />
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: FG, margin: 0, letterSpacing: '-0.3px' }}>Relatório Mônaco</h1>
              <p style={{ fontSize: 12, color: FG_MUTED, margin: 0 }}>Google Ads + CRM Moskit — Gestão Documental</p>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setShowImportCrm(true)} style={btnStyle('secondary')}>
            <Users size={13} /> Importar CRM
          </button>
          <button onClick={() => setShowImport(true)} style={btnStyle('secondary')}>
            <Upload size={13} /> Importar Ads
          </button>
          <button onClick={() => setShowSetup(true)} style={btnStyle('secondary')}>
            <AlertCircle size={13} /> {hasMoskit ? 'Moskit ✓' : 'Configurar Moskit'}
          </button>
          <button onClick={handleSyncMoskit} disabled={syncing || !hasMoskit} style={btnStyle('primary', syncing || !hasMoskit)}>
            <RefreshCw size={13} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
            {syncing ? 'Sincronizando…' : 'Sync Moskit'}
          </button>
        </div>
      </div>

      {/* ── Sync message ── */}
      {syncMsg && (
        <div style={{ background: syncMsg.startsWith('✅') ? GREEN_DIM : RED_DIM, border: `1px solid ${syncMsg.startsWith('✅') ? GREEN : RED}30`, borderRadius: 8, padding: '8px 14px', marginBottom: 16, fontSize: 13, color: syncMsg.startsWith('✅') ? GREEN : RED, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {syncMsg}
          <button onClick={() => setSyncMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}><X size={14} /></button>
        </div>
      )}

      {/* ── Status bar ── */}
      <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '10px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        {!hasMoskit && (
          <span style={{ color: AMBER, fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
            <AlertCircle size={12} /> Moskit não conectado —{' '}
            <button onClick={() => setShowSetup(true)} style={{ background: 'none', border: 'none', color: CYAN, cursor: 'pointer', fontSize: 12, padding: 0 }}>configurar agora</button>
          </span>
        )}
        {hasMoskit && (
          <span style={{ color: GREEN, fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
            <CheckCircle size={12} /> Moskit conectado
          </span>
        )}
        <span style={{ color: FG_MUTED, fontSize: 12 }}>{syncStatus?.leads_count || 0} leads CRM</span>
        <span style={{ color: FG_MUTED, fontSize: 12 }}>·</span>
        <span style={{ color: FG_MUTED, fontSize: 12 }}>{syncStatus?.ads_count || 0} linhas Google Ads</span>
        {syncStatus?.moskit?.last_sync_at && (
          <>
            <span style={{ color: FG_MUTED, fontSize: 12 }}>·</span>
            <span style={{ color: FG_SUBTLE, fontSize: 12 }}>
              Sync: {new Date(syncStatus.moskit.last_sync_at).toLocaleString('pt-BR')}
            </span>
          </>
        )}
      </div>

      {/* ── Period selector ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: FG_MUTED }}>Período:</span>
        {PRESETS.map((p, i) => (
          <button key={i} onClick={() => handlePreset(i)} style={{
            padding: '5px 12px', borderRadius: 6, border: `1px solid ${i === presetIdx ? CYAN : BORDER}`,
            background: i === presetIdx ? CYAN_DIM : 'transparent', color: i === presetIdx ? CYAN : FG_MUTED,
            fontSize: 12, cursor: 'pointer', fontWeight: i === presetIdx ? 600 : 400,
          }}>
            {p.label}
          </button>
        ))}
        <span style={{ marginLeft: 8, fontSize: 12, color: FG_MUTED }}>
          {period.from} → {period.to}
        </span>
        <span style={{ fontSize: 12, color: FG_SUBTLE, marginLeft: 8 }}>
          vs {comparePeriod.from} → {comparePeriod.to}
        </span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: FG_MUTED }}>
          <div style={{ fontSize: 14 }}>Carregando dados…</div>
        </div>
      ) : (
        <>
          {/* ── KPI Grid ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
            <KpiCard icon={DollarSign} label="Investido" value={summary?.invest || 0} prevValue={comparison?.invest} suffix="brl" color={CYAN} />
            <KpiCard icon={Users} label="Leads CRM" value={summary?.leads_crm || 0} prevValue={comparison?.leads_crm} color={GREEN} />
            <KpiCard icon={Target} label="CPL Real" value={summary?.cpl_crm || 0} prevValue={comparison?.cpl_crm} suffix="brl" inverse color={AMBER} />
            <KpiCard icon={Trophy} label="Taxa de Ganho" value={summary?.win_rate || 0} prevValue={comparison?.win_rate} suffix="pct" color={GREEN} sub={`${fmtNum(summary?.ganhou || 0)} ganhos`} />
            <KpiCard icon={Clock} label="Em Aberto" value={summary?.aberto || 0} prevValue={comparison?.aberto} color={AMBER} inverse sub="aguardando" />
            <KpiCard icon={Zap} label="Conv. Ads" value={summary?.conversoes_ads || 0} prevValue={comparison?.conversoes_ads} color={CYAN} sub={`CPL ${fmtBRL(summary?.cpl_ads || 0)}`} />
          </div>

          {/* ── Comparison banner ── */}
          {comparison && (
            <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '20px 24px', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <TrendingUp size={14} color={CYAN} />
                <span style={{ fontSize: 13, fontWeight: 600, color: FG }}>Comparativo de Período</span>
                <span style={{ fontSize: 11, color: FG_SUBTLE, marginLeft: 8 }}>
                  {PRESETS[presetIdx].label} vs período anterior
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 0 }}>
                {[
                  { label: 'Investimento', curr: summary?.invest, prev: comparison?.invest, fmt: fmtBRL, inverse: false },
                  { label: 'Leads CRM', curr: summary?.leads_crm, prev: comparison?.leads_crm, fmt: fmtNum, inverse: false },
                  { label: 'CPL Real', curr: summary?.cpl_crm, prev: comparison?.cpl_crm, fmt: fmtBRL, inverse: true },
                  { label: 'Taxa de Ganho', curr: summary?.win_rate, prev: comparison?.win_rate, fmt: fmtPct, inverse: false },
                  { label: 'Leads Perdidos', curr: summary?.perdeu, prev: comparison?.perdeu, fmt: fmtNum, inverse: true },
                  { label: 'Conv. Google Ads', curr: summary?.conversoes_ads, prev: comparison?.conversoes_ads, fmt: fmtNum, inverse: false },
                ].map((item, i) => {
                  const d = delta(item.curr || 0, item.prev || 0);
                  const better = item.inverse ? d < 0 : d > 0;
                  const color = Math.abs(d) < 0.5 ? FG_MUTED : better ? GREEN : RED;
                  return (
                    <div key={i} style={{ padding: '12px 16px', borderRight: `1px solid ${BORDER}`, borderBottom: i < 3 ? `1px solid ${BORDER}` : 'none' }}>
                      <div style={{ fontSize: 11, color: FG_SUBTLE, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span style={{ fontSize: 18, fontWeight: 700, color: FG }}>{item.fmt(item.curr || 0)}</span>
                        <span style={{ fontSize: 11, color }}>
                          {d > 0 ? '↑' : d < 0 ? '↓' : '→'} {Math.abs(d).toFixed(1)}%
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: FG_SUBTLE, marginTop: 3 }}>vs {item.fmt(item.prev || 0)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Charts row ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, marginBottom: 24, '@media(max-width:900px)': { gridTemplateColumns: '1fr' } as any }}>

            {/* Daily chart */}
            <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '20px 20px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: FG }}>Leads por Dia</div>
                  <div style={{ fontSize: 11, color: FG_MUTED }}>CRM (barras) + Investimento Ads (linha)</div>
                </div>
                <div style={{ display: 'flex', gap: 10, fontSize: 10, color: FG_SUBTLE }}>
                  <span style={{ color: GREEN }}>■ Ganhou</span>
                  <span style={{ color: AMBER }}>■ Aberto</span>
                  <span style={{ color: RED }}>■ Perdeu</span>
                </div>
              </div>
              {daily.length === 0 ? (
                <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: FG_SUBTLE, fontSize: 13 }}>
                  Sem dados para o período selecionado
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={daily} margin={{ top: 0, right: 40, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={formatDateLabel} tick={{ fill: FG_SUBTLE, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" tick={{ fill: FG_SUBTLE, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill: FG_SUBTLE, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar yAxisId="left" dataKey="ganhou" stackId="crm" fill={GREEN} name="Ganhou" radius={0} />
                    <Bar yAxisId="left" dataKey="aberto" stackId="crm" fill={AMBER} name="Aberto" radius={0} />
                    <Bar yAxisId="left" dataKey="perdeu" stackId="crm" fill={RED} name="Perdeu" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="invest" stroke={CYAN} strokeWidth={2} dot={false} name="Invest" />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Funnel */}
            <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '20px 20px' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: FG, marginBottom: 4 }}>Funil de Conversão</div>
              <div style={{ fontSize: 11, color: FG_MUTED, marginBottom: 20 }}>Google Ads → CRM Mônaco</div>

              {(() => {
                const cliques = summary?.cliques || 0;
                const leads = summary?.leads_crm || 0;
                const ganhou = summary?.ganhou || 0;
                const aberto = summary?.aberto || 0;
                const perdeu = summary?.perdeu || 0;
                const taxaLead = cliques > 0 ? (leads / cliques) * 100 : 0;
                const taxaGanho = leads > 0 ? (ganhou / leads) * 100 : 0;

                const FunnelStep = ({ width, n, label, color, rate, rateLabel }: any) => (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: `${width}%`, background: color, borderRadius: 6, padding: '10px 12px', textAlign: 'center', transition: 'all 0.3s' }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: BG, letterSpacing: '-0.5px' }}>{fmtShort(n)}</div>
                      <div style={{ fontSize: 10, color: `${BG}cc`, fontWeight: 600 }}>{label}</div>
                    </div>
                    {rate != null && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: FG_SUBTLE, fontSize: 11 }}>
                        <div style={{ width: 1, height: 14, background: BORDER_MED }} />
                        <span style={{ color: CYAN }}>{fmtPct(rate)}</span>
                        <span>{rateLabel}</span>
                      </div>
                    )}
                  </div>
                );

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <FunnelStep width={100} n={cliques} label="Cliques Google Ads" color={CYAN} rate={taxaLead} rateLabel="virou lead" />
                    <FunnelStep width={80} n={leads} label="Leads no CRM" color="#60A5FA" rate={null} rateLabel="" />
                    <div style={{ fontSize: 11, color: FG_SUBTLE, textAlign: 'center' }}>↓ resultado final</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                      <div style={{ background: GREEN_DIM, border: `1px solid ${GREEN}30`, borderRadius: 8, padding: '10px 8px', textAlign: 'center' }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: GREEN }}>{fmtNum(ganhou)}</div>
                        <div style={{ fontSize: 9, color: GREEN, fontWeight: 600 }}>GANHOU</div>
                        <div style={{ fontSize: 10, color: GREEN, opacity: 0.7 }}>{fmtPct(taxaGanho)}</div>
                      </div>
                      <div style={{ background: AMBER_DIM, border: `1px solid ${AMBER}30`, borderRadius: 8, padding: '10px 8px', textAlign: 'center' }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: AMBER }}>{fmtNum(aberto)}</div>
                        <div style={{ fontSize: 9, color: AMBER, fontWeight: 600 }}>ABERTO</div>
                        <div style={{ fontSize: 10, color: AMBER, opacity: 0.7 }}>{leads > 0 ? fmtPct((aberto / leads) * 100) : '—'}</div>
                      </div>
                      <div style={{ background: RED_DIM, border: `1px solid ${RED}30`, borderRadius: 8, padding: '10px 8px', textAlign: 'center' }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: RED }}>{fmtNum(perdeu)}</div>
                        <div style={{ fontSize: 9, color: RED, fontWeight: 600 }}>PERDEU</div>
                        <div style={{ fontSize: 10, color: RED, opacity: 0.7 }}>{leads > 0 ? fmtPct((perdeu / leads) * 100) : '—'}</div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* ── Campaign Table ── */}
          <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 14, marginBottom: 24, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Target size={14} color={CYAN} />
              <span style={{ fontSize: 13, fontWeight: 600, color: FG }}>Campanhas & Anúncios</span>
              <span style={{ fontSize: 11, color: FG_SUBTLE }}>(clique para expandir)</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: BG_ELEVATED }}>
                    {['Campanha / Grupo / Anúncio', 'Invest', 'Cliques', 'CTR', 'CPC', 'Leads CRM', 'Ganhou', 'CPL CRM', 'Win Rate'].map((h) => (
                      <th key={h} style={{ padding: '9px 14px', textAlign: 'left', color: FG_SUBTLE, fontWeight: 600, fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: `1px solid ${BORDER}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {campaignTree.length === 0 ? (
                    <tr><td colSpan={9} style={{ padding: '32px 20px', textAlign: 'center', color: FG_SUBTLE }}>Sem dados de campanha para este período</td></tr>
                  ) : campaignTree.map((camp) => {
                    const campKey = camp.campanha;
                    const isExpCamp = expandedCamps.has(campKey);
                    return (
                      <React.Fragment key={campKey}>
                        {/* Campaign row */}
                        <tr
                          onClick={() => {
                            const s = new Set(expandedCamps);
                            isExpCamp ? s.delete(campKey) : s.add(campKey);
                            setExpandedCamps(s);
                          }}
                          style={{ cursor: 'pointer', borderBottom: `1px solid ${BORDER}`, transition: 'background 0.1s' }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = BG_ELEVATED)}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <td style={{ padding: '11px 14px', color: FG, fontWeight: 600 }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {isExpCamp ? <ChevronDown size={12} color={CYAN} /> : <ChevronRight size={12} color={FG_SUBTLE} />}
                              <span style={{ color: CYAN, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }} title={camp.campanha}>{camp.campanha}</span>
                            </span>
                          </td>
                          <td style={td}>{fmtBRL(camp.invest)}</td>
                          <td style={td}>{fmtShort(camp.cliques)}</td>
                          <td style={td}>{fmtPct(camp.ctr)}</td>
                          <td style={td}>{fmtBRL(camp.cpc)}</td>
                          <td style={td}><span style={{ fontWeight: 700, color: FG }}>{fmtNum(camp.leads_crm)}</span></td>
                          <td style={td}><WinBar ganhou={camp.ganhou} aberto={camp.aberto} perdeu={camp.perdeu} /></td>
                          <td style={td}>{camp.leads_crm > 0 ? fmtBRL(camp.cpl_crm) : '—'}</td>
                          <td style={td}>
                            {camp.leads_crm > 0 ? (
                              <span style={{ color: camp.win_rate >= 50 ? GREEN : camp.win_rate >= 30 ? AMBER : RED, fontWeight: 700 }}>
                                {fmtPct(camp.win_rate)}
                              </span>
                            ) : '—'}
                          </td>
                        </tr>

                        {/* Group rows */}
                        {isExpCamp && camp.groups.map((grp: any) => {
                          const grpKey = `${campKey}|${grp.grupo}`;
                          const isExpGrp = expandedGroups.has(grpKey);
                          return (
                            <React.Fragment key={grpKey}>
                              <tr
                                onClick={() => {
                                  const s = new Set(expandedGroups);
                                  isExpGrp ? s.delete(grpKey) : s.add(grpKey);
                                  setExpandedGroups(s);
                                }}
                                style={{ cursor: 'pointer', background: `${BG_ELEVATED}80`, borderBottom: `1px solid ${BORDER}` }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = BG_ELEVATED)}
                                onMouseLeave={(e) => (e.currentTarget.style.background = `${BG_ELEVATED}80`)}
                              >
                                <td style={{ padding: '9px 14px 9px 32px', color: FG_MUTED }}>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {isExpGrp ? <ChevronDown size={11} color={AMBER} /> : <ChevronRight size={11} color={FG_SUBTLE} />}
                                    <span style={{ color: FG_MUTED }}>{grp.grupo || '(sem grupo)'}</span>
                                  </span>
                                </td>
                                <td style={tdSm}>{fmtBRL(grp.invest)}</td>
                                <td style={tdSm}>{fmtShort(grp.cliques)}</td>
                                <td style={tdSm}>{fmtPct(grp.ctr)}</td>
                                <td style={tdSm}>{grp.cliques > 0 ? fmtBRL(grp.invest / grp.cliques) : '—'}</td>
                                <td style={tdSm}>{fmtNum(grp.leads_crm)}</td>
                                <td style={tdSm}><WinBar ganhou={grp.ganhou} aberto={grp.aberto} perdeu={grp.perdeu} /></td>
                                <td style={tdSm}>{grp.leads_crm > 0 ? fmtBRL(grp.cpl_crm) : '—'}</td>
                                <td style={tdSm}>{grp.leads_crm > 0 ? <span style={{ color: grp.win_rate >= 50 ? GREEN : AMBER }}>{fmtPct(grp.win_rate)}</span> : '—'}</td>
                              </tr>

                              {/* Ad rows */}
                              {isExpGrp && grp.ads.map((ad: any, ai: number) => (
                                <tr key={ai} style={{ background: `${BG}80`, borderBottom: `1px solid ${BORDER}` }}>
                                  <td style={{ padding: '8px 14px 8px 50px', color: FG_SUBTLE, fontSize: 11 }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                      <span style={{ width: 4, height: 4, borderRadius: '50%', background: FG_SUBTLE, flexShrink: 0 }} />
                                      <span title={ad.anuncio} style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>ID: {ad.anuncio || '(sem ID)'}</span>
                                    </span>
                                  </td>
                                  <td style={{ ...tdSm, fontSize: 11 }}>{fmtBRL(ad.invest)}</td>
                                  <td style={{ ...tdSm, fontSize: 11 }}>{fmtShort(ad.cliques)}</td>
                                  <td style={{ ...tdSm, fontSize: 11 }}>{fmtPct(ad.ctr)}</td>
                                  <td style={{ ...tdSm, fontSize: 11 }}>{ad.cliques > 0 ? fmtBRL(ad.cpc) : '—'}</td>
                                  <td style={{ ...tdSm, fontSize: 11 }}>{fmtNum(ad.leads_crm)}</td>
                                  <td style={{ ...tdSm, fontSize: 11 }}><WinBar ganhou={ad.ganhou} aberto={ad.aberto} perdeu={ad.perdeu} /></td>
                                  <td style={{ ...tdSm, fontSize: 11 }}>{ad.leads_crm > 0 ? fmtBRL(ad.cpl_crm) : '—'}</td>
                                  <td style={{ ...tdSm, fontSize: 11 }}>{ad.leads_crm > 0 ? <span style={{ color: ad.win_rate >= 50 ? GREEN : AMBER }}>{fmtPct(ad.win_rate)}</span> : '—'}</td>
                                </tr>
                              ))}
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Keywords ── */}
          {keywords.length > 0 && (
            <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden', marginBottom: 24 }}>
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Zap size={14} color={AMBER} />
                <span style={{ fontSize: 13, fontWeight: 600, color: FG }}>Palavras-chave</span>
                <span style={{ fontSize: 11, color: FG_SUBTLE }}>Top {keywords.length} por volume de leads CRM</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: BG_ELEVATED }}>
                      {['Palavra-chave', 'Match', 'Leads', 'Ganhou', 'Aberto', 'Perdeu', 'Win Rate'].map((h) => (
                        <th key={h} style={{ padding: '8px 14px', textAlign: 'left', color: FG_SUBTLE, fontWeight: 600, fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: `1px solid ${BORDER}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {keywords.map((kw: any, i: number) => {
                      const leads = Number(kw.leads || 0);
                      const ganhou = Number(kw.ganhou || 0);
                      const perdeu = Number(kw.perdeu || 0);
                      const aberto = Number(kw.aberto || 0);
                      const wr = leads > 0 ? (ganhou / leads) * 100 : 0;
                      return (
                        <tr key={i} style={{ borderBottom: `1px solid ${BORDER}` }}>
                          <td style={{ padding: '9px 14px', color: FG, fontWeight: 500 }}>{kw.palavra_chave}</td>
                          <td style={td}>{kw.match ? <span style={{ background: CYAN_DIM, color: CYAN, fontSize: 10, padding: '2px 7px', borderRadius: 4 }}>{kw.match}</span> : '—'}</td>
                          <td style={{ ...td, fontWeight: 700 }}>{fmtNum(leads)}</td>
                          <td style={td}><span style={{ color: GREEN }}>{fmtNum(ganhou)}</span></td>
                          <td style={td}><span style={{ color: AMBER }}>{fmtNum(aberto)}</span></td>
                          <td style={td}><span style={{ color: RED }}>{fmtNum(perdeu)}</span></td>
                          <td style={td}><span style={{ color: wr >= 50 ? GREEN : wr >= 30 ? AMBER : RED, fontWeight: 700 }}>{leads > 0 ? fmtPct(wr) : '—'}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Setup Modal ── */}
      {showSetup && (
        <Modal title="Configurar Moskit CRM" onClose={() => setShowSetup(false)}>
          <p style={{ fontSize: 12, color: FG_MUTED, marginBottom: 16 }}>
            Insira a API Key do Moskit (salva nas propriedades do script como <code>MOSKIT_API_KEY</code>).
          </p>
          <label style={labelStyle}>API Key do Moskit</label>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <input
              type={showKey ? 'text' : 'password'}
              value={moskitKey}
              onChange={(e) => setMoskitKey(e.target.value)}
              placeholder="Cole a API Key aqui..."
              style={{ ...inputStyle, paddingRight: 36 }}
            />
            <button onClick={() => setShowKey(!showKey)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: FG_SUBTLE, padding: 0 }}>
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <label style={labelStyle}>Apelido</label>
          <input type="text" value={moskitNick} onChange={(e) => setMoskitNick(e.target.value)} style={{ ...inputStyle, marginBottom: 16 }} />
          <button onClick={handleSaveKey} disabled={savingKey || !moskitKey.trim()} style={btnStyle('primary', savingKey || !moskitKey.trim())}>
            {savingKey ? 'Salvando…' : 'Salvar e Conectar'}
          </button>
        </Modal>
      )}

      {/* ── Import CRM Modal ── */}
      {showImportCrm && (
        <Modal title="Importar Leads CRM" onClose={() => { setShowImportCrm(false); setImportCrmMsg(''); }} wide>
          <div style={{ background: GREEN_DIM, border: `1px solid ${GREEN}20`, borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: GREEN }}>
            <Info size={12} style={{ display: 'inline', marginRight: 6 }} />
            Cole aqui os dados da planilha CRM como JSON ou CSV. Campos esperados: <strong>data, lead, status</strong> (Ganhou/Perdeu/Aberto), campanha, grupo, anuncio, match, palavra_chave
          </div>
          <label style={labelStyle}>Cole os dados (JSON ou CSV com cabeçalho)</label>
          <textarea
            value={importCrmText}
            onChange={(e) => setImportCrmText(e.target.value)}
            placeholder={'[\n  {"data":"2026-05-26","lead":"Empresa X","status":"Ganhou","campanha":"Search - Alta Intenção","grupo":"Multas","palavra_chave":"gestão de multas"}\n]'}
            rows={10}
            style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 11, resize: 'vertical', marginBottom: 12 }}
          />
          {importCrmMsg && (
            <div style={{ background: importCrmMsg.startsWith('✅') ? GREEN_DIM : RED_DIM, border: `1px solid ${importCrmMsg.startsWith('✅') ? GREEN : RED}30`, borderRadius: 6, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: importCrmMsg.startsWith('✅') ? GREEN : RED }}>
              {importCrmMsg}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleImportCrm} disabled={importingCrm || !importCrmText.trim()} style={btnStyle('primary', importingCrm || !importCrmText.trim())}>
              {importingCrm ? 'Importando…' : 'Importar Leads'}
            </button>
            <button onClick={async () => { if (confirm('Limpar todos os leads CRM importados?')) { await monacoApi.clearCrm(); await Promise.all([loadStatus(), loadReport()]); setImportCrmMsg('✅ Dados CRM limpos.'); }}} style={{ ...btnStyle('secondary'), color: RED }}>
              Limpar CRM
            </button>
          </div>
        </Modal>
      )}

      {/* ── Import Modal ── */}
      {showImport && (
        <Modal title="Importar Dados Google Ads" onClose={() => { setShowImport(false); setImportMsg(''); }} wide>
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button onClick={() => setShowSnippet(!showSnippet)} style={btnStyle('secondary')}>
                <Copy size={12} /> {showSnippet ? 'Ocultar' : 'Ver'} script automático
              </button>
            </div>

            {showSnippet && (
              <div style={{ background: BG_ELEVATED, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 14, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: FG_MUTED }}>Adicione ao script MCC (Google Ads Scripts)</span>
                  <button onClick={() => { navigator.clipboard.writeText(snippetCode); setCopiedSnippet(true); setTimeout(() => setCopiedSnippet(false), 2000); }} style={btnStyle('secondary')}>
                    {copiedSnippet ? '✓ Copiado' : <><Copy size={11} /> Copiar</>}
                  </button>
                </div>
                <pre style={{ fontSize: 10, color: FG_SUBTLE, overflow: 'auto', maxHeight: 200, margin: 0, fontFamily: 'monospace', lineHeight: 1.5 }}>{snippetCode}</pre>
              </div>
            )}

            <div style={{ background: CYAN_DIM, border: `1px solid ${CYAN}20`, borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: CYAN }}>
              <Info size={12} style={{ display: 'inline', marginRight: 6 }} />
              Cole aqui os dados da aba <strong>BASE ADS</strong> como JSON ou CSV. Colunas esperadas: Data, Conta, Campanha, Grupo, Anuncio, Investimento, Impressoes, Cliques, Conversoes
            </div>
          </div>

          <label style={labelStyle}>Cole os dados (JSON ou CSV com cabeçalho)</label>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={'[\n  {"data":"2026-06-01","conta":"Mônaco","campanha":"Search - Alta Intenção","grupo":"Multas","anuncio":"123456","investimento":1234.56,"impressoes":5000,"cliques":250,"conversoes":12}\n]'}
            rows={10}
            style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 11, resize: 'vertical', marginBottom: 12 }}
          />

          {importMsg && (
            <div style={{ background: importMsg.startsWith('✅') ? GREEN_DIM : RED_DIM, border: `1px solid ${importMsg.startsWith('✅') ? GREEN : RED}30`, borderRadius: 6, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: importMsg.startsWith('✅') ? GREEN : RED }}>
              {importMsg}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleImport} disabled={importing || !importText.trim()} style={btnStyle('primary', importing || !importText.trim())}>
              {importing ? 'Importando…' : 'Importar Dados'}
            </button>
            <button onClick={async () => { if (confirm('Limpar todos os dados de Google Ads?')) { await monacoApi.clearAds(); await Promise.all([loadStatus(), loadReport()]); }}} style={{ ...btnStyle('secondary'), color: RED }}>
              Limpar Ads
            </button>
          </div>
        </Modal>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────
function btnStyle(variant: 'primary' | 'secondary', disabled = false): React.CSSProperties {
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px',
    borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 500, cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit', transition: 'background 0.15s', opacity: disabled ? 0.5 : 1,
    whiteSpace: 'nowrap',
  };
  if (variant === 'primary') return { ...base, background: CYAN, color: '#000' };
  return { ...base, background: BG_ELEVATED, color: FG_MUTED, border: `1px solid ${BORDER}` };
}

const td: React.CSSProperties = { padding: '10px 14px', color: FG_MUTED, borderBottom: `1px solid ${BORDER}`, whiteSpace: 'nowrap' };
const tdSm: React.CSSProperties = { padding: '8px 14px', color: FG_MUTED, borderBottom: `1px solid ${BORDER}`, whiteSpace: 'nowrap' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 11, color: FG_MUTED, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' };
const inputStyle: React.CSSProperties = {
  width: '100%', background: BG_ELEVATED, border: `1px solid ${BORDER}`, borderRadius: 8,
  color: FG, fontSize: 13, padding: '9px 12px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
};

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 28, width: '100%', maxWidth: wide ? 680 : 420, maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: FG }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: FG_MUTED, cursor: 'pointer', padding: 4 }}><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
