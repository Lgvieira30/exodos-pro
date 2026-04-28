# 🚀 ÊXODOS PRO — Status Completo do Projeto

> Documento mestre pra continuar o desenvolvimento no Claude Code

**Data:** 28 de abril de 2026
**Owner:** Lucas Vieira (lgvieira30)
**Repositório:** https://github.com/lgvieira30/exodos-pro
**Frontend (live):** https://exodos-pro-9d9i.vercel.app

---

## 🎯 O QUE É O ÊXODOS PRO

Plataforma de **gestão autônoma de tráfego pago** com:
- Sistema multi-agentes de IA (6 agentes especializados)
- Análise prescritiva (não recomenda — PRESCREVE com confidence score)
- Simulador de cenários em tempo real
- Marketing Mix Modeling automatizado
- Detecção de anomalias
- Histórico auditável de decisões autônomas

**Casos de uso:**
1. Uso interno pelo Lucas como gestor de tráfego pleno na Mônaco Gestão Documental
2. Eventual SaaS pra agências brasileiras (mercado: RD Station, Optmyzr)

---

## 📦 STACK ATUAL

### Frontend
```
React 18 + TypeScript
Vite 5
TailwindCSS 3
React Router 6
Recharts (gráficos)
ReactFlow (fluxos)
Lucide React (ícones)
@headlessui/react
Axios
```

### Backend
```
Node.js + Express 4
TypeScript (ESM)
PostgreSQL via Neon (postgres ^3.4 — driver nativo, sem ORM)
Redis ^4.6 (dependência instalada, ainda não em uso)
JWT (jsonwebtoken + bcryptjs)
Helmet (segurança HTTP)
express-validator
Axios (Meta Ads / Google Ads APIs)
```

### Deploy
```
Frontend: Vercel ✅ ONLINE
Backend: Railway ✅ ONLINE
Database: Neon ✅ ONLINE (DATABASE_URL + JWT_SECRET configurados)
```

---

## 🗂️ ESTRUTURA DO REPOSITÓRIO (ATUAL)

```
exodos-pro/
├── .prettierrc
├── README.md
├── STATUS_PROJETO.md
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx                    ⚡ Nav + roteamento + Sidebar integrada
│   │   ├── main.tsx
│   │   ├── lib/
│   │   │   └── api.ts                 ✅ Cliente HTTP completo (axios + JWT interceptor)
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx          📊 Visão geral
│   │   │   ├── Professor.tsx          🆕 Dashboard que explica métricas
│   │   │   ├── Analytics.tsx          📈 Gráficos + KPIs
│   │   │   ├── Wizard.tsx             🚀 Criação de campanha (5 steps)
│   │   │   ├── CreativeStudio.tsx     🎨 Editor de criativos
│   │   │   ├── CommandCenter.tsx      ⚠️  Existe mas NÃO está roteado no App.tsx
│   │   │   ├── Settings.tsx           ⚙️  API credentials
│   │   │   ├── Login.tsx
│   │   │   └── Register.tsx
│   │   ├── components/
│   │   │   ├── Layout.tsx             🆕 Layout alternativo com sidebar (não usado pelo App.tsx)
│   │   │   ├── Logo.tsx               🆕 Logo geométrica Êxodos (usada no header)
│   │   │   ├── ProtectedRoute.tsx     🆕 Guarda de rota autenticada
│   │   │   └── Tooltip.tsx            🆕 Componente tooltip
│   │   └── styles/globals.css
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── vite.config.ts
│   └── vercel.json
│
├── backend/
│   ├── src/
│   │   ├── server.ts                  ⚡ Express + CORS + Helmet + migrations inline
│   │   ├── db/
│   │   │   ├── index.ts               🆕 Conexão PostgreSQL (Neon)
│   │   │   └── migrate.ts             🆕 Runner de migrations
│   │   ├── middleware/
│   │   │   ├── auth.ts                🆕 Middleware JWT (requireAuth)
│   │   │   └── errorHandler.ts        🆕 Error handler global
│   │   └── routes/
│   │       ├── index.ts               🆕 Router central
│   │       ├── auth.ts                🆕 Login / Register / Me (completo)
│   │       ├── campaigns.ts           CRUD campanhas
│   │       ├── metrics.ts             🆕 Métricas do dashboard
│   │       ├── sync.ts                Sincronização APIs externas
│   │       ├── analyze.ts             🆕 Análise/insights (substitui insights.ts)
│   │       └── integrations.ts        🆕 Credenciais Meta/Google (substitui credentials.ts)
│   ├── railway.toml                   🆕 Config deploy Railway
│   ├── render.yaml                    🆕 Config deploy Render (alternativa)
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
└── docs/
    └── architecture.md                (substitui todos os docs anteriores)
```

