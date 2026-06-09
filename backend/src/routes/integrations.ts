import { Router, Request, Response } from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { sql } from '../db/index.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

export const integrationsRouter = Router();

// Scope mínimo para ler/gerenciar contas do Google Ads
const GOOGLE_OAUTH_SCOPE = 'https://www.googleapis.com/auth/adwords';

// Credenciais do APP (nível plataforma) — configuradas no Easypanel
function googleConfig() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    developerToken: process.env.GOOGLE_DEVELOPER_TOKEN || '',
  };
}

// A URI de redirect precisa bater exatamente com a registrada no Google Cloud Console.
// Prefira definir GOOGLE_OAUTH_REDIRECT_URI; o fallback monta a partir do host da requisição.
function googleRedirectUri(req: Request): string {
  if (process.env.GOOGLE_OAUTH_REDIRECT_URI) return process.env.GOOGLE_OAUTH_REDIRECT_URI;
  const proto = (req.headers['x-forwarded-proto'] as string)?.split(',')[0] || req.protocol;
  return `${proto}://${req.get('host')}/api/integrations/google/oauth/callback`;
}

// ─── Callback do OAuth (PÚBLICO — o Google redireciona o navegador para cá) ───
integrationsRouter.get('/google/oauth/callback', async (req: Request, res: Response) => {
  const frontend = process.env.FRONTEND_URL || 'http://localhost:5173';
  const fail = (msg: string) =>
    res.redirect(`${frontend}/settings?google=error&message=${encodeURIComponent(msg)}`);

  const { code, state, error: oauthError } = req.query as Record<string, string>;
  if (oauthError) return fail(oauthError);
  if (!code || !state) return fail('Codigo ou state ausente');

  let userId: string;
  let nickname: string | undefined;
  try {
    const payload = jwt.verify(state, process.env.JWT_SECRET!) as {
      userId: string; nickname?: string; purpose?: string;
    };
    if (payload.purpose !== 'google_oauth') throw new Error('state invalido');
    userId = payload.userId;
    nickname = payload.nickname;
  } catch {
    return fail('Sessao expirada, tente conectar novamente');
  }

  const { clientId, clientSecret, developerToken } = googleConfig();
  if (!clientId || !clientSecret) return fail('OAuth do Google nao configurado no servidor');

  try {
    // Troca o authorization code por tokens (queremos o refresh_token)
    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: googleRedirectUri(req),
    });
    const refreshToken: string | undefined = tokenRes.data.refresh_token;
    const accessToken: string = tokenRes.data.access_token;
    if (!refreshToken) {
      return fail('O Google nao retornou um refresh_token. Remova o acesso do app na sua Conta Google e conecte novamente.');
    }

    // Descobre quais contas do Google Ads esse login pode acessar
    let customerIds: string[] = [];
    try {
      const listRes = await axios.get(
        'https://googleads.googleapis.com/v23/customers:listAccessibleCustomers',
        { headers: { Authorization: `Bearer ${accessToken}`, 'developer-token': developerToken } }
      );
      customerIds = (listRes.data?.resourceNames || [])
        .map((r: string) => r.split('/')[1])
        .filter(Boolean);
    } catch (e: any) {
      const m = e.response?.data?.error?.message || e.message;
      return fail(`Conta autorizada, mas nao foi possivel listar as contas do Google Ads: ${m}`);
    }

    if (customerIds.length === 0) return fail('Nenhuma conta do Google Ads acessivel com este login');

    // Salva uma integracao por conta acessivel; ativa a primeira
    await sql`UPDATE user_integrations SET is_active = false WHERE user_id = ${userId} AND platform = 'google'`;
    let first = true;
    for (const customerId of customerIds) {
      const [existing] = await sql`
        SELECT id FROM user_integrations
        WHERE user_id = ${userId} AND platform = 'google' AND account_id = ${customerId}
      `;
      if (existing) {
        await sql`
          UPDATE user_integrations SET
            app_id = ${clientId}, app_secret = ${clientSecret}, developer_token = ${developerToken},
            access_token = ${refreshToken}, is_active = ${first}, updated_at = NOW()
          WHERE id = ${existing.id}
        `;
      } else {
        await sql`
          INSERT INTO user_integrations (user_id, platform, app_id, app_secret, access_token, account_id, nickname, developer_token, is_active)
          VALUES (${userId}, 'google', ${clientId}, ${clientSecret}, ${refreshToken}, ${customerId}, ${first ? (nickname || null) : null}, ${developerToken}, ${first})
        `;
      }
      first = false;
    }

    return res.redirect(`${frontend}/settings?google=connected&count=${customerIds.length}`);
  } catch (err: any) {
    const m =
      err.response?.data?.error_description ||
      err.response?.data?.error?.message ||
      err.message || 'Erro no OAuth do Google';
    console.error('[google/oauth/callback] ERRO:', m, JSON.stringify(err.response?.data || {}));
    return fail(String(m));
  }
});

