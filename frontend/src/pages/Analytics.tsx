import React, { useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Download, Calendar, Filter } from 'lucide-react';

// Dados mock para gráficos
const chartData7Days = [
  { day: 'Seg', spend: 800, leads: 45, conversions: 5, cpa: 50 },
  { day: 'Ter', spend: 950, leads: 52, conversions: 6, cpa: 48 },
  { day: 'Qua', spend: 1200, leads: 60, conversions: 7, cpa: 52 },
  { day: 'Qui', spend: 1100, leads: 58, conversions: 6, cpa: 51 },
  { day: 'Sex', spend: 1500, leads: 75, conversions: 9, cpa: 48 },
  { day: 'Sáb', spend: 1800, leads: 85, conversions: 10, cpa: 50 },
  { day: 'Dom', spend: 900, leads: 48, conversions: 5, cpa: 49 },
];

const campaignPerformance = [
  {
    id: '1',
    name: 'Clínica - Lipoaspiração',
    spend: 2000,
    leads: 50,
    conversions: 10,
    cpa: 45,
    ctr: 2.1,
    roas: 3.2,
    roi: 220,
  },
  {
    id: '2',
    name: 'Advocacia - Divórcio',
    spend: 1320,
    leads: 20,
    conversions: 2,
    cpa: 67,
    ctr: 1.5,
    roas: 1.8,
    roi: 80,
  },
  {
    id: '3',
    name: 'Imobiliária - Bairro X',
    spend: 1000,
    leads: 177,
    conversions: 8,
    cpa: 45,
    ctr: 2.8,
    roas: 2.5,
    roi: 150,
  },
];

const ctrData = [
  { name: 'Lipoaspiração', value: 2.1 },
  { name: 'Divórcio', value: 1.5 },
  { name: 'Imobiliária', value: 2.8 },
];

const COLORS = ['#3b82f6', '#ef4444', '#10b981'];

