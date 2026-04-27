import React, { useState } from 'react';
import { Eye, EyeOff, Save, Trash2, Plus } from 'lucide-react';

interface ApiCredential {
  id: string;
  platform: 'meta' | 'google' | 'linkedin';
  name: string;
  isConnected: boolean;
  lastSync?: string;
}

export default function Settings() {
  const [credentials, setCredentials] = useState<ApiCredential[]>([
    {
      id: '1',
      platform: 'meta',
      name: 'Meta Ads Account',
      isConnected: false,
    },
    {
      id: '2',
      platform: 'google',
      name: 'Google Ads Account',
      isConnected: false,
    },
  ]);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    platform: 'meta' as 'meta' | 'google' | 'linkedin',
    name: '',
    appId: '',
    appSecret: '',
    accessToken: '',
  });

  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  const handleAddCredential = () => {
    if (!formData.name || !formData.appId) {
      alert('Preencha os campos obrigatórios!');
      return;
    }

    const newCredential: ApiCredential = {
      id: Date.now().toString(),
      platform: formData.platform,
      name: formData.name,
      isConnected: true,
      lastSync: new Date().toLocaleString('pt-BR'),
    };

    setCredentials([...credentials, newCredential]);
    setFormData({
      platform: 'meta',
      name: '',
      appId: '',
      appSecret: '',
      accessToken: '',
    });
    setShowForm(false);
  };

  const handleDeleteCredential = (id: string) => {
    setCredentials(credentials.filter((c) => c.id !== id));
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'meta':
        return '📘';
      case 'google':
        return '🔵';
      case 'linkedin':
        return '💼';
      default:
        return '🔗';
    }
  };

  const getPlatformLabel = (platform: string) => {
    switch (platform) {
      case 'meta':
        return 'Meta Ads';
      case 'google':
        return 'Google Ads';
      case 'linkedin':
        return 'LinkedIn Ads';
      default:
        return platform;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-950 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">⚙️ Configurações</h1>
          <p className="text-slate-400">Gerencie suas contas e integrações</p>
        </div>

        {/* API Credentials Section */}
        <div className="bg-slate-800 rounded-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">🔗 Contas Conectadas</h2>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 px-4 py-2 rounded-lg flex items-center gap-2 transition"
            >
              <Plus className="w-4 h-4" />
              Adicionar Conta
            </button>
          </div>

          {/* Add Form */}
          {showForm && (
            <div className="bg-slate-700/50 rounded-lg p-6 mb-6 border border-slate-600">
              <h3 className="text-lg font-semibold text-white mb-4">Nova Conexão</h3>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-2">
                      Plataforma
                    </label>
                    <select
                      value={formData.platform}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          platform: e.target.value as 'meta' | 'google' | 'linkedin',
                        })
                      }
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                    >
                      <option value="meta">Meta Ads</option>
                      <option value="google">Google Ads</option>
                      <option value="linkedin">LinkedIn Ads</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-2">
                      Nome da Conta
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Clínica Principal"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">
                    App ID / Client ID
                  </label>
                  <input
                    type="password"
                    placeholder="Sua credencial aqui"
                    value={formData.appId}
                    onChange={(e) =>
                      setFormData({ ...formData, appId: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">
                    App Secret / Client Secret
                  </label>
                  <input
                    type="password"
                    placeholder="Sua credencial aqui"
                    value={formData.appSecret}
                    onChange={(e) =>
                      setFormData({ ...formData, appSecret: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                  />
                </div>

                {formData.platform === 'meta' && (
                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-2">
                      Access Token
                    </label>
                    <input
                      type="password"
                      placeholder="Seu token aqui"
                      value={formData.accessToken}
                      onChange={(e) =>
                        setFormData({ ...formData, accessToken: e.target.value })
                      }
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                    />
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={handleAddCredential}
                    className="flex-1 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition font-semibold"
                  >
                    <Save className="w-4 h-4" />
                    Salvar
                  </button>
                  <button
                    onClick={() => setShowForm(false)}
                    className="flex-1 bg-slate-600 hover:bg-slate-700 px-4 py-2 rounded-lg transition font-semibold"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Credentials List */}
          <div className="space-y-3">
            {credentials.length === 0 ? (
              <p className="text-slate-400 text-center py-8">
                Nenhuma conta conectada. Adicione uma para começar!
              </p>
            ) : (
              credentials.map((cred) => (
                <div
                  key={cred.id}
                  className="bg-slate-700/50 rounded-lg p-4 border border-slate-600 hover:border-blue-500/30 transition flex items-center justify-between"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <span className="text-2xl">{getPlatformIcon(cred.platform)}</span>
                    <div>
                      <h3 className="text-white font-semibold">{cred.name}</h3>
                      <p className="text-slate-400 text-sm">
                        {getPlatformLabel(cred.platform)}
                        {cred.lastSync && ` • Sincronizado: ${cred.lastSync}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {cred.isConnected && (
                      <div className="flex items-center gap-2 px-3 py-1 bg-green-900/30 rounded-full border border-green-700/50">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span className="text-green-400 text-sm font-medium">
                          Conectada
                        </span>
                      </div>
                    )}
                    <button
                      onClick={() =>
                        setShowSecrets({
                          ...showSecrets,
                          [cred.id]: !showSecrets[cred.id],
                        })
                      }
                      className="p-2 hover:bg-slate-600 rounded-lg transition text-slate-300"
                    >
                      {showSecrets[cred.id] ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteCredential(cred.id)}
                      className="p-2 hover:bg-red-900/30 rounded-lg transition text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* General Settings */}
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-white mb-6">🔧 Preferências Gerais</h2>

          <div className="space-y-6">
            {/* Sync Settings */}
            <div>
              <h3 className="text-white font-semibold mb-3">Sincronização de Dados</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-slate-300">
                    Sincronizar automaticamente a cada hora
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded" />
                  <span className="text-slate-300">
                    Notificar sobre alertas de performance
                  </span>
                </label>
              </div>
            </div>

            {/* Data Privacy */}
            <div>
              <h3 className="text-white font-semibold mb-3">Privacidade</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded" />
                  <span className="text-slate-300">
                    Criptografar dados sensíveis
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded" />
                  <span className="text-slate-300">
                    Permitir analytics anônimos
                  </span>
                </label>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-4 border-t border-slate-700">
              <button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 px-6 py-2 rounded-lg flex items-center gap-2 transition font-semibold">
                <Save className="w-4 h-4" />
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
