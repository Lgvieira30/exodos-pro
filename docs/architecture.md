# Arquitetura ÊXODOS PRO

## Visão Geral

ÊXODOS PRO é uma plataforma web monolítica com arquitetura cliente-servidor:

```
┌─────────────────────────────────────────────────────┐
│              Frontend (React)                        │
│  - Dashboard                                        │
│  - Wizard de Campanhas                              │
│  - Creative Studio                                  │
│  - Analytics                                        │
└──────────────────┬──────────────────────────────────┘
                   │ HTTP/REST + WebSocket
                   │
┌──────────────────▼──────────────────────────────────┐
│            Backend (Node.js + Express)              │
│  - Auth (JWT)                                       │
│  - Campanhas                                        │
│  - Métricas                                         │
│  - Integrações                                      │
└──────────────────┬──────────────────────────────────┘
                   │
        ┌──────────┼──────────┐
        │          │          │
        ▼          ▼          ▼
    PostgreSQL   Redis      APIs Externas
    (Dados)   (Cache/RT)  (Meta, Google, n8n)
```

## Camadas

### 1. Presentation Layer (Frontend)

**Responsabilidades:**
- Renderizar UI
- Gerenciar estado local
- Validar inputs
- Comunicar com API

**Tecnologias:**
- React 18+ (components, hooks, state)
- React Router (navegação)
- Axios (HTTP client)
- Recharts (gráficos)
- React Flow (canvas)
- TailwindCSS (styling)

### 2. API Layer (Backend)

**Responsabilidades:**
- Autenticar usuários
- Validar dados
- Executar lógica de negócio
- Integrar com APIs externas
- Servir dados

**Tecnologias:**
- Express.js (framework web)
- Middleware (cors, helmet, auth)
- PostgreSQL (persistência)
- Redis (cache/realtime)

### 3. Data Layer

**PostgreSQL** (principal):
- Usuários
- Campanhas
- Métricas
- Projetos
- Logs

**Redis** (cache e realtime):
- Dados de sessão
- Cache de métricas
- WebSocket events

## Fluxos Principais

### Autenticação
```
1. User preenche email + senha
2. Frontend envia POST /api/auth/login
3. Backend valida credenciais contra PostgreSQL
4. Backend gera JWT token
5. Frontend armazena token em localStorage
6. Todas requisições posteriores incluem token no header Authorization
```

### Criar Campanha
```
1. User clica "Criar Nova" no Dashboard
2. Abre Wizard (5 passos)
3. User preenche dados
4. Frontend valida localmente
5. Frontend envia POST /api/campaigns com dados
6. Backend valida novamente
7. Backend conecta com Meta Ads API (ou Google)
8. Backend salva campanha no PostgreSQL
9. Frontend recebe ID da campanha e redireciona
10. Dashboard atualiza lista de campanhas
```

### Dashboard Realtime
```
1. Frontend abre Dashboard
2. Backend envia dados iniciais (REST)
3. Frontend estabelece WebSocket connection
4. Backend envia updates em tempo real:
   - Novas métricas (a cada 5 minutos)
   - Alertas (conforme ocorrem)
   - Status de campanhas (ao mudar)
5. Frontend atualiza dashboard sem refresh
```

## Estrutura de Dados

### Users
```typescript
interface User {
  id: UUID
  email: string
  passwordHash: string
  name: string
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Campaigns
```typescript
interface Campaign {
  id: UUID
  userId: UUID (FK)
  name: string
  platform: 'meta' | 'google' | 'linkedin'
  objective: 'leads' | 'sales' | 'awareness'
  status: 'draft' | 'active' | 'paused' | 'completed'
  budget: number
  startDate: date
  endDate: date
  creativeId: UUID (FK)
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Metrics
```typescript
interface Metrics {
  id: UUID
  campaignId: UUID (FK)
  date: date
  spend: number
  leads: number
  conversions: number
  cpc: number
  cpa: number
  roas: number
  ctr: number
  impressions: number
  clicks: number
  createdAt: timestamp
}
```

## Padrões de Design

### API Responses
```typescript
// Sucesso
{
  success: true
  data: { ... }
}

// Erro
{
  success: false
  error: {
    code: string
    message: string
  }
}
```

### Error Handling
```typescript
// Frontend
try {
  const response = await api.post('/campaigns', data)
  if (!response.success) {
    showError(response.error.message)
  }
} catch (err) {
  showError('Erro de rede')
}

// Backend
try {
  // validação
  // lógica
  res.json({ success: true, data: result })
} catch (err) {
  res.status(500).json({
    success: false,
    error: { code: 'SERVER_ERROR', message: err.message }
  })
}
```

### State Management
```typescript
// Frontend (React Hooks)
const [campaigns, setCampaigns] = useState([])
const [loading, setLoading] = useState(false)
const [error, setError] = useState(null)

// Buscar dados
useEffect(() => {
  setLoading(true)
  api.get('/campaigns')
    .then(res => setCampaigns(res.data))
    .catch(err => setError(err.message))
    .finally(() => setLoading(false))
}, [])
```

## Segurança

### JWT
- Token inclui: userId, email, iat, exp
- Expira em 24h
- Renovação: refresh token em httpOnly cookie
- Validação: middleware em rotas protegidas

### CORS
- Apenas origem frontend permitida
- Credenciais incluídas em requisições

### Validação
- Frontend: validação básica (UX)
- Backend: validação rigorosa (segurança)

### Dados Sensíveis
- Nunca armazenar no frontend
- Usar localStorage apenas para token
- HTTPS obrigatório em produção

## Performance

### Caching
- Redis: sessões (TTL 24h)
- Redis: métricas (TTL 5min)
- HTTP headers: cache-control

### Otimização
- Lazy loading de componentes
- Pagination: 20 items por página
- Compression: gzip no backend
- Database indexes: userId, campaignId, date

### Monitoramento
- Logs: arquivo + console (dev)
- Erro tracking: Sentry (produção)
- Performance: Google Lighthouse

## Deploy

### Staging
- Branch: develop
- Frontend: Vercel preview
- Backend: Railway staging

### Produção
- Branch: main
- Frontend: Vercel production
- Backend: Railway production
- Database: Neon PostgreSQL
- Cache: Railway Redis

---

**Atualizado:** 27/04/2026
