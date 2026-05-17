import postgres from 'postgres';

if (!process.env.DATABASE_URL) {
  console.warn('⚠️  DATABASE_URL não definida — rotas de banco vão falhar');
}

const useSSL = process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('sslmode=disable');

export const sql = process.env.DATABASE_URL
  ? postgres(process.env.DATABASE_URL, { ssl: useSSL ? 'require' : false, max: 10, idle_timeout: 20, connect_timeout: 10 })
  : (() => { throw new Error('DATABASE_URL não configurada'); }) as unknown as ReturnType<typeof postgres>;
