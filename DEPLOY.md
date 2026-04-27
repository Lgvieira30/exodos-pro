# 🚀 Guia de Deploy — ÊXODOS PRO

Seu projeto pronto pra ir ao ar!

---

## Frontend (Vercel) — 2 minutos

### Opção 1: Automático (Recomendado)

1. Acessa **https://vercel.com/new**
2. Clica em **"Import Git Repository"**
3. Seleciona seu repositório GitHub `exodos-pro`
4. Framework: **Vite**
5. **Deploy!**

Pronto! Seu frontend tá online em `exodos-pro.vercel.app`

### Opção 2: Manual

```bash
cd frontend
npm run build
vercel deploy
```

---

## Backend (Railway) — 5 minutos

### Passo 1: Conectar GitHub

1. Acessa **https://railway.app**
2. Login com GitHub
3. Clica em **"New Project"**
4. **"Deploy from GitHub Repo"**
5. Seleciona `exodos-pro`

### Passo 2: Configurar

1. Railway auto-detecta Node.js
2. Vai pro aba **"Variables"**
3. Adiciona:
   ```
   DATABASE_URL=postgresql://user:pass@db:5432/exodos
   JWT_SECRET=seu_secret_aqui_aleatorio
   NODE_ENV=production
   PORT=3001
   ```

### Passo 3: Deploy

Clica **"Deploy"** e pronto!

URL do backend: `exodos-pro-production.up.railway.app`

---

## Banco de Dados (Neon PostgreSQL) — 3 minutos

1. Acessa **https://neon.tech**
2. Sign up com GitHub
3. Cria um novo projeto PostgreSQL
4. Copia a **Connection String**
5. Adiciona no Railway como `DATABASE_URL`

---

## Environment Variables

Cria um `.env.production` no backend com:

```
DATABASE_URL=postgresql://...
JWT_SECRET=seu_secret_super_aleatorio_aqui
NODE_ENV=production
PORT=3001
```

---

## Checklist Final

- [ ] Frontend rodando em Vercel
- [ ] Backend rodando em Railway
- [ ] Banco de dados PostgreSQL conectado
- [ ] Variáveis de ambiente configuradas
- [ ] CORS configurado (frontend pode falar com backend)
- [ ] HTTPS funcionando
- [ ] Domínio customizado (opcional)

---

## URLs Finais

```
Frontend:  https://seu-dominio.vercel.app
Backend:   https://seu-dominio.up.railway.app
Database:  PostgreSQL (Neon)
```

---

## Troubleshooting

**Backend não conecta em banco?**
→ Verifica `DATABASE_URL` nas variáveis

**CORS error?**
→ Backend precisa ter:
```typescript
app.use(cors({
  origin: 'https://seu-frontend.vercel.app'
}))
```

**Build falha?**
→ Confere se todas as dependências estão no package.json

---

**Pronto! Seu ÊXODOS PRO tá online!** 🎉
