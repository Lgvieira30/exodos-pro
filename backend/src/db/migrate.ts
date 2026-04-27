import 'dotenv/config';
import { sql } from './index.js';

async function migrate() {
  console.log('🔄 Executando migrations...');

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email       TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name        TEXT NOT NULL,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS campaigns (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      platform    TEXT NOT NULL CHECK (platform IN ('meta', 'google', 'linkedin')),
      objective   TEXT NOT NULL CHECK (objective IN ('leads', 'sales', 'awareness')),
      status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
      budget      NUMERIC(12,2) NOT NULL DEFAULT 0,
      start_date  DATE,
      end_date    DATE,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS metrics (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      campaign_id   UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      date          DATE NOT NULL,
      spend         NUMERIC(12,2) DEFAULT 0,
      leads         INTEGER DEFAULT 0,
      conversions   INTEGER DEFAULT 0,
      impressions   INTEGER DEFAULT 0,
      clicks        INTEGER DEFAULT 0,
      cpc           NUMERIC(8,4) DEFAULT 0,
      cpa           NUMERIC(8,4) DEFAULT 0,
      roas          NUMERIC(8,4) DEFAULT 0,
      ctr           NUMERIC(8,4) DEFAULT 0,
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (campaign_id, date)
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_metrics_campaign_id ON metrics(campaign_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_metrics_date ON metrics(date)`;

  console.log('✅ Migrations concluídas!');
  await sql.end();
}

migrate().catch((err) => {
  console.error('❌ Erro nas migrations:', err);
  process.exit(1);
});
