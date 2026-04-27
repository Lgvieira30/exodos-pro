# 🚀 ÊXODOS PRO Backend

Backend completo para gerenciar campanhas com integração Meta Ads + Google Ads APIs.

---

## 📦 Instalação

```bash
cd backend
npm install
```

---

## 🔧 Configuração

1. **Copia o arquivo `.env.example` pra `.env`:**
   ```bash
   cp .env.example .env
   ```

2. **Preenche as variáveis:**
   ```
   PORT=3001
   DATABASE_URL=postgresql://...
   META_APP_ID=...
   META_APP_SECRET=...
   GOOGLE_CLIENT_ID=...
   ```

---

## 🏃 Rodar Localmente

**Desenvolvimento (com hot reload):**
```bash
npm run dev
```

**Produção:**
```bash
npm run build
npm start
```

---

## 📊 Endpoints da API

### Campanhas
- `GET /api/campaigns` - Listar campanhas
- `GET /api/campaigns/:id` - Detalhes da campanha
- `POST /api/campaigns` - Criar campanha
- `PUT /api/campaigns/:id` - Atualizar campanha
- `DELETE /api/campaigns/:id` - Deletar campanha

### Credenciais
- `GET /api/credentials` - Listar credenciais
- `GET /api/credentials/:id` - Detalhes da credencial
- `POST /api/credentials` - Adicionar credencial
- `PUT /api/credentials/:id` - Atualizar credencial
- `DELETE /api/credentials/:id` - Deletar credencial
- `POST /api/credentials/:id/verify` - Verificar credencial

### Sincronização
- `POST /api/sync` - Sincronizar todas as contas
- `POST /api/sync/:credentialId` - Sincronizar conta específica
- `GET /api/sync/status/:credentialId` - Status da sincronização

---

## 🔌 Integração Meta Ads API

### 1. Criar App no Facebook Developers

```
https://developers.facebook.com
→ Create App
→ Select Business
→ App name: "ÊXODOS PRO"
```

### 2. Configurar Marketing API

```
Products → Add Product → Marketing API
Tools → Get Access Token (User Token)
```

### 3. No `.env`:

```
META_APP_ID=seu_app_id
META_APP_SECRET=seu_app_secret
META_ACCESS_TOKEN=seu_access_token
```

### 4. Usar no Frontend:

```javascript
// frontend/src/api.ts
const response = await fetch(`${API_URL}/credentials`, {
  method: 'POST',
  body: JSON.stringify({
    platform: 'meta',
    name: 'Minha Conta Meta',
    appId: 'APP_ID',
    appSecret: 'APP_SECRET',
    accessToken: 'ACCESS_TOKEN',
  }),
});
```

---

## 🔌 Integração Google Ads API

### 1. Criar Projeto no Google Cloud

```
https://console.developers.google.com
→ New Project → "ÊXODOS PRO"
```

### 2. Ativar Google Ads API

```
Library → Search "Google Ads" → Enable
Credentials → Create OAuth 2.0 Client ID
```

### 3. No `.env`:

```
GOOGLE_CLIENT_ID=seu_client_id
GOOGLE_CLIENT_SECRET=seu_client_secret
GOOGLE_DEVELOPER_TOKEN=seu_developer_token
```

### 4. Usar no Frontend:

```javascript
const response = await fetch(`${API_URL}/credentials`, {
  method: 'POST',
  body: JSON.stringify({
    platform: 'google',
    name: 'Minha Conta Google',
    clientId: 'CLIENT_ID',
    clientSecret: 'CLIENT_SECRET',
  }),
});
```

---

## 🗄️ Banco de Dados (PostgreSQL)

### Com Neon PostgreSQL (Recomendado)

```
1. Acessa: https://neon.tech
2. Sign up → New Project
3. Copia: Connection String
4. No .env: DATABASE_URL=postgresql://...
```

### Localmente

```bash
# Instalar PostgreSQL
# macOS: brew install postgresql
# Windows: Download de postgresql.org

# Criar database
createdb exodos_pro

# Conectar
psql -U postgres exodos_pro
```

---

## 🚀 Deploy no Railway

### 1. Acessa Railway

```
https://railway.app
→ New Project
→ Deploy from GitHub Repo
→ Seleciona exodos-pro
```

### 2. Configura Environment

```
Database: PostgreSQL
Environment Variables:
  - DATABASE_URL = (auto-preenchido)
  - META_APP_ID = seu_valor
  - META_APP_SECRET = seu_valor
  - GOOGLE_CLIENT_ID = seu_valor
  - Etc...
```

### 3. Deploy Automático

Railway detecta `package.json` e faz deploy automático!

---

## 📈 Monitoramento

### Health Check

```bash
curl http://localhost:3001/health
```

Resposta esperada:
```json
{
  "status": "OK",
  "timestamp": "2026-04-27T11:14:30.000Z"
}
```

### Logs

```bash
# Railway
railway logs

# Localmente
npm run dev
```

---

## 🔒 Segurança

- ✅ CORS configurado
- ✅ Environment variables para secrets
- ✅ Error handling
- ✅ Input validation

---

## 📝 Próximos Passos

- [ ] Autenticação JWT
- [ ] Rate limiting
- [ ] Webhooks das APIs
- [ ] Cache com Redis
- [ ] Testes unitários
- [ ] CI/CD Pipeline

---

**Documentação Completa:** Ver `ROADMAP_COMPLETO.md`
