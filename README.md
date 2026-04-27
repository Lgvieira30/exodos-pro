# ÊXODOS PRO

Plataforma web unificada para gestão de campanhas de tráfego pago, criativos e automações.

**Status:** MVP em desenvolvimento
**Versão:** 0.1.0
**Última atualização:** 27/04/2026

---

## 🎯 O que é ÊXODOS PRO?

Uma plataforma web all-in-one onde você:

- 📊 **Dashboard** — Vê métricas em tempo real
- 🚀 **Wizard de Campanhas** — Cria campanhas passo a passo (sem complicação)
- 🎨 **Creative Studio** — Cria criativos visualmente (tipo Figma)
- 📈 **Analytics** — Performance completa de suas campanhas
- 📁 **Projetos** — Organiza tudo (repositórios nativos)
- 🤖 **Automações** — Fluxos n8n integrados

---

## 📁 Estrutura do Projeto

```
exodos-pro/
├── frontend/              # React + TypeScript
│   ├── src/
│   │   ├── components/   # Componentes reutilizáveis
│   │   ├── pages/        # Páginas (Dashboard, Campanhas, etc)
│   │   ├── hooks/        # Custom hooks
│   │   ├── utils/        # Funções auxiliares
│   │   └── styles/       # CSS/Tailwind
│   ├── public/           # Assets estáticos
│   └── package.json
│
├── backend/              # Node.js + Express
│   ├── src/
│   │   ├── routes/       # Endpoints da API
│   │   ├── models/       # Modelos de dados
│   │   ├── controllers/  # Lógica de negócio
│   │   ├── middleware/   # Middlewares (auth, etc)
│   │   └── utils/        # Funções auxiliares
│   ├── config/           # Configurações
│   └── package.json
│
├── docs/                 # Documentação
│   ├── architecture.md   # Arquitetura técnica
│   ├── setup.md          # Como rodar localmente
│   └── api.md            # Documentação da API
│
└── README.md             # Você está aqui
```

---

## 🚀 Quick Start

### Pré-requisitos
- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- Git

### Instalação Local

#### 1. Clone o repositório
```bash
git clone https://github.com/lucas-exodos/exodos-pro.git
cd exodos-pro
```

#### 2. Setup Frontend
```bash
cd frontend
npm install
npm run dev
# Acessa http://localhost:3000
```

#### 3. Setup Backend
```bash
cd ../backend
npm install
npm run dev
# API rodando em http://localhost:3001
```

#### 4. Setup Banco de Dados
```bash
# Criar database
psql -U postgres -c "CREATE DATABASE exodos_pro;"

# Rodar migrations
cd backend
npm run db:migrate
```

---

## 🏗️ MVP — Roadmap

### Sprint 1 (Semana 1-2)
- [x] Estrutura inicial (React + Express)
- [ ] Autenticação (JWT)
- [ ] Dashboard básico
- [ ] Conexão com Meta Ads API

### Sprint 2 (Semana 3-4)
- [ ] Wizard de campanhas (5 passos)
- [ ] Creative Studio básico
- [ ] Integração PostgreSQL
- [ ] Setup de métricas

### Sprint 3 (Semana 5-6)
- [ ] Analytics completo
- [ ] Projetos/Repositórios
- [ ] n8n integrado
- [ ] Deploy inicial

---

## 🛠️ Tech Stack

### Frontend
- **React** 18+ (TypeScript)
- **TailwindCSS** (styling)
- **React Router** (navegação)
- **Recharts** (gráficos)
- **React Flow** (canvas/diagrama)
- **Shadcn/ui** (componentes)

### Backend
- **Node.js** + **Express** (servidor)
- **PostgreSQL** (database)
- **Redis** (cache/realtime)
- **JWT** (autenticação)
- **Axios** (HTTP client)

### Integrações
- **Meta Ads API** (Facebook)
- **Google Ads API** (Google)
- **LinkedIn API** (LinkedIn)
- **n8n API** (automações)
- **Claude API** (AI)

### Deploy
- **Vercel** (frontend)
- **Railway/Render** (backend)
- **GitHub** (versionamento)

---

## 📚 Documentação

- [Architecture](./docs/architecture.md) — Arquitetura técnica detalhada
- [Setup Guide](./docs/setup.md) — Como rodar localmente
- [API Docs](./docs/api.md) — Documentação dos endpoints

---

## 🔐 Autenticação

O app usa JWT para autenticação:

```
1. User faz login
2. Backend valida credenciais
3. JWT token é gerado
4. Token armazenado no localStorage
5. Todas as requisições usam o token
```

---

## 🌐 Endpoints Principais (MVP)

### Auth
- `POST /api/auth/register` — Criar conta
- `POST /api/auth/login` — Fazer login
- `POST /api/auth/logout` — Logout

### Campanhas
- `GET /api/campaigns` — Listar todas
- `POST /api/campaigns` — Criar nova
- `GET /api/campaigns/:id` — Detalhes
- `PUT /api/campaigns/:id` — Editar
- `DELETE /api/campaigns/:id` — Deletar

### Métricas
- `GET /api/metrics/dashboard` — Dados do dashboard
- `GET /api/metrics/campaigns/:id` — Métricas de campanha

---

## 🚢 Deploy

### Frontend (Vercel)
```bash
cd frontend
vercel deploy
```

### Backend (Railway)
```bash
cd backend
railway link
railway deploy
```

---

## 📝 Convenções de Código

- **Commits:** `tipo: descrição curta`
  - `feat: adiciona dashboard`
  - `fix: corrige cálculo de CPA`
  - `refactor: simplifica wizard`

- **Nomenclatura:**
  - Componentes: `PascalCase` (DashboardCard.tsx)
  - Funções: `camelCase` (calculateCPA)
  - Constantes: `UPPER_SNAKE_CASE` (API_BASE_URL)

- **Branches:**
  - `main` — produção
  - `develop` — desenvolvimento
  - `feature/nome-funcionalidade` — novas features

---

## 🤝 Contribuindo

1. Crie uma branch `feature/sua-feature`
2. Commit suas mudanças
3. Push e abra um PR
4. Aguarde review

---

## 📞 Suporte

- **Issues:** lgvieira30
- **Email:** lgvieira.far@gmail.com
- **WhatsApp:** Só em caso de urgência

---

## 📄 License

MIT License — veja LICENSE.md para detalhes

---

**Desenvolvido por:** Lucas (Êxodos Conversões)
**Última atualização:** 27/04/2026
