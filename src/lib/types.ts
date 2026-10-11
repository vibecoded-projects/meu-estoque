/**
 * StokFácil — Tipos de Domínio Compartilhados
 * Reflete o schema do banco de dados (PostgreSQL / Supabase) pós-migração 001.
 */

export type Plan = 'trial' | 'monthly' | 'quarterly' | 'semiannual' | 'annual';

export type NamespaceStatus = 'active' | 'trial_grace_period' | 'paused' | 'blocked';

export type LeadStatus = 'trial_pending' | 'active' | 'rejected' | 'converted';

export interface Namespace {
  id: string;
  slug: string;
  name: string | null;
  subtitle?: string | null;
  created_at?: string;
  whatsapp?: string | null;
  status?: NamespaceStatus;
  plan?: Plan;
  trial_starts_at?: string | null;
  trial_expires_at?: string | null;
  trial_extended?: boolean;
  activation_completed?: boolean;
  is_whitelabel?: boolean;
  instagram_handle?: string | null;
  logo_url?: string | null;
  plan_expires_at?: string | null;
  first_shared_at?: string | null;
}

export interface Item {
  id: string;
  namespace_id?: string;
  title: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_sold: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Lead {
  id: string;
  contact_name: string;
  store_name: string;
  requested_slug: string;
  whatsapp: string;
  current_inventory_method: string | null;
  status: LeadStatus;
  created_at: string;
  notes: string | null;
}

export interface NamespaceCode {
  id: string;
  namespace_id: string;
  code: string;
  created_at?: string;
}