// ══════════ Meta (Facebook) OAuth ══════════

const META_API_VERSION = 'v24.0';

function metaConfig() {
  return {
    appId: process.env.META_APP_ID || '',
    appSecret: process.env.META_APP_SECRET || '',
  };
}

function metaRedirectUri(req: Request): string {
  if (process.env.META_OAUTH_REDIRECT_URI) return process.env.META_OAUTH_REDIRECT_URI;
  const proto = (req.headers['x-forwarded-proto'] as string)?.split(',')[0] || req.protocol;
  return `${proto}://${req.get('host')}/api/integrations/meta/oauth/callback`;
}

// ─── Callback do OAuth do Meta (PUBLICO — o Facebook redireciona o navegador para ca) ───
integrationsRouter.get('/meta/oauth/callback', async (req: Request, res: Response) => {
  const frontend = process.env.FRONTEND_URL || 'http://localhost:5173';
  const fail = (msg: string) =>
    res.redirect(`${frontend}/settings?meta=error&message=${encodeURIComponent(msg)}`);

  const { code, state, error: oauthError, error_description } = req.query as Record<string, string>;
  if (oauthError) return fail(error_description || oauthError);
  if (!code || !state) return fail('Codigo ou state ausente');

  let userId: string;
  let nickname: string | undefined;
  try {
    const payload = jwt.verify(state, process.env.JWT_SECRET!) as {
      userId: string; nickname?: string; purpose?: string;
    };
    if (payload.purpose !== 'meta_oauth') throw new Error('state invalido');
    userId = payload.userId;
    nickname = payload.nickname;
  } catch {
    return fail('Sessao expirada, conecte novamente');
  }

  const { appId, appSecret } = metaConfig();
  if (!appId || !appSecret) return fail('OAuth do Meta nao configurado no servidor');

  try {
    // 1. Troca o code por um token de curta duracao
    const shortRes = await axios.get(`https://graph.facebook.com/${META_API_VERSION}/oauth/access_token`, {
      params: { client_id: appId, client_secret: appSecret, redirect_uri: metaRedirectUri(req), code },
    });
    const shortToken: string = shortRes.data.access_token;

    // 2. Troca pelo token de longa duracao (~60 dias)
    const longRes = await axios.get(`https://graph.facebook.com/${META_API_VERSION}/oauth/access_token`, {
      params: { grant_type: 'fb_exchange_token', client_id: appId, client_secret: appSecret, fb_exchange_token: shortToken },
    });
    const longToken: string = longRes.data.access_token;

    // 3. Descobre as contas de anuncio que esse login acessa
    const acctRes = await axios.get(`https://graph.facebook.com/${META_API_VERSION}/me/adaccounts`, {
      params: { fields: 'account_id,name', access_token: longToken, limit: 200 },
    });
    const accounts: any[] = acctRes.data?.data || [];
    if (accounts.length === 0) return fail('Nenhuma conta de anuncios do Meta encontrada para este login');

    // Salva uma integracao por conta; ativa a primeira
    await sql`UPDATE user_integrations SET is_active = false WHERE user_id = ${userId} AND platform = 'meta'`;
    let first = true;
    for (const acc of accounts) {
      const accountId = String(acc.account_id || '').replace('act_', '');
      if (!accountId) continue;
      const accName = first ? (nickname || acc.name || null) : (acc.name || null);
      const [existing] = await sql`
        SELECT id FROM user_integrations
        WHERE user_id = ${userId} AND platform = 'meta' AND account_id = ${accountId}
      `;
      if (existing) {
        await sql`
          UPDATE user_integrations SET
            app_id = ${appId}, access_token = ${longToken},
            nickname = COALESCE(${accName}, nickname), is_active = ${first}, updated_at = NOW()
          WHERE id = ${existing.id}
        `;
      } else {
        await sql`
          INSERT INTO user_integrations (user_id, platform, app_id, access_token, account_id, nickname, is_active)
          VALUES (${userId}, 'meta', ${appId}, ${longToken}, ${accountId}, ${accName}, ${first})
        `;
      }
      first = false;
    }

    return res.redirect(`${frontend}/settings?meta=connected&count=${accounts.length}`);
  } catch (err: any) {
    const m = err.response?.data?.error?.message || err.message || 'Erro no OAuth do Meta';
    console.error('[meta/oauth/callback] ERRO:', m, JSON.stringify(err.response?.data || {}));
    return fail(String(m));
  }
});

