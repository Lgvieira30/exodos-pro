# 🚀 Deploy — Backend + Database

Guia completo pra colocar seu backend ONLINE no Railway + Neon

---

## ✅ Pré-requisitos

Você tem:
- ✅ GitHub com o código (`exodos-pro`)
- ✅ Backend em `/backend`
- ✅ Frontend em `/frontend`

---

## 📊 Passo 1: Banco de Dados (Neon PostgreSQL) — 3 minutos

### 1. Criar Banco

```
1. Acessa: https://neon.tech
2. Sign up com GitHub
3. New Project > PostgreSQL
4. Escolhe nome: "exodos-pro"
5. Copia a Connection String
```

Vai parecer assim:
```
postgresql://user:password@ep-xxx.us-east-1.neon.tech/exodos_pro
```

**SALVA ESSA STRING!** 🔒

---

## 🚂 Passo 2: Deploy Backend (Railway) — 5 minutos

### 1. Conectar GitHub

```
1. Acessa: https://railway.app
2. Sign up com GitHub
3. Clica "New Project"
4. Seleciona "Deploy from GitHub Repo"
5. Busca "exodos-pro"
6. Clica em Deploy
```

### 2. Configurar Environment Variables

Railway vai aparecer a tela de config. Adiciona:

```
DATABASE_URL = postgresql://user:password@ep-xxx.us-east-1.neon.tech/exodos_pro
PORT = 3001
NODE_ENV = production
FRONTEND_URL = https://exodos-pro-9d9i.vercel.app

META_APP_ID = seu_app_id (deixa em branco por enquanto)
META_APP_SECRET = seu_app_secret
META_ACCESS_TOKEN = seu_token

GOOGLE_CLIENT_ID = seu_client_id
GOOGLE_CLIENT_SECRET = seu_client_secret
GOOGLE_DEVELOPER_TOKEN = seu_developer_token
```

### 3. Deploy Automático!

Railway detecta `backend/package.json` e faz deploy automático.

Vai gerar uma URL tipo:
```
https://exodos-pro-production.up.railway.app
```

**SALVA ESSA URL!** 🚀

---

## 🔗 Passo 3: Conectar Frontend com Backend

### No seu `frontend/src/config/api.ts` (criar arquivo):

```typescript
const API_URL = process.env.NODE_ENV === 'production'
  ? 'https://exodos-pro-production.up.railway.app' // URL do Railway
  : 'http://localhost:3001';

export const api = {
  // Campanhas
  campaigns: {
    list: () => fetch(`${API_URL}/api/campaigns`),
    get: (id: string) => fetch(`${API_URL}/api/campaigns/${id}`),
    create: (data: any) => fetch(`${API_URL}/api/campaigns`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  },
  
  // Credenciais
  credentials: {
    list: () => fetch(`${API_URL}/api/credentials`),
    add: (data: any) => fetch(`${API_URL}/api/credentials`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  },
  
  // Sync
  sync: (credentialId?: string) => fetch(
    credentialId 
      ? `${API_URL}/api/sync/${credentialId}`
      : `${API_URL}/api/sync`,
    { method: 'POST' }
  ),
};
```

### Usar no Settings page:

```typescript
// frontend/src/pages/Settings.tsx
import { api } from '../config/api';

const handleAddCredential = async () => {
  const response = await api.credentials.add(formData);
  const result = await response.json();
  console.log('Credencial adicionada:', result);
};
```

---

## ✅ Verificar se Tá Funcionando

### Health Check

```bash
curl https://exodos-pro-production.up.railway.app/health
```

Resposta esperada:
```json
{
  "status": "OK",
  "timestamp": "2026-04-27T11:14:30.000Z"
}
```

### Listar Campanhas

```bash
curl https://exodos-pro-production.up.railway.app/api/campaigns
```

---

## 🔄 Fluxo Completo Agora

```
1. Frontend (Vercel)
   https://exodos-pro-9d9i.vercel.app
   ↓
2. Backend (Railway)
   https://exodos-pro-production.up.railway.app
   ↓
3. Database (Neon PostgreSQL)
   postgresql://...
   ↓
4. APIs Externas
   Meta Ads API
   Google Ads API
```

---

## 🎯 Próximos Passos

### A. Vincular Credenciais Meta Ads

```
1. Vai em Settings no app
2. Clica "+ Adicionar Conta"
3. Seleciona "Meta Ads"
4. Preenche: App ID, App Secret, Access Token
5. Salva
```

### B. Vincular Credenciais Google Ads

```
1. Vai em Settings
2. Clica "+ Adicionar Conta"
3. Seleciona "Google Ads"
4. Preenche: Client ID, Client Secret
5. Salva
```

### C. Sincronizar Dados

```
1. No Dashboard, clica "Sincronizar"
2. Backend puxa dados das APIs
3. Dashboard atualiza com dados reais
```

---

## 🔧 Troubleshooting

### "Connection refused" (Backend não responde)

```
1. Checa se Railway está rodando (railway.app/dashboard)
2. Verifica CORS no backend (deve ter seu frontend URL)
3. Checa DATABASE_URL (começa com postgresql://)
```

### "Credential invalid" (Credenciais não funcionam)

```
1. Verifica se tokens estão atualizados
2. Tenta regenerar tokens nas plataformas
3. Verifica se tem permissões corretas
```

### "Database connection error"

```
1. Copia a CONNECTION STRING correta do Neon
2. Cola no Railway como DATABASE_URL
3. Reinicia o deploy (railway redeploy)
```

---

## 📊 Status do Deploy

| Componente | Status | URL |
|-----------|--------|-----|
| Frontend | ✅ Online | https://exodos-pro-9d9i.vercel.app |
| Backend | ✅ Online | https://exodos-pro-production.up.railway.app |
| Database | ✅ Online | Neon PostgreSQL |
| Meta API | ⏳ Configurar | https://developers.facebook.com |
| Google API | ⏳ Configurar | https://developers.google.com |

---

## 🎉 Parabéns!

Você agora tem uma plataforma PROFISSIONAL online com:

- ✅ Frontend em Vercel (automático)
- ✅ Backend em Railway (automático)
- ✅ Banco de dados em Neon PostgreSQL
- ✅ Pronto pra integrar APIs reais

**Seu app está SCALÁVEL, SEGURO e PRONTO pro mercado!** 🚀

---

**Próximo:** Vincular suas contas Meta Ads + Google Ads e começar a trazer dados reais!
