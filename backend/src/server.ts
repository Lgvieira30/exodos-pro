import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { router } from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    const allowed = process.env.FRONTEND_URL || 'http://localhost:5173';
    if (!origin || origin === allowed || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', router);
app.use(errorHandler);

async function runMigrations() {
  if (!process.env.DATABASE_URL) return;
  try {
    const { sql } = await import('./db/index.js');
    await sql`CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, name TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`;
    await sql`CREATE TABLE IF NOT EXISTS campaigns (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, platform TEXT NOT NULL CHECK (platform IN ('meta','google','linkedin')), objective TEXT NOT NULL CHECK (objective IN ('leads','sales','awareness')), status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','completed')), budget NUMERIC(12,2) NOT NULL DEFAULT 0, start_date DATE, end_date DATE, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`;
    await sql`CREATE TABLE IF NOT EXISTS metrics (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE, date DATE NOT NULL, spend NUMERIC(12,2) DEFAULT 0, leads INTEGER DEFAULT 0, conversions INTEGER DEFAULT 0, impressions INTEGER DEFAULT 0, clicks INTEGER DEFAULT 0, cpc NUMERIC(8,4) DEFAULT 0, cpa NUMERIC(8,4) DEFAULT 0, roas NUMERIC(8,4) DEFAULT 0, ctr NUMERIC(8,4) DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE (campaign_id, date))`;
    await sql`CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_metrics_campaign_id ON metrics(campaign_id)`;
    await sql`CREATE TABLE IF NOT EXISTS user_integrations (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, platform TEXT NOT NULL, app_id TEXT, app_secret TEXT, access_token TEXT NOT NULL, account_id TEXT NOT NULL, last_sync_at TIMESTAMPTZ, last_sync_status TEXT DEFAULT 'never', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(user_id, platform))`;
    await sql`ALTER TABLE metrics ADD COLUMN IF NOT EXISTS roas NUMERIC(8,4) DEFAULT 0`;
    console.log('âœ… Banco de dados pronto');
  } catch (err) {
    console.error('âŒ Erro nas migrations:', err);
  }
}

app.listen(PORT, async () => {
  console.log(`ðŸš€ ÃŠXODOS PRO backend rodando na porta ${PORT}`);
  await runMigrations();
});

export default app;