// ─── Daqui para baixo, tudo exige autenticacao ───
integrationsRouter.use(requireAuth);

// Inicia o fluxo OAuth — devolve a URL de consentimento que o frontend deve abrir
integrationsRouter.get('/google/oauth/start', (req: AuthRequest, res: Response) => {
  const { clientId } = googleConfig();
  if (!clientId) {
    res.status(500).json({ success: false, error: { message: 'OAuth do Google nao configurado no servidor (defina GOOGLE_CLIENT_ID).' } });
    return;
  }
  const nickname = (req.query.nickname as string) || undefined;
  const state = jwt.sign(
    { userId: req.userId!, nickname, purpose: 'google_oauth' },
    process.env.JWT_SECRET!,
    { expiresIn: '10m' }
  );
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: googleRedirectUri(req),
    response_type: 'code',
    scope: GOOGLE_OAUTH_SCOPE,
    access_type: 'offline',   // necessario para receber refresh_token
    prompt: 'consent',         // forca o consent para garantir o refresh_token
    include_granted_scopes: 'true',
    state,
  });
  res.json({ success: true, data: { url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` } });
});

// Inicia o fluxo OAuth do Meta — devolve a URL do dialogo do Facebook
integrationsRouter.get('/meta/oauth/start', (req: AuthRequest, res: Response) => {
  const { appId, appSecret } = metaConfig();
  if (!appId || !appSecret) {
    res.status(500).json({ success: false, error: { message: 'OAuth do Meta nao configurado no servidor (defina META_APP_ID e META_APP_SECRET).' } });
    return;
  }
  const nickname = (req.query.nickname as string) || undefined;
  const state = jwt.sign(
    { userId: req.userId!, nickname, purpose: 'meta_oauth' },
    process.env.JWT_SECRET!,
    { expiresIn: '10m' }
  );
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: metaRedirectUri(req),
    response_type: 'code',
    scope: 'ads_read',
    state,
  });
  res.json({ success: true, data: { url: `https://www.facebook.com/${META_API_VERSION}/dialog/oauth?${params.toString()}` } });
});

integrationsRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const rows = await sql`
      SELECT id, platform, account_id, nickname, is_active, last_sync_at, last_sync_status, created_at
      FROM user_integrations WHERE user_id = ${req.userId!}
      ORDER BY platform, is_active DESC, created_at DESC
    `;
    res.json({ success: true, data: { integrations: rows } });
  } catch (err: any) {
    console.error('GET /integrations error:', err);
    res.status(500).json({ success: false, error: { message: err.message || 'Erro ao buscar integracoes' } });
  }
});

