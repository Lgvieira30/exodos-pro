import React, { useEffect, useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertCircle, TrendingUp, Users, DollarSign } from 'lucide-react';

interface DashboardMetrics {
  spend: number;
  leads: number;
  cpa: number;
  roas: number;
  campaigns: number;
}

interface Campaign {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'completed';
  cpa: number;
  ctr: number;
  spend: number;
  leads: number;
}

interface Alert {
  id: string;
  type: 'info' | 'warning' | 'error';
  message: string;
}

interface DashboardProps {
  onNavigate?: (page: 'wizard') => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dados mock para gráfico (será substituído por API real)
  const chartData = [
    { day: 'Seg', spend: 800, leads: 45, cpa: 50 },
    { day: 'Ter', spend: 950, leads: 52, cpa: 48 },
    { day: 'Qua', spend: 1200, leads: 60, cpa: 52 },
    { day: 'Qui', spend: 1100, leads: 58, cpa: 51 },
    { day: 'Sex', spend: 1500, leads: 75, cpa: 48 },
    { day: 'Sáb', spend: 1800, leads: 85, cpa: 50 },
    { day: 'Dom', spend: 900, leads: 48, cpa: 49 },
  ];

  // Dados mock de campanhas
  const mockCampaigns: Campaign[] = [
    {
      id: '1',
      name: 'Clínica - Lipoaspiração',
      status: 'active',
      cpa: 45,
      ctr: 2.1,
      spend: 2000,
      leads: 50,
    },
    {
      id: '2',
      name: 'Advocacia - Divórcio',
      status: 'active',
      cpa: 67,
      ctr: 1.5,
      spend: 1320,
      leads: 20,
    },
    {
      id: '3',
      name: 'Imobiliária - Bairro X',
      status: 'active',
      cpa: 45,
      ctr: 2.8,
      spend: 1000,
      leads: 177,
    },
    {
      id: '4',
      name: 'Estética - Limpeza',
      status: 'paused',
      cpa: 0,
      ctr: 0,
      spend: 0,
      leads: 0,
    },
  ];

  // Dados mock de alertas
  const mockAlerts: Alert[] = [
    {
      id: '1',
      type: 'warning',
      message: 'CPA subiu 15% na campanha de Divórcio',
    },
    {
      id: '2',
      type: 'info',
      message: 'Clínica tá com melhor performance do mês',
    },
    {
      id: '3',
      type: 'info',
      message: 'Campanha de Limpeza pausada há 3 dias',
    },
  ];

  useEffect(() => {
    // Simular carregamento de dados da API
    const loadDashboard = async () => {
      try {
        setLoading(true);
        // await fetchMetrics()
        // await fetchCampaigns()
        
        // Mock data for now
        setMetrics({
          spend: 4320,
          leads: 247,
          cpa: 45,
          roas: 3.2,
          campaigns: 4,
        });
        setCampaigns(mockCampaigns);
        setAlerts(mockAlerts);
      } catch (err) {
        setError('Erro ao carregar dashboard');
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="text-white">Carregando...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold">ÊXODOS PRO</h1>
        <p className="text-slate-400 mt-2">Bem vindo, Lucas</p>
      </div>

      {/* Métricas Gerais */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <MetricCard
            label="Spend"
            value={`R$ ${metrics.spend.toLocaleString()}`}
            icon={<DollarSign className="w-5 h-5" />}
            color="blue"
          />
          <MetricCard
            label="Leads"
            value={metrics.leads.toString()}
            icon={<Users className="w-5 h-5" />}
            color="green"
          />
          <MetricCard
            label="CPA"
            value={`R$ ${metrics.cpa}`}
            icon={<TrendingUp className="w-5 h-5" />}
            color="orange"
          />
          <MetricCard
            label="ROAS"
            value={`${metrics.roas}x`}
            icon={<TrendingUp className="w-5 h-5" />}
            color="purple"
          />
        </div>
      )}

      {/* Campanhas Ativas */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">🚀 Campanhas Ativas ({campaigns.filter(c => c.status === 'active').length})</h2>
          <button 
            onClick={() => onNavigate?.('wizard')}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 px-4 py-2 rounded-lg transition font-semibold shadow-lg shadow-blue-500/50"
          >
            + Criar Nova
          </button>
        </div>
        <div className="bg-slate-800 rounded-lg divide-y divide-slate-700">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="p-4 hover:bg-slate-700 transition flex justify-between items-center">
              <div>
                <p className="font-medium">{campaign.name}</p>
                <p className="text-sm text-slate-400">
                  {campaign.status === 'active' ? '🟢 Ativa' : campaign.status === 'paused' ? '🔴 Pausada' : '✅ Completada'}
                </p>
              </div>
              {campaign.status === 'active' && (
                <div className="flex gap-8">
                  <div className="text-right">
                    <p className="text-sm text-slate-400">CPA</p>
                    <p className={`font-bold ${campaign.cpa > 60 ? 'text-red-400' : 'text-green-400'}`}>
                      R$ {campaign.cpa}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-400">CTR</p>
                    <p className="font-bold">{campaign.ctr}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-400">Spend</p>
                    <p className="font-bold">R$ {campaign.spend}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Gráfico */}
      <div className="mb-8 bg-slate-800 rounded-lg p-6">
        <h2 className="text-lg font-bold mb-4">📈 Performance (Últimos 7 dias)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
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

      {/* Alertas */}
      <div className="bg-slate-800 rounded-lg p-6">
        <h2 className="text-lg font-bold mb-4">🔔 Alertas</h2>
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div key={alert.id} className={`p-4 rounded-lg flex gap-3 ${
              alert.type === 'warning' ? 'bg-yellow-900/30 border border-yellow-700/50' :
              alert.type === 'error' ? 'bg-red-900/30 border border-red-700/50' :
              'bg-blue-900/30 border border-blue-700/50'
            }`}>
              <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                alert.type === 'warning' ? 'text-yellow-400' :
                alert.type === 'error' ? 'text-red-400' :
                'text-blue-400'
              }`} />
              <p className="text-sm">{alert.message}</p>
            </div>
          ))}
        </div>
      </div>
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
  const colorClasses = {
    blue: 'bg-blue-900/30 border-blue-700/50',
    green: 'bg-green-900/30 border-green-700/50',
    orange: 'bg-orange-900/30 border-orange-700/50',
    purple: 'bg-purple-900/30 border-purple-700/50',
  };

  const iconColorClasses = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    orange: 'text-orange-400',
    purple: 'text-purple-400',
  };

  return (
    <div className={`${colorClasses[color]} border rounded-lg p-6`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm">{label}</p>
          <p className="text-2xl font-bold mt-2">{value}</p>
        </div>
        <div className={`${iconColorClasses[color]} opacity-50`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
