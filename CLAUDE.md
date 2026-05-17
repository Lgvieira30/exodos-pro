# ÊXODOS PRO — Contexto para o Claude Code

## O que é o projeto
Plataforma de gestão autônoma de tráfego pago para o Lucas Vieira (Mônaco Gestão Documental).
Futuramente um SaaS para agências brasileiras (concorrentes: RD Station, Optmyzr).

**Repositório:** https://github.com/lgvieira30/exodos-pro
**Frontend (Vercel):** https://exodos-pro-9d9i.vercel.app ← URL curta (produção)
**Frontend (git-main):** https://exodos-pro-9d9i-git-main-lgvieira30s-projects.vercel.app ← conectado ao VPS
> VITE_API_URL deve estar em Settings → Env Vars apontando para o backend Easypanel

---

## Deploy atual

| Serviço | Plataforma | Status | URL/Info |
|---------|-----------|--------|----------|
| Frontend | Vercel | Online | https://exodos-pro-9d9i.vercel.app |
| Backend | Easypanel (VPS Hostinger) | Online | porta 3001 |
| Banco de dados | Easypanel (PostgreSQL interno) | Online | serviço `exodos-pro_db` |
| Meta Ads | Conectado | — | sync funcionando |
| Google Ads | Pendente | — | rota não implementada |

### Como o Easypanel funciona
- O Easypanel roda no VPS da Hostinger
- Ele lê o `backend/Dockerfile` e faz o build automaticamente a cada push no GitHub
- O banco PostgreSQL roda como serviço separado dentro do Easypanel (`exodos-pro_db`)
- O frontend fica no Vercel e se comunica com o backend via HTTPS

### Observações importantes sobre o banco
- O banco local do Easypanel **não usa SSL** — o `DATABASE_URL` deve ter `sslmode=disable`
- O `db/index.ts` detecta isso automaticamente: se `sslmode=disable` estiver na URL, conecta sem SSL; caso contrário (Neon/remoto) usa `ssl: 'require'`
- As migrations rodam automaticamente no startup — se o log mostrar `✅ Banco de dados pronto`, está tudo certo
- Se o log mostrar só `🚀 ÊXODOS PRO backend rodando na porta 3001` sem a linha do banco, o problema é SSL ou credenciais erradas

### Variáveis de ambiente no Easypanel (backend)
Configuradas diretamente no painel do Easypanel → serviço backend → Environment:
```
DATABASE_URL=postgres://postgres:atprr45gx8ilsbvm19tm@exodos-pro_db:5432/exodos-pro?sslmode=disable
JWT_SECRET=exodos_jwt_secret_super_seguro_2024
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://exodos-pro-9d9i.vercel.app
```

> `exodos-pro_db` é o hostname interno do PostgreSQL dentro do Easypanel. Não usar `localhost`.
> `FRONTEND_URL` é obrigatório para o CORS liberar requisições do Vercel.

---

## Stack

### Frontend (`/frontend`) — deploy no Vercel
- React 18 + TypeScript + Vite 5
- TailwindCSS 3, React Router 6, Recharts, ReactFlow, Lucide React
- Cliente HTTP: `src/lib/api.ts` (axios + interceptor JWT automático)
- Em produção usa `/api` como base URL (mesma origem não, mas configurado via VITE_API_URL)

### Backend (`/backend`) — deploy no Easypanel
- Node.js + Express 4 + TypeScript (ESM)
- PostgreSQL via driver `postgres` (sem ORM)
- JWT (`jsonwebtoken` + `bcryptjs`), Helmet, express-validator
- Dockerfile: `backend/Dockerfile` — build TypeScript, sem frontend

---

## Estrutura de arquivos

