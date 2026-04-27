// Credential Model
export interface Credential {
  id: string;
  userId: string;
  platform: 'meta' | 'google' | 'linkedin';
  name: string;
  appId: string;
  appSecret: string;
  accessToken?: string;
  clientId?: string;
  clientSecret?: string;
  isConnected: boolean;
  lastSync?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Campaign Model
export interface Campaign {
  id: string;
  userId: string;
  credentialId: string;
  externalId: string; // ID da plataforma (Meta, Google, etc)
  platform: 'meta' | 'google' | 'linkedin';
  name: string;
  objective: string;
  status: 'active' | 'paused' | 'ended';
  budget: number;
  spend: number;
  leads: number;
  conversions: number;
  cpa: number;
  ctr: number;
  roas: number;
  roi: number;
  createdAt: Date;
  updatedAt: Date;
  lastSyncAt?: Date;
}

// Campaign Performance (Daily Data)
export interface CampaignPerformance {
  id: string;
  campaignId: string;
  date: Date;
  spend: number;
  leads: number;
  conversions: number;
  impressions: number;
  clicks: number;
  cpc: number;
  ctr: number;
  cpa: number;
  roas: number;
}

// User Model
export interface User {
  id: string;
  email: string;
  name: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

// Sync Log
export interface SyncLog {
  id: string;
  userId: string;
  credentialId: string;
  platform: string;
  status: 'success' | 'failed' | 'pending';
  campaignsSync: number;
  performanceRecords: number;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}