export default function Analytics() {
  const [dateRange, setDateRange] = useState('7days');
  const [selectedCampaign, setSelectedCampaign] = useState('all');

  const totalSpend = campaignPerformance.reduce((sum, c) => sum + c.spend, 0);
  const totalLeads = campaignPerformance.reduce((sum, c) => sum + c.leads, 0);
  const totalConversions = campaignPerformance.reduce((sum, c) => sum + c.conversions, 0);
  const avgCPA = (totalSpend / totalLeads).toFixed(2);
  const avgROAS = (
    campaignPerformance.reduce((sum, c) => sum + c.roas, 0) / campaignPerformance.length
  ).toFixed(2);

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold">📈 Analytics</h1>
        <p className="text-slate-400 mt-2">Performance completa de suas campanhas</p>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 mb-8">
        <div className="flex gap-2">
          <Calendar className="w-5 h-5 text-slate-400 mt-2" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white hover:border-slate-600 transition"
          >
            <option value="7days">Últimos 7 dias</option>
            <option value="30days">Últimos 30 dias</option>
            <option value="90days">Últimos 90 dias</option>
            <option value="custom">Customizar</option>
          </select>
        </div>

        <div className="flex gap-2">
          <Filter className="w-5 h-5 text-slate-400 mt-2" />
          <select
            value={selectedCampaign}
            onChange={(e) => setSelectedCampaign(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white hover:border-slate-600 transition"
          >
            <option value="all">Todas as campanhas</option>
            {campaignPerformance.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <button className="ml-auto bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg flex gap-2 items-center transition">
          <Download className="w-4 h-4" />
          Exportar PDF
        </button>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <KPICard label="Spend Total" value={`R$ ${totalSpend.toLocaleString()}`} color="blue" />
        <KPICard label="Leads Total" value={totalLeads.toString()} color="green" />
        <KPICard label="CPA Médio" value={`R$ ${avgCPA}`} color="orange" />
        <KPICard label="ROAS Médio" value={`${avgROAS}x`} color="purple" />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Spend vs Leads */}
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-lg font-bold mb-4">💰 Spend vs Leads</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData7Days}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="day" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                labelStyle={{ color: '#f1f5f9' }}
              />
              <Legend />
              <Line type="monotone" dataKey="spend" stroke="#3b82f6" strokeWidth={2} />
              <Line type="monotone" dataKey="leads" stroke="#10b981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* CPA ao longo do tempo */}
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-lg font-bold mb-4">📊 CPA Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData7Days}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="day" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                labelStyle={{ color: '#f1f5f9' }}
              />
              <Bar dataKey="cpa" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Conversões */}
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-lg font-bold mb-4">🎯 Conversões</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData7Days}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="day" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                labelStyle={{ color: '#f1f5f9' }}
              />
              <Line type="monotone" dataKey="conversions" stroke="#ec4899" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* CTR por Campanha */}
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-lg font-bold mb-4">📈 CTR por Campanha</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={ctrData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {ctrData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                labelStyle={{ color: '#f1f5f9' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabela de Campanhas */}
      <div className="bg-slate-800 rounded-lg p-6">
        <h2 className="text-lg font-bold mb-4">📋 Performance por Campanha</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4">Campanha</th>
                <th className="text-right py-3 px-4">Spend</th>
                <th className="text-right py-3 px-4">Leads</th>
                <th className="text-right py-3 px-4">Conversões</th>
                <th className="text-right py-3 px-4">CPA</th>
                <th className="text-right py-3 px-4">CTR</th>
                <th className="text-right py-3 px-4">ROAS</th>
                <th className="text-right py-3 px-4">ROI</th>
              </tr>
            </thead>
            <tbody>
              {campaignPerformance.map((campaign) => (
                <tr key={campaign.id} className="border-b border-slate-700 hover:bg-slate-700/50 transition">
                  <td className="py-3 px-4 font-medium">{campaign.name}</td>
                  <td className="text-right py-3 px-4">R$ {campaign.spend.toLocaleString()}</td>
                  <td className="text-right py-3 px-4">{campaign.leads}</td>
                  <td className="text-right py-3 px-4">{campaign.conversions}</td>
                  <td className={`text-right py-3 px-4 font-semibold ${
                    campaign.cpa > 60 ? 'text-red-400' : 'text-green-400'
                  }`}>
                    R$ {campaign.cpa}
                  </td>
                  <td className="text-right py-3 px-4">{campaign.ctr}%</td>
                  <td className="text-right py-3 px-4 text-blue-400">{campaign.roas}x</td>
                  <td className="text-right py-3 px-4 text-green-400">{campaign.roi}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Insights */}
      <div className="mt-8 bg-slate-800 rounded-lg p-6">
        <h2 className="text-lg font-bold mb-4">💡 Insights</h2>
        <div className="space-y-3">
          <InsightCard
            title="Melhor performance"
            description="Campanha de Imobiliária tem CTR mais alto (2.8%)"
            type="positive"
          />
          <InsightCard
            title="CPA elevado"
            description="Campanha de Divórcio tá com CPA acima do alvo (R$ 67)"
            type="warning"
          />
          <InsightCard
            title="Oportunidade"
            description="Aumente budget em Lipoaspiração (melhor ROAS: 3.2x)"
            type="info"
          />
        </div>
      </div>
    </div>
  );
}

interface KPICardProps {
  label: string;
  value: string;
  color: 'blue' | 'green' | 'orange' | 'purple';
}

function KPICard({ label, value, color }: KPICardProps) {
  const colorClasses = {
    blue: 'bg-blue-900/30 border-blue-700/50',
    green: 'bg-green-900/30 border-green-700/50',
    orange: 'bg-orange-900/30 border-orange-700/50',
    purple: 'bg-purple-900/30 border-purple-700/50',
  };

  return (
    <div className={`${colorClasses[color]} border rounded-lg p-6`}>
      <p className="text-slate-400 text-sm">{label}</p>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
  );
}

interface InsightCardProps {
  title: string;
  description: string;
  type: 'positive' | 'warning' | 'info';
}

function InsightCard({ title, description, type }: InsightCardProps) {
  const bgClasses = {
    positive: 'bg-green-900/20 border-green-700/50 text-green-400',
    warning: 'bg-yellow-900/20 border-yellow-700/50 text-yellow-400',
    info: 'bg-blue-900/20 border-blue-700/50 text-blue-400',
  };

  return (
    <div className={`${bgClasses[type]} border rounded-lg p-4`}>
      <p className="font-semibold">{title}</p>
      <p className="text-sm text-slate-300 mt-1">{description}</p>
    </div>
  );
}
