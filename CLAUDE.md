# ÊXODOS PRO — Contexto para o Claude Code

## O que é o projeto
Plataforma de gestão autônoma de tráfego pago para o Lucas Vieira (Mônaco Gestão Documental).
Futuramente um SaaS para agências brasileiras (concorrentes: RD Station, Optmyzr).

**Repositório:** https://github.com/lgvieira30/exodos-pro
**Frontend:** https://exodos-pro-9d9i.vercel.app

---

## Stack

### Frontend (`/frontend`)
- React 18 + TypeScript + Vite 5
- TailwindCSS 3, React Router 6, Recharts, ReactFlow, Lucide React
- Cliente HTTP: `src/lib/api.ts` (axios + interceptor JWT automático)

### Backend (`/backend`)
- Node.js + Express 4 + TypeScript (ESM)
- PostgreSQL via Neon (`postgres` driver, sem ORM)
- JWT (`jsonwebtoken` + `bcryptjs`), Helmet, express-validator
- Redis instalado mas ainda não em uso

---

## Deploy — TUDO ONLINE

| Serviço | Status | Plataforma |
|---------|--------|------------|
| Frontend | Online | Vercel |
| Backend | Online | Railway |
| Banco de dados | Online | Neon (PostgreSQL) |
| Meta Ads | Conectado | — |
| Google Ads | Pendente | — |

---

## Estrutura de arquivos

```
exodos-pro/
├── frontend/src/
│   ├── App.tsx               Nav + roteamento + Sidebar integrada
│   ├── lib/api.ts            Cliente HTTP (authApi, campaignsApi, metricsApi, syncApi, analyzeApi, integrationsApi)
│   ├── components/
│   │   ├── Logo.tsx          Logo geométrica Êxodos (usada no header)
│   │   ├── Layout.tsx        Layout alternativo (existe mas não usado pelo App.tsx)
│   │   ├── ProtectedRoute.tsx
│   │   └── Tooltip.tsx
│   └── pages/
│       ├── Dashboard.tsx
│       ├── Professor.tsx     Análise de métricas com linguagem natural
│       ├── Analytics.tsx
│       ├── Wizard.tsx        Criação de campanha (5 steps)
│       ├── CreativeStudio.tsx
│       ├── CommandCenter.tsx (existe mas NAO esta roteado no App.tsx)
│       ├── Settings.tsx      Credenciais API
│       ├── Login.tsx
│       └── Register.tsx
│
├── backend/src/
│   ├── server.ts             Express + CORS + Helmet + migrations automáticas
│   ├── db/index.ts           Conexão Neon
│   ├── middleware/
│   │   ├── auth.ts           requireAuth (JWT)
│   │   └── errorHandler.ts
│   └── routes/
│       ├── index.ts          Router central
│       ├── auth.ts           POST /register, POST /login, GET /me
│       ├── campaigns.ts      CRUD campanhas
│       ├── metrics.ts        GET /metrics/dashboard, GET /metrics/:id
│       ├── sync.ts           POST /sync/meta, POST /sync/google
│       ├── analyze.ts        GET /analyze/dashboard, GET /analyze/:id
│       └── integrations.ts   GET/POST /integrations, DELETE /integrations/:platform
│
└── docs/architecture.md
```

---

## Banco de dados — tabelas ativas

```sql
users             (id, email, password_hash, name, timestamps)
campaigns         (id, user_id, name, platform, objective, status, budget, dates)
metrics           (id, campaign_id, date, spend, leads, conversions, impressions, clicks, cpc, cpa, roas, ctr)
user_integrations (id, user_id, platform, app_id, app_secret, access_token, account_id, last_sync)
```

---

## API — rotas disponíveis

```
GET  /health

POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me                        [auth]

GET/POST          /api/campaigns         [auth]
GET/PATCH/DELETE  /api/campaigns/:id     [auth]

GET  /api/metrics/dashboard              [auth]
GET  /api/metrics/:id                    [auth]

GET  /api/sync/status                    [auth]
POST /api/sync/meta                      [auth]
POST /api/sync/google                    [auth]

GET  /api/analyze/dashboard              [auth]
GET  /api/analyze/:id                    [auth]

GET/POST  /api/integrations              [auth]
DELETE    /api/integrations/:platform    [auth]
```

---

## Identidade visual

- Cor primária oficial: #3DB8E8 (azul ciano)
- App.tsx ainda usa #6B9AE8 — pendente padronizar
- Logo.tsx criado e ativo no header
- Paleta dourada #C9A84C removida

---

## Pendências principais

1. CommandCenter.tsx — decidir: re-integrar ao App.tsx ou deletar
2. Análise de campanhas pausadas — exibir e analisar campanhas com status paused nas páginas Dashboard, Professor e Analytics
3. Cor primária — trocar #6B9AE8 por #3DB8E8 no App.tsx
4. Google Ads — implementar /api/sync/google real
5. Dados mock — trocar por chamadas reais via api.ts nas páginas Dashboard, Analytics, Professor
6. Redis — configurar no Railway para cache de métricas

---

## Padrões do projeto

**Resposta da API:**
```typescript
// Sucesso
{ success: true, data: { ... } }

// Erro
{ success: false, error: { code: string, message: string } }
```

**Auth:** todas as rotas protegidas usam requireAuth middleware. O frontend inclui Authorization: Bearer automaticamente via interceptor no api.ts. Token fica no localStorage com chave token.

**Migrations:** rodam automaticamente no startup do servidor (runMigrations() em server.ts).