integrationsRouter.post('/', async (req: AuthRequest, res: Response) => {
  const { platform, app_id, app_secret, access_token, account_id, nickname, developer_token } = req.body;
  if (!platform || !access_token || !account_id) {
    res.status(400).json({ success: false, error: { message: 'platform, access_token e account_id sao obrigatorios' } });
    return;
  }

  try {
    await sql`UPDATE user_integrations SET is_active = false WHERE user_id = ${req.userId!} AND platform = ${platform}`;

    const existing = await sql`
      SELECT id FROM user_integrations WHERE user_id = ${req.userId!} AND platform = ${platform} AND account_id = ${account_id}
    `;

    let row;
    if (existing.length > 0) {
      [row] = await sql`
        UPDATE user_integrations SET
          app_id = ${app_id || null}, app_secret = ${app_secret || null},
          access_token = ${access_token}, nickname = ${nickname || null},
          developer_token = ${developer_token || null},
          is_active = true, updated_at = NOW()
        WHERE user_id = ${req.userId!} AND platform = ${platform} AND account_id = ${account_id}
        RETURNING id, platform, account_id, nickname, is_active
      `;
    } else {
      [row] = await sql`
        INSERT INTO user_integrations (user_id, platform, app_id, app_secret, access_token, account_id, nickname, developer_token, is_active)
        VALUES (${req.userId!}, ${platform}, ${app_id || null}, ${app_secret || null}, ${access_token}, ${account_id}, ${nickname || null}, ${developer_token || null}, true)
        RETURNING id, platform, account_id, nickname, is_active
      `;
    }

    res.json({ success: true, data: { integration: row } });
  } catch (err: any) {
    console.error('POST /integrations error:', err);
    res.status(500).json({ success: false, error: { message: err.message || 'Erro ao salvar integracao' } });
  }
});

integrationsRouter.patch('/:id/activate', async (req: AuthRequest, res: Response) => {
  try {
    const [target] = await sql`
      SELECT id, platform FROM user_integrations WHERE id = ${req.params.id} AND user_id = ${req.userId!}
    `;
    if (!target) {
      res.status(404).json({ success: false, error: { message: 'Integracao nao encontrada' } });
      return;
    }

    await sql`UPDATE user_integrations SET is_active = false WHERE user_id = ${req.userId!} AND platform = ${target.platform}`;
    const [row] = await sql`
      UPDATE user_integrations SET is_active = true WHERE id = ${req.params.id}
      RETURNING id, platform, account_id, nickname, is_active
    `;
    res.json({ success: true, data: { integration: row } });
  } catch (err: any) {
    console.error('PATCH /integrations/:id/activate error:', err);
    res.status(500).json({ success: false, error: { message: err.message || 'Erro ao ativar integracao' } });
  }
});

integrationsRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const [deleted] = await sql`
      DELETE FROM user_integrations WHERE id = ${req.params.id} AND user_id = ${req.userId!}
      RETURNING id, platform, is_active
    `;
    if (!deleted) {
      res.status(404).json({ success: false, error: { message: 'Integracao nao encontrada' } });
      return;
    }

    if (deleted.is_active) {
      await sql`
        UPDATE user_integrations SET is_active = true
        WHERE id = (
          SELECT id FROM user_integrations
          WHERE user_id = ${req.userId!} AND platform = ${deleted.platform}
          ORDER BY created_at DESC LIMIT 1
        )
      `;
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error('DELETE /integrations/:id error:', err);
    res.status(500).json({ success: false, error: { message: err.message || 'Erro ao remover integracao' } });
  }
});