### Removidos desde o último status:
- `backend/src/index.ts` → renomeado para `server.ts`
- `backend/src/models/index.ts` → substituído por schemas no DB
- `backend/src/services/campaignProfessor.ts` → lógica movida para `routes/analyze.ts`
- `backend/src/routes/credentials.ts` → substituído por `routes/integrations.ts`
- `backend/src/routes/insights.ts` → substituído por `routes/analyze.ts`
- `backend/Dockerfile` → removido
- `frontend/src/components/Sidebar.tsx` → integrada diretamente no `App.tsx`
- `docs/ROADMAP_COMPLETO.md`, `docs/DEPLOY.md`, `docs/DEPLOY_RAILWAY.md`, `docs/SISTEMA_PROFESSOR.md` → substituídos por `docs/architecture.md`

---

## ✅ O QUE JÁ FOI FEITO

### 1. Base do projeto
- Frontend completo com páginas funcionais
- Backend completo com APIs estruturadas
- Deploy Vercel funcionando
- Documentação de arquitetura (`docs/architecture.md`)

### 2. Sistema Professor (página `Professor.tsx`)
- Analisa CPA, CTR, ROAS, CPC, ROI
- Explica cada métrica em linguagem natural
- Recomenda ações específicas
- Score de saúde 0-100

### 3. Command Center (`CommandCenter.tsx`)
- 6 agentes especializados (Strategy, Media Buyer, Content, Analytics, Compliance, Decision)
- Simulador de cenários com slider de budget
- Marketing Mix Modeling
- Anomaly detection
- Histórico auditável
- **Atenção:** arquivo existe mas foi removido das rotas do App.tsx — precisa ser re-integrado ou decidido se fica

### 4. Sistema de Autenticação JWT — IMPLEMENTADO ✅
- **Backend:** `routes/auth.ts` com POST /register, POST /login, GET /me
- **Backend:** `middleware/auth.ts` com `requireAuth` (valida JWT em todas rotas protegidas)
- **Frontend:** `lib/api.ts` com interceptor JWT (inclui `Authorization: Bearer <token>` em toda requisição, redireciona para /login em 401)
- **Banco:** tabela `users` com `password_hash` (bcrypt rounds=12)

### 5. Banco de Dados PostgreSQL (Neon) — ONLINE ✅
- `backend/src/db/index.ts` — cliente `postgres` conectando via `DATABASE_URL`
- Migrations automáticas no startup do servidor (`runMigrations()` em `server.ts`)
- Tabelas ativas em produção:
  - `users` (id, email, password_hash, name, timestamps)
  - `campaigns` (id, user_id FK, name, platform, objective, status, budget, dates)
  - `metrics` (id, campaign_id FK, date, spend, leads, conversions, impressions, clicks, cpc, cpa, roas, ctr)
  - `user_integrations` (id, user_id FK, platform, app_id, app_secret, access_token, account_id, last_sync)

### 6. API Client Frontend — IMPLEMENTADO ✅
Arquivo: `frontend/src/lib/api.ts`

```
authApi      → POST /auth/login, POST /auth/register, GET /auth/me
campaignsApi → GET/POST /campaigns, GET/PATCH/DELETE /campaigns/:id
metricsApi   → GET /metrics/dashboard, GET /metrics/:id
syncApi      → GET /sync/status, POST /sync/meta, POST /sync/google
analyzeApi   → GET /analyze/dashboard, GET /analyze/:id
integrationsApi → GET/POST /integrations, DELETE /integrations/:platform
```

