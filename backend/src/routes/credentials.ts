import express, { Router } from 'express';

const router = Router();

// Mock data
let credentials: any[] = [];

// GET /api/credentials
router.get('/', (req, res) => {
  res.json({
    data: credentials,
    total: credentials.length,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/credentials/:id
router.get('/:id', (req, res) => {
  const credential = credentials.find(c => c.id === req.params.id);
  
  if (!credential) {
    return res.status(404).json({ error: 'Credential not found' });
  }
  
  res.json(credential);
});

// POST /api/credentials - Adicionar nova credencial
router.post('/', (req, res) => {
  const { platform, name, appId, appSecret, accessToken, clientId, clientSecret } = req.body;
  
  if (!platform || !name || !appId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // Validar credencial com a plataforma
  let isConnected = false;
  
  if (platform === 'meta' && appId && appSecret) {
    // TODO: Validar com Meta Ads API
    isConnected = true;
  } else if (platform === 'google' && clientId && clientSecret) {
    // TODO: Validar com Google Ads API
    isConnected = true;
  }
  
  const newCredential = {
    id: Date.now().toString(),
    userId: 'user1',
    platform,
    name,
    appId,
    appSecret,
    accessToken,
    clientId,
    clientSecret,
    isConnected,
    lastSync: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  credentials.push(newCredential);
  
  res.status(201).json({
    data: newCredential,
    message: `${platform} credential added successfully`,
  });
});

// PUT /api/credentials/:id - Atualizar credencial
router.put('/:id', (req, res) => {
  const index = credentials.findIndex(c => c.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Credential not found' });
  }
  
  credentials[index] = {
    ...credentials[index],
    ...req.body,
    updatedAt: new Date(),
  };
  
  res.json({
    data: credentials[index],
    message: 'Credential updated successfully',
  });
});

// DELETE /api/credentials/:id - Deletar credencial
router.delete('/:id', (req, res) => {
  const index = credentials.findIndex(c => c.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Credential not found' });
  }
  
  const deleted = credentials.splice(index, 1);
  
  res.json({
    data: deleted[0],
    message: 'Credential deleted successfully',
  });
});

// POST /api/credentials/:id/verify - Verificar se credencial é válida
router.post('/:id/verify', async (req, res) => {
  const credential = credentials.find(c => c.id === req.params.id);
  
  if (!credential) {
    return res.status(404).json({ error: 'Credential not found' });
  }
  
  try {
    let isValid = false;
    
    if (credential.platform === 'meta') {
      // Verificar com Meta Ads API
      const metaResponse = await fetch(
        `https://graph.facebook.com/me?access_token=${credential.accessToken}`
      );
      isValid = metaResponse.ok;
    } else if (credential.platform === 'google') {
      // Verificar com Google Ads API
      // TODO: Implementar verificação Google
      isValid = true;
    }
    
    res.json({
      isValid,
      platform: credential.platform,
      message: isValid ? 'Credential is valid' : 'Credential is invalid',
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify credential' });
  }
});

export default router;
