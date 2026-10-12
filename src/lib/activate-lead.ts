/**
 * StokFácil — Ativação de Loja a partir de um Lead (T13)
 *
 * Módulo com a lógica de ativação de vitrines para uso operacional.
 * Transforma um lead registrado na tabela `leads` em uma vitrine ativa com trial
 * de 14 dias, gerando PIN e Magic Link para acesso do lojista.
 */

import { randomInt } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createMagicToken } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase';
import type { Lead } from '@/lib/types';

export interface CliArgs {
  slug: string;
  dryRun: boolean;
}

export interface ActivationParams {
  slug: string;
  dryRun?: boolean;
}

export interface ActivationResultSuccess {
  success: true;
  isDryRun: boolean;
  lead: Lead;
  slug: string;
  storeName: string;
  whatsapp: string;
  pin: string;
  magicToken: string;
  storeUrl: string;
  magicLink: string;
  whatsappMessage: string;
  namespaceId?: string;
  trialExpiresAt: Date;
}

export interface ActivationResultError {
  success: false;
  error: string;
  code: 'INVALID_SLUG' | 'LEAD_NOT_FOUND' | 'NAMESPACE_EXISTS' | 'DATABASE_ERROR';
}

export type ActivationResult = ActivationResultSuccess | ActivationResultError;

export interface ActivateLeadDeps {
  supabase?: SupabaseClient;
  siteUrl?: string;
  now?: Date;
  generatePinFn?: () => string;
  createMagicTokenFn?: (slug: string) => string;
}

/**
 * Lê argumentos passados via CLI.
 * Suporta argumentos posicionais (<slug>) ou flags (--slug <slug>, --slug=<slug>)
 * e a flag opcional --dry-run / -d.
 */
export function parseCliArgs(args: string[]): CliArgs {
  let slug = '';
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i].trim();
    if (arg === '--dry-run' || arg === '-d') {
      dryRun = true;
    } else if (arg === '--slug') {
      if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
        slug = args[i + 1].trim();
        i++;
      }
    } else if (arg.startsWith('--slug=')) {
      slug = arg.slice('--slug='.length).trim();
    } else if (!arg.startsWith('-') && !slug) {
      slug = arg;
    }
  }

  return { slug, dryRun };
}

/**
 * Gera um PIN numérico aleatório de 4 dígitos (entre 1000 e 9999 inclusive).
 */
export function generatePin(): string {
  return randomInt(1000, 10000).toString();
}

/**
 * Monta a URL pública da vitrine da loja.
 */