### 7. Identidade visual — PARCIALMENTE APLICADA ⚠️
- `Logo.tsx` criado e sendo usado no header ✅
- `Layout.tsx` usa a cor correta `#3DB8E8` ✅
- `App.tsx` usa `#6B9AE8` (azul similar mas não é a cor oficial — pendente padronizar)

### 8. Integração Meta Ads — ONLINE ✅
- Settings page salva credenciais via `integrationsApi.save()`
- `/api/sync/meta` implementado e funcionando
- Dados reais sendo puxados da conta Meta

### 9. Segurança
- `helmet()` ativo no backend
- CORS configurado (só aceita frontend URL ou `*.vercel.app`)
- JWT com expiração de 24h
- `express-validator` validando inputs no auth

---

## 🎨 IDENTIDADE VISUAL

**Marca real do Lucas:**
- Nome: **ÊXODOS system conversion**
- Cor primária: **Azul ciano** `#3DB8E8`
- Logo: mandala/símbolo geométrico (implementado em `Logo.tsx`)

**Status de aplicação:**
- `Logo.tsx` ✅ criado e no header
- `Layout.tsx` ✅ usa `#3DB8E8`
- `App.tsx` ⚠️ usa `#6B9AE8` — precisa trocar por `#3DB8E8`
- Paleta dourada `#C9A84C` ✅ removida

---

## ⏳ PRÓXIMOS PASSOS (em ordem de prioridade)

### 1. Padronizar cor primária no App.tsx
- [ ] Trocar `#6B9AE8` por `#3DB8E8` em `App.tsx` (sidebar ativa e nav)

### 2. Decidir sobre CommandCenter
- [ ] Opção A: re-adicionar rota `/command-center` no `App.tsx`
- [ ] Opção B: remover o arquivo se não for usar

### 3. Conectar dados reais nas páginas
- [ ] Trocar dados mock do Dashboard por chamadas reais via `metricsApi.dashboard()`
- [ ] Trocar dados mock do Analytics por chamadas reais
- [ ] Trocar dados mock do Professor por chamadas reais via `analyzeApi.dashboard()`

### 5. Vincular Google Ads
- [ ] Backend `sync.ts`: implementar `/api/sync/google` real
- [ ] Cron job a cada 1 hora

### 6. Redis (dependência instalada, não configurado)
- [ ] Adicionar `REDIS_URL` no Railway
- [ ] Usar para cache de métricas (TTL 5min)
- [ ] Usar para sessões/rate limiting

### 7. n8n integrações (depois de tudo funcionando)
- [ ] Webhook recebe leads
- [ ] Validação + scoring
- [ ] Notifica Slack/WhatsApp
- [ ] Distribui pra CRM

---

## 🛠️ ROTAS DA API (ESTADO ATUAL)

```
GET  /health                        → status do servidor

POST /api/auth/register             → cadastro
POST /api/auth/login                → login
GET  /api/auth/me                   → dados do usuário logado [auth]

GET  /api/campaigns                 → listar campanhas [auth]
GET  /api/campaigns/:id             → uma campanha [auth]
POST /api/campaigns                 → criar campanha [auth]
PATCH /api/campaigns/:id            → atualizar campanha [auth]
DELETE /api/campaigns/:id           → remover campanha [auth]

GET  /api/metrics/dashboard         → métricas gerais [auth]
GET  /api/metrics/:id               → métricas de campanha [auth]

GET  /api/sync/status               → status das sincronizações [auth]
POST /api/sync/meta                 → sincronizar Meta Ads [auth]
POST /api/sync/google               → sincronizar Google Ads [auth]

GET  /api/analyze/dashboard         → análise geral (Professor) [auth]
GET  /api/analyze/:id               → análise de campanha [auth]

GET  /api/integrations              → listar integrações [auth]
POST /api/integrations              → salvar credenciais [auth]
DELETE /api/integrations/:platform  → remover integração [auth]
```

---

## 🤖 SISTEMA PROFESSOR — Lógica de Análise

### Métricas e thresholds:

| Métrica | Bom | Médio | Ruim | Ação |
|---------|-----|-------|------|------|
| **CPA** | < R$ 40 | R$ 40-60 | > R$ 60 | Pausar acima de 60 |
| **CTR** | > 2.5% | 1.5-2.5% | < 1.5% | Mudar criativo |
| **ROAS** | > 3x | 2-3x | < 2x | Pausar abaixo de 1x |
| **CPC** | < R$ 1.50 | R$ 1.50-2.50 | > R$ 2.50 | Reduzir bid |
| **ROI** | > 150% | 50-150% | < 50% | Atenção |

### Health Score (0-100):
```typescript
score = 100;
if (roas < 1.5) score -= 30;
if (cpa > 80)   score -= 20;
if (ctr < 1.5)  score -= 15;
if (roi < 100)  score -= 10;
if (roas > 3)   score += 10;
if (cpa < 40)   score += 10;
if (ctr > 2.5)  score += 10;
```

---

## 🎯 COMANDOS ÚTEIS (Claude Code)

**Atualizar local com GitHub:**
```bash
git pull origin main
```

**Rodar localmente:**
```bash
# Frontend
cd frontend
npm install
npm run dev
# → http://localhost:5173

# Backend (em outra janela)
cd backend
npm install
npm run dev
# → http://localhost:3001
```

**Deploy:**
```bash
git add .
git commit -m "sua mensagem"
git push origin main
# Vercel faz deploy automático
```

---

## 💡 IDEIAS PRA PRÓXIMA FASE

### Curto prazo (1-2 meses)
- [x] Conectar Meta Ads API real ✅
- [ ] Conectar Google Ads API real
- [ ] Sistema de notificações (email + WhatsApp)
- [ ] Relatórios PDF automáticos
- [ ] Multi-conta (gerenciar várias contas Meta/Google)

### Médio prazo (3-6 meses)
- [ ] Machine Learning real (TensorFlow.js)
  - Previsão de conversão por lead
  - Otimização automática de bids
  - Detecção de padrões sazonais
- [ ] White-label pra agências
- [ ] Integração Pipedrive/RD CRM/HubSpot
- [ ] App mobile (React Native)

### Longo prazo (SaaS)
- [ ] Sistema de billing (Stripe/Pagar.me)
- [ ] Onboarding automatizado
- [ ] Suporte (Crisp/Intercom)
- [ ] Marketing site (.com.br)
- [ ] Programa de afiliados

---

## 📊 INVESTIMENTO NECESSÁRIO PRA SAAS

### Fase 1: Validação (R$ 100-300/mês)
- Railway backend: R$ 25
- Neon database: R$ 0 (free tier)
- Domínio: R$ 40/ano
- Email transacional: R$ 0 (Resend free tier)

### Fase 2: 10-50 clientes (R$ 600-1.500/mês)
- Servidor maior
- Banco mais robusto
- Stripe (4-6% das vendas)
- Suporte (Crisp/Intercom)
- Monitoramento (Sentry)

### Pricing sugerido:
- **Starter:** R$ 197/mês (até 5 contas Meta/Google)
- **Pro:** R$ 497/mês (até 20 contas)
- **Agency:** R$ 997/mês (ilimitado + white-label)

**Concorrência:**
- RD Station Marketing: R$ 459-2.749/mês
- Optmyzr: R$ 800-3.000/mês
- DataBox: R$ 250-800/mês

---

## 🚀 INSTRUÇÃO PRO CLAUDE CODE

**Quando abrir o Claude Code, passa esse comando:**

```
@Claude Code, vou continuar o desenvolvimento do ÊXODOS PRO.

Repositório: https://github.com/lgvieira30/exodos-pro
Status atual: documentado em STATUS_PROJETO.md

Lê o STATUS_PROJETO.md e me ajuda a executar o próximo passo.
```

---

## 📞 SUPORTE

Se travar em algo, volta no Claude.ai e cola:
1. Print do erro
2. Qual passo tava fazendo
3. O que esperava acontecer

---

**Bora pra Mônaco com tudo isso! 🚀**
