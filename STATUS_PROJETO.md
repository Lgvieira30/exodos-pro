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
```

### Backend
```
Node.js + Express
TypeScript
PostgreSQL (Neon — pendente)
Axios (Meta Ads / Google Ads APIs)
```

### Deploy
```
Frontend: Vercel ✅ ONLINE
Backend: Railway ⏳ Pendente (precisa root dir = "backend")
Database: Neon ⏳ Pendente
```

---

## 🗂️ ESTRUTURA DO REPOSITÓRIO

```
exodos-pro/
├── frontend/
│   ├── src/
│   │   ├── App.tsx                    ⚡ Nav principal + roteamento
│   │   ├── main.tsx
│   │   ├── pages/
│   │   │   ├── CommandCenter.tsx      🆕 Sistema autônomo (PÁGINA NOVA)
│   │   │   ├── Professor.tsx          🆕 Dashboard que explica métricas
│   │   │   ├── Dashboard.tsx          📊 Visão geral
│   │   │   ├── Analytics.tsx          📈 4 gráficos + KPIs
│   │   │   ├── Wizard.tsx             🚀 Criação de campanha (5 steps)
│   │   │   ├── CreativeStudio.tsx     🎨 Editor de criativos
│   │   │   ├── Settings.tsx           ⚙️ API credentials
│   │   │   ├── Login.tsx
│   │   │   └── Register.tsx
│   │   ├── components/
│   │   │   └── Sidebar.tsx
│   │   └── styles/globals.css
│   ├── index.html                     (com Google Fonts)
│   ├── package.json
│   └── vercel.json                    (configurado pra deploy)
│
├── backend/
│   ├── src/
│   │   ├── index.ts                   (Express + CORS + rotas)
│   │   ├── models/index.ts            (interfaces TypeScript)
│   │   ├── services/
│   │   │   └── campaignProfessor.ts   🆕 Sistema Professor (analisa CPA/CTR/ROAS)
│   │   └── routes/
│   │       ├── campaigns.ts           (CRUD campanhas)
│   │       ├── credentials.ts         (Meta/Google/LinkedIn)
│   │       ├── sync.ts                (sincronização APIs)
│   │       └── insights.ts            🆕 API do Professor
│   ├── Dockerfile                     (Railway deploy)
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
└── docs/
    ├── ROADMAP_COMPLETO.md
    ├── DEPLOY.md
    ├── DEPLOY_RAILWAY.md
    └── SISTEMA_PROFESSOR.md
```

---

## ✅ O QUE JÁ FOI FEITO (commits no GitHub)

### 1. Base do projeto (commits anteriores)
- Frontend completo com 5 páginas
- Backend completo com APIs
- Deploy Vercel funcionando
- Documentação completa

### 2. Sistema Professor (commit `b6e7c13`)
**Localização:** `frontend/src/pages/Professor.tsx` + `backend/src/services/campaignProfessor.ts`

Sistema que:
- Analisa CPA, CTR, ROAS, CPC, ROI
- Explica cada métrica em linguagem natural
- Recomenda ações específicas
- Calcula impacto estimado
- Score de saúde 0-100

**API:**
```
GET /api/insights              → análise de todas campanhas
GET /api/insights/:id          → uma campanha
GET /api/insights/:id/metric/:name  → uma métrica específica
GET /api/insights/actions/prioritized  → ações prioritárias
GET /api/insights/health/check  → saúde geral
```

### 3. Command Center (commit `85959d8`)
**Localização:** `frontend/src/pages/CommandCenter.tsx`

Sistema autônomo com:
- **6 agentes especializados:**
  - Strategy Agent (analisa padrões)
  - Media Buyer Agent (realoca budget)
  - Content Agent (gera variações de criativo)
  - Analytics Agent (detecta anomalias)
  - Compliance Agent (valida criativos)
  - Decision Agent (toma decisões)
- **Simulador de cenários** com slider de budget
- **Marketing Mix Modeling** (alocação ótima de canais)
- **Anomaly detection** em tempo real
- **Histórico auditável** de decisões autônomas
- **Recomendações prescritivas** com confidence score

### 4. Iterações de design (commits `a462be4`, `fb40377`, `039b620`)
- v1: Dark mode com cores vibrantes (estourou os olhos)
- v2: Editorial estilo revista financeira (paper cream + Fraunces)
- v3: Dark suavizado com cores pasteladas
- v4: **Estilo RD Station — sidebar lateral, cards brancos, turquesa como primária** (ATUAL)

---

## 🎨 IDENTIDADE VISUAL (IMPORTANTE!)

**Marca real do Lucas (revelada pela foto):**
- Nome: **ÊXODOS system conversion**
- Cor primária: **Azul ciano vibrante** (~`#3DB8E8`)
- Logo: mandala/símbolo geométrico azul à esquerda
- Tagline em azul mais transparente