export function buildStoreUrl(slug: string, siteUrl?: string): string {
  const base = (siteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://stokfacil.com')
    .trim()
    .replace(/\/+$/, '');
  const cleanSlug = slug.trim().replace(/^\/+/, '');
  return `${base}/${cleanSlug}`;
}

/**
 * Monta a URL de entrada por Magic Link.
 */
export function buildMagicLink(storeUrl: string, magicToken: string): string {
  const cleanBase = storeUrl.trim().replace(/\/+$/, '');
  return `${cleanBase}/entrar?token=${magicToken}`;
}

/**
 * Monta a mensagem pronta para envio no WhatsApp do lojista.
 */
export function buildWhatsAppActivationMessage(params: {
  storeUrl: string;
  pin: string;
  magicLink: string;
}): string {
  return [
    '🎉 Sua vitrine StokFácil está pronta!',
    `👉 Link da sua vitrine: ${params.storeUrl}`,
    `🔐 Seu código PIN de acesso: ${params.pin}`,
    `⚡ Ou entre com 1 clique (Magic Link): ${params.magicLink}`,
  ].join('\n');
}

/**
 * Ativa uma loja a partir de um lead registrado.
 */
export async function activateLead(
  params: ActivationParams,
  deps?: ActivateLeadDeps
): Promise<ActivationResult> {
  const rawSlug = params?.slug;
  if (!rawSlug || typeof rawSlug !== 'string' || rawSlug.trim().length === 0) {
    return {
      success: false,
      code: 'INVALID_SLUG',
      error: 'Slug do lead não fornecido ou inválido.',
    };
  }

  const cleanSlug = rawSlug.trim().toLowerCase();
  const dryRun = Boolean(params.dryRun);

  // Cliente Supabase com permissões de administrador
  const client = deps?.supabase || supabaseAdmin;

  // 1. Consulta o lead na tabela `leads`
  const { data: lead, error: leadError } = await client
    .from('leads')
    .select('*')
    .eq('requested_slug', cleanSlug)
    .maybeSingle();

  if (leadError) {
    return {
      success: false,
      code: 'DATABASE_ERROR',
      error: `Erro ao buscar lead no banco de dados: ${leadError.message}`,
    };
  }

  if (!lead) {
    return {
      success: false,
      code: 'LEAD_NOT_FOUND',
      error: `Lead com o slug "${cleanSlug}" não foi encontrado na tabela "leads".`,
    };
  }

  // 2. Verifica se o slug já existe em `namespaces`
  const { data: existingNamespace, error: nsCheckError } = await client
    .from('namespaces')
    .select('id, slug, name')
    .eq('slug', cleanSlug)
    .maybeSingle();

  if (nsCheckError) {
    return {
      success: false,
      code: 'DATABASE_ERROR',
      error: `Erro ao verificar existência da loja: ${nsCheckError.message}`,
    };
  }

  if (existingNamespace) {
    return {
      success: false,
      code: 'NAMESPACE_EXISTS',
      error: `Já existe uma loja cadastrada com o slug "${cleanSlug}" (ID: ${existingNamespace.id}). Operação abortada para evitar sobreescrita.`,
    };
  }

  // 3. Gera PIN e Magic Token
  const pinGenerator = deps?.generatePinFn || generatePin;
  const pin = pinGenerator();

  const magicTokenGenerator = deps?.createMagicTokenFn || createMagicToken;
  const magicToken = magicTokenGenerator(cleanSlug);

  // 4. Monta URLs e mensagem do WhatsApp
  const siteUrl = deps?.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://stokfacil.com';
  const storeUrl = buildStoreUrl(cleanSlug, siteUrl);
  const magicLink = buildMagicLink(storeUrl, magicToken);
  const whatsappMessage = buildWhatsAppActivationMessage({
    storeUrl,
    pin,
    magicLink,
  });

  const now = deps?.now || new Date();
  const trialExpiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  // 5. Se for Dry-Run, não persiste no banco
  if (dryRun) {
    return {
      success: true,
      isDryRun: true,
      lead: lead as Lead,
      slug: cleanSlug,
      storeName: lead.store_name,
      whatsapp: lead.whatsapp,
      pin,
      magicToken,
      storeUrl,
      magicLink,
      whatsappMessage,
      trialExpiresAt,
    };
  }

  // 6. Gravação no banco de dados
  // Inserção na tabela `namespaces`
  const { data: newNamespace, error: nsInsertError } = await client
    .from('namespaces')
    .insert({
      name: lead.store_name,
      slug: cleanSlug,
      whatsapp: lead.whatsapp,
      status: 'active',
      plan: 'trial',
      trial_starts_at: now.toISOString(),
      trial_expires_at: trialExpiresAt.toISOString(),
    })
    .select('id')
    .single();

  if (nsInsertError || !newNamespace) {
    return {
      success: false,
      code: 'DATABASE_ERROR',
      error: `Erro ao criar namespace da loja: ${nsInsertError?.message || 'Falha ao obter ID criado'}`,
    };
  }

  // Inserção na tabela `namespace_codes`
  const { error: codeInsertError } = await client
    .from('namespace_codes')
    .insert({
      namespace_id: newNamespace.id,
      code: pin,
    });

  if (codeInsertError) {
    return {
      success: false,
      code: 'DATABASE_ERROR',
      error: `Erro ao salvar código PIN da loja: ${codeInsertError.message}`,
    };
  }

  // Atualização do status do lead para 'converted'
  const { error: leadUpdateError } = await client
    .from('leads')
    .update({ status: 'converted' })
    .eq('id', lead.id);

  if (leadUpdateError) {
    return {
      success: false,
      code: 'DATABASE_ERROR',
      error: `Erro ao atualizar status do lead: ${leadUpdateError.message}`,
    };
  }

  return {
    success: true,
    isDryRun: false,
    lead: lead as Lead,
    slug: cleanSlug,
    storeName: lead.store_name,
    whatsapp: lead.whatsapp,
    pin,
    magicToken,
    storeUrl,
    magicLink,
    whatsappMessage,
    namespaceId: newNamespace.id,
    trialExpiresAt,
  };
}