```
exodos-pro/
├── Dockerfile                  Build completo (frontend + backend) — usado localmente / docker-compose
├── docker-compose.yml          Para rodar localmente com docker compose up
├── .env.example                Modelo de variáveis de ambiente
│
├── frontend/src/
│   ├── App.tsx                 Nav + roteamento + Sidebar integrada
│   ├── lib/api.ts              Cliente HTTP (authApi, campaignsApi, metricsApi, syncApi, analyzeApi, integrationsApi)
│   ├── components/
│   │   ├── Logo.tsx            Logo geométrica Êxodos (usada no header)
│   │   ├── Layout.tsx          Layout alternativo (existe mas não usado pelo App.tsx)
│   │   ├── ProtectedRoute.tsx
│   │   └── Tooltip.tsx
│   └── pages/
│       ├── Dashboard.tsx       ✅ usa API real (metricsApi, campaignsApi, analyzeApi)
│       ├── Professor.tsx       Análise de métricas com linguagem natural
│       ├── Analytics.tsx
│       ├── Wizard.tsx          Criação de campanha (5 steps)
│       ├── CreativeStudio.tsx
│       ├── CommandCenter.tsx   ⚠️ existe mas NÃO está roteado no App.tsx
│       ├── Settings.tsx        Credenciais API
│       ├── Login.tsx
│       └── Register.tsx
│
├── backend/src/
│   ├── server.ts               Express + CORS + Helmet + migrations automáticas
│   ├── db/index.ts             Conexão PostgreSQL
│   ├── middleware/
│   │   ├── auth.ts             requireAuth (JWT)
│   │   └── errorHandler.ts
│   └── routes/
│       ├── index.ts            Router central
│       ├── auth.ts             POST /register, POST /login, GET /me
│       ├── campaigns.ts        CRUD campanhas
│       ├── metrics.ts          GET /metrics/dashboard, GET /metrics/:id
│       ├── sync.ts             POST /sync/meta (✅ real), POST /sync/google (⚠️ não implementado)
│       ├── analyze.ts          GET /analyze/dashboard, GET /analyze/:id
│       └── integrations.ts     GET/POST /integrations, DELETE /integrations/:platform
│
└── docs/architecture.md
```

---

## Banco de dados — tabelas ativas

```sql
users             (id, email, password_hash, name, timestamps)
campaigns         (id, user_id, name, platform, objective, status, budget, dates)
metrics           (id, campaign_id, date, spend, leads, conversions, impressions, clicks, cpc, cpa, roas, ctr)
user_integrations (id, user_id, platform, app_id, app_secret, access_token, account_id, last_sync, is_active, nickname)
```

Migrations rodam automaticamente no startup (`runMigrations()` em `server.ts`).

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
POST /api/sync/meta                      [auth]  ✅ implementado
POST /api/sync/google                    [auth]  ⚠️ não implementado

GET  /api/analyze/dashboard              [auth]
GET  /api/analyze/:id                    [auth]

GET/POST  /api/integrations              [auth]
DELETE    /api/integrations/:platform    [auth]
```

---

## Identidade visual

- Cor primária oficial: `#3DB8E8` (azul ciano)
- `App.tsx` ainda usa `#6B9AE8` — pendente padronizar
- `Logo.tsx` criado e ativo no header
- Paleta dourada `#C9A84C` removida

---

## Pendências

| # | Tarefa | Status |
|---|--------|--------|
| 1 | `CommandCenter.tsx` — re-integrar ao `App.tsx` ou deletar | ⚠️ Pendente |
| 2 | Campanhas pausadas no Dashboard/Professor/Analytics | ✅ Feito |
| 3 | Cor primária: trocar `#6B9AE8` por `#3DB8E8` no `App.tsx` | ⚠️ Pendente |
| 4 | Google Ads — implementar `/api/sync/google` real | ⚠️ Pendente |
| 5 | Dados mock → chamadas reais via `api.ts` | ✅ Feito (Dashboard usa API real) |
| 6 | Redis — cache de métricas | ⚠️ Pendente |
| 7 | `FRONTEND_URL` no Easypanel — liberar CORS do Vercel | ⚠️ Adicionar no painel |

---

## Padrões do projeto

**Resposta da API:**
```typescript
// Sucesso
{ success: true, data: { ... } }

// Erro
{ success: false, error: { code: string, message: string } }
```

**Auth:** todas as rotas protegidas usam `requireAuth` middleware. O frontend inclui `Authorization: Bearer` automaticamente via interceptor no `api.ts`. Token fica no `localStorage` com chave `token`.

**CORS:** configurado em `server.ts` para aceitar requisições de `FRONTEND_URL` e qualquer `*.vercel.app`.

**Easypanel deploy:** a cada push na branch `main`, o Easypanel detecta a mudança e faz rebuild automático usando `backend/Dockerfile`.
