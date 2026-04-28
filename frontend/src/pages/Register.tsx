import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../lib/api';
import { Logo } from '../components/Logo';

const CYAN = '#3DB8E8';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 8) { setError('Senha deve ter no mínimo 8 caracteres'); return; }
    setLoading(true); setError('');
    try {
      const res = await authApi.register(form.name, form.email, form.password);
      localStorage.setItem('token', res.data.token);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{
      background: 'radial-gradient(ellipse at 50% 0%, rgba(61,184,232,0.07) 0%, #000 55%)',
    }}>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 pointer-events-none" style={{
        background: `radial-gradient(circle, ${CYAN}15 0%, transparent 70%)`,
        filter: 'blur(60px)',
      }} />

      <div className="w-full max-w-sm relative">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div style={{ filter: `drop-shadow(0 0 16px ${CYAN}80)` }}>
              <Logo size={48} />
            </div>
          </div>
          <p className="font-bold text-white text-xl tracking-wide">êxodos</p>
          <p className="text-sm" style={{ color: CYAN, opacity: 0.8 }}>system conversion</p>
        </div>

        <div className="rounded-2xl p-8" style={{
          background: 'rgba(11,20,34,0.9)',
          border: `1px solid rgba(61,184,232,0.12)`,
          boxShadow: `0 25px 60px rgba(0,0,0,0.6), 0 0 40px rgba(61,184,232,0.05)`,
          backdropFilter: 'blur(20px)',
        }}>
          <h2 className="text-lg font-semibold text-white mb-6">Criar sua conta</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { label: 'Nome', key: 'name', type: 'text', placeholder: 'Seu nome completo' },
              { label: 'Email', key: 'email', type: 'email', placeholder: 'seu@email.com' },
              { label: 'Senha', key: 'password', type: 'password', placeholder: 'Mínimo 8 caracteres' },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">{label}</label>
                <input
                  type={type}
                  required
                  className="w-full rounded-xl px-4 py-3 text-white text-sm placeholder-slate-700 focus:outline-none transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                  onFocus={(e) => e.target.style.borderColor = `${CYAN}50`}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.07)'}
                  placeholder={placeholder}
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}

            {error && (
              <div className="rounded-xl px-4 py-3 text-sm text-red-400" style={{
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              }}>{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all disabled:opacity-60 mt-2"
              style={{
                background: `linear-gradient(135deg, ${CYAN}, #1a8ab8)`,
                boxShadow: loading ? 'none' : `0 0 24px ${CYAN}40`,
              }}
            >
              {loading ? 'Criando conta...' : 'Criar conta'}
            </button>
          </form>

          <p className="text-center text-slate-600 text-sm mt-6">
            Já tem conta?{' '}
            <Link to="/login" className="font-medium transition-colors" style={{ color: CYAN }}>
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
