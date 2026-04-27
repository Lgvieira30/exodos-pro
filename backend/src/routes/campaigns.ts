import express, { Router } from 'express';

const router = Router();

// Mock data (substitua por banco de dados real)
let campaigns: any[] = [
  {
    id: '1',
    userId: 'user1',
    credentialId: '1',
    externalId: 'meta_123',
    platform: 'meta',
    name: 'Clínica - Lipoaspiração',
    objective: 'leads',
    status: 'active',
    budget: 100,
    spend: 2000,
    leads: 50,
    conversions: 10,
    cpa: 45,
    ctr: 2.1,
    roas: 3.2,
    roi: 220,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// GET /api/campaigns
router.get('/', (req, res) => {
  const { credentialId, platform } = req.query;
  
  let filtered = campaigns;
  
  if (credentialId) {
    filtered = filtered.filter(c => c.credentialId === credentialId);
  }
  
  if (platform) {
    filtered = filtered.filter(c => c.platform === platform);
  }
  
  res.json({
    data: filtered,
    total: filtered.length,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/campaigns/:id
router.get('/:id', (req, res) => {
  const campaign = campaigns.find(c => c.id === req.params.id);
  
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }
  
  res.json(campaign);
});

// POST /api/campaigns
router.post('/', (req, res) => {
  const { name, objective, platform, credentialId, budget } = req.body;
  
  if (!name || !objective || !platform || !credentialId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const newCampaign = {
    id: Date.now().toString(),
    userId: 'user1',
    credentialId,
    externalId: `${platform}_${Date.now()}`,
    platform,
    name,
    objective,
    status: 'active',
    budget,
    spend: 0,
    leads: 0,
    conversions: 0,
    cpa: 0,
    ctr: 0,
    roas: 0,
    roi: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  campaigns.push(newCampaign);
  
  res.status(201).json({
    data: newCampaign,
    message: 'Campaign created successfully',
  });
});

// PUT /api/campaigns/:id
router.put('/:id', (req, res) => {
  const index = campaigns.findIndex(c => c.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Campaign not found' });
  }
  
  campaigns[index] = {
    ...campaigns[index],
    ...req.body,
    updatedAt: new Date(),
  };
  
  res.json({
    data: campaigns[index],
    message: 'Campaign updated successfully',
  });
});

// DELETE /api/campaigns/:id
router.delete('/:id', (req, res) => {
  const index = campaigns.findIndex(c => c.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Campaign not found' });
  }
  
  const deleted = campaigns.splice(index, 1);
  
  res.json({
    data: deleted[0],
    message: 'Campaign deleted successfully',
  });
});

export default router;