⚠️ **PENDENTE:** Aplicar a identidade real no app. As versões atuais usam dourado (`#C9A84C`) ou turquesa que não bate com a marca real.

**Quando atualizar no Claude Code:**
1. Pegar logo oficial em PNG/SVG
2. Trocar todos `#C9A84C` por `#3DB8E8` (cor real Êxodos)
3. Adicionar logo no header da plataforma

---

## ⏳ PRÓXIMOS PASSOS (em ordem de prioridade)

### 1. Aplicar identidade visual real
- [ ] Subir logo oficial Êxodos no `/frontend/public/`
- [ ] Trocar paleta dourada por azul ciano `#3DB8E8`
- [ ] Atualizar `App.tsx` com logo no header

### 2. Deploy do Backend
- [ ] Criar conta Neon (https://neon.tech)
- [ ] Criar projeto + copiar DATABASE_URL
- [ ] Railway: settings → root directory = `backend`
- [ ] Adicionar env vars no Railway:
  ```
  DATABASE_URL=postgresql://...
  PORT=3001
  NODE_ENV=production
  FRONTEND_URL=https://exodos-pro-9d9i.vercel.app
  META_APP_ID=...
  META_APP_SECRET=...
  GOOGLE_CLIENT_ID=...
  GOOGLE_CLIENT_SECRET=...
  ```
- [ ] Redeploy no Railway

### 3. Conectar Frontend ↔️ Backend
- [ ] Criar `frontend/src/services/api.ts` com axios
- [ ] Trocar dados mock do Command Center por chamadas reais
- [ ] Trocar dados mock do Professor por chamadas reais
- [ ] Adicionar variável `VITE_API_URL` no Vercel

### 4. Vincular Meta Ads + Google Ads
- [ ] Settings page: form pra inserir API keys
- [ ] Backend: implementar `/api/sync/meta`
- [ ] Backend: implementar `/api/sync/google`
- [ ] Cron job a cada 1 hora

### 5. Sistema de autenticação
- [ ] JWT no backend
- [ ] Login/Register funcional
- [ ] Multi-tenancy (cada user vê só suas campanhas)

### 6. n8n integrações (depois de tudo funcionando)
- [ ] Webhook recebe leads
- [ ] Validação + scoring
- [ ] Notifica Slack/WhatsApp
- [ ] Distribui pra CRM

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
if (cpa > 80) score -= 20;
if (ctr < 1.5) score -= 15;
if (roi < 100) score -= 10;
if (roas > 3) score += 10;
if (cpa < 40) score += 10;
if (ctr > 2.5) score += 10;
```

---

## 🎯 COMANDOS ÚTEIS (Claude Code)

**Atualizar local com GitHub:**
```bash
cd C:\Users\lucas\exodos-pro
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
- [ ] Conectar Meta Ads API real
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

Próximas prioridades:
1. Aplicar identidade visual real (azul ciano #3DB8E8)
2. Adicionar logo Êxodos system conversion
3. Deploy do backend no Railway
4. Conectar frontend ao backend
5. Integrar Meta Ads API real

Lê o STATUS_PROJETO.md e me ajuda a executar o item 1.
```

---

## 📞 SUPORTE

Se travar em algo, volta no Claude.ai e cola:
1. Print do erro
2. Qual passo tava fazendo
3. O que esperava acontecer

---

**Bora pra Mônaco com tudo isso! 🚀**
