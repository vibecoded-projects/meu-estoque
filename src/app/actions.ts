'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import {
  itemSchema,
  updateNamespaceSchema,
  getFirstZodErrorMessage,
} from '@/lib/validation';
import {
  signToken,
  verifyToken,
  SESSION_DURATION_SECONDS,
} from '@/lib/session';
import { evaluateProgressiveTrial } from '@/lib/activation';

// Tipagem base
export type ActionResponse = {
  success: boolean;
  message: string;
  data?: unknown;
};

type RequireStoreResult =
  | { success: true; store: { id: string; slug: string } }
  | { success: false; error: string };

/**
 * Valida a autenticação do lojista via cookie assinado e recupera os dados do namespace.
 * Função estritamente interna (não exportada) para não expor endpoint de Server Action.
 *
 * NOTA DE SEGURANÇA E CICLO DE VIDA (D1):
 * A validação é criptográfica via HMAC-SHA256 do token gravado no cookie auth_<slug>.
 * Caso o PIN da loja seja alterado após o lojista já estar logado, sessões emitidas
 * continuam válidas até sua expiração natural (7 dias) ou logout explícito.
 * Cookies legados que continham o PIN em texto puro falham na verificação da assinatura
 * e exigem novo login.
 */
async function requireStore(slug: string): Promise<RequireStoreResult> {
  if (!slug || typeof slug !== 'string') {
    return { success: false, error: 'Loja não encontrada.' };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(`auth_${slug}`)?.value;
  if (!token) {
    return { success: false, error: 'Não autorizado.' };
  }

  const isTokenValid = verifyToken(token, { slug, purpose: 'session' });
  if (!isTokenValid) {
    return { success: false, error: 'Não autorizado.' };
  }

  const { data: namespace, error: nsError } = await supabaseAdmin
    .from('namespaces')
    .select('id, slug')
    .eq('slug', slug)
    .single();

  if (nsError || !namespace) {
    return { success: false, error: 'Loja não encontrada.' };
  }

  return {
    success: true,
    store: {
      id: namespace.id,
      slug: namespace.slug,
    },
  };
}

// Verifica se o código de 4 dígitos é válido para aquele namespace
export async function authenticateNamespace(slug: string, code: string): Promise<ActionResponse> {
  // 1. Achar o ID do namespace baseado no slug
  const { data: namespace, error: nsError } = await supabaseAdmin
    .from('namespaces')
    .select('id')
    .eq('slug', slug)
    .single();

  if (nsError || !namespace) {
    return { success: false, message: 'Namespace não encontrado.' };
  }

  // 2. Verificar o código
  const { data: validCode, error: codeError } = await supabaseAdmin
    .from('namespace_codes')
    .select('id')
    .eq('namespace_id', namespace.id)
    .eq('code', code)
    .single();

  if (codeError || !validCode) {
    return { success: false, message: 'Código inválido.' };
  }

  // 3. Gerar token assinado de sessão (7 dias de validade)
  const now = Math.floor(Date.now() / 1000);
  const token = signToken({
    slug,
    purpose: 'session',
    exp: now + SESSION_DURATION_SECONDS,
  });

  // 4. Salvar no cookie (dura a sessão/7 dias)
  const cookieStore = await cookies();
  cookieStore.set(`auth_${slug}`, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION_SECONDS,
  });

  return { success: true, message: 'Autenticado com sucesso!' };
}

// Verifica se está autenticado
export async function checkAuth(slug: string): Promise<boolean> {
  const result = await requireStore(slug);
  return result.success;
}

// Deslogar
export async function logoutNamespace(slug: string) {
  const cookieStore = await cookies();
  cookieStore.delete(`auth_${slug}`);
  revalidatePath(`/${slug}`);
}

// Criar item
export async function createItem(slug: string, formData: FormData): Promise<ActionResponse> {
  const authResult = await requireStore(slug);
  if (!authResult.success) {
    return { success: false, message: authResult.error };
  }
  const { store } = authResult;

  const rawTitle = formData.get('title');
  const rawDescription = formData.get('description');
  const rawPrice = formData.get('price');
  const rawImageUrl = formData.get('image_url');

  const parsed = itemSchema.safeParse({
    title: typeof rawTitle === 'string' ? rawTitle : undefined,
    description: typeof rawDescription === 'string' ? rawDescription : undefined,
    price: rawPrice,
    image_url: typeof rawImageUrl === 'string' ? rawImageUrl : undefined,
  });

  if (!parsed.success) {
    return { success: false, message: getFirstZodErrorMessage(parsed.error) };
  }

  const { error } = await supabaseAdmin
    .from('items')
    .insert({
      namespace_id: store.id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      price: parsed.data.price,
      image_url: parsed.data.image_url ?? null,
    });

  if (error) {
    return { success: false, message: 'Erro ao criar item.' };
  }

  // Ativação progressiva (T15 / RF13 / D3):
  // Se a loja já compartilhou a vitrine e ainda não estendeu o trial,
  // conta os itens; se atingiu 5 itens, estende o trial para 30 dias.
  const { data: namespace } = await supabaseAdmin
    .from('namespaces')
    .select('id, slug, first_shared_at, trial_starts_at, trial_extended, created_at')
    .eq('id', store.id)
    .single();

  if (namespace && namespace.first_shared_at && !namespace.trial_extended) {
    const { count } = await supabaseAdmin
      .from('items')
      .select('id', { count: 'exact', head: true })
      .eq('namespace_id', store.id);

    const itemsCount = count ?? 0;
    const trialStartsAt =
      namespace.trial_starts_at || namespace.created_at || new Date().toISOString();

    const evaluation = evaluateProgressiveTrial({
      itemsCount,
      firstSharedAt: namespace.first_shared_at,
      trialStartsAt,
      trialExtended: Boolean(namespace.trial_extended),
    });

    if (evaluation.isEligible && evaluation.newTrialExpiresAt) {
      await supabaseAdmin
        .from('namespaces')
        .update({
          trial_expires_at: evaluation.newTrialExpiresAt.toISOString(),
          trial_extended: true,
          activation_completed: true,
        })
        .eq('id', store.id);
    }
  }

  revalidatePath(`/${slug}`);
  return { success: true, message: 'Item criado!' };
}

// Atualizar item
export async function updateItem(slug: string, id: string, formData: FormData): Promise<ActionResponse> {
  const authResult = await requireStore(slug);
  if (!authResult.success) {
    return { success: false, message: authResult.error };
  }
  const { store } = authResult;

  if (!id || typeof id !== 'string') {
    return { success: false, message: 'ID do item inválido.' };
  }

  const rawTitle = formData.get('title');
  const rawDescription = formData.get('description');
  const rawPrice = formData.get('price');
  const rawImageUrl = formData.get('image_url');

  const parsed = itemSchema.safeParse({
    title: typeof rawTitle === 'string' ? rawTitle : undefined,
    description: typeof rawDescription === 'string' ? rawDescription : undefined,
    price: rawPrice,
    image_url: typeof rawImageUrl === 'string' ? rawImageUrl : undefined,
  });

  if (!parsed.success) {
    return { success: false, message: getFirstZodErrorMessage(parsed.error) };
  }

  const { error } = await supabaseAdmin
    .from('items')
    .update({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      price: parsed.data.price,
      image_url: parsed.data.image_url ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('namespace_id', store.id);

  if (error) {
    return { success: false, message: 'Erro ao atualizar item.' };
  }

  revalidatePath(`/${slug}`);
  return { success: true, message: 'Item atualizado!' };
}

// Excluir item
export async function deleteItem(slug: string, id: string): Promise<ActionResponse> {
  const authResult = await requireStore(slug);
  if (!authResult.success) {
    return { success: false, message: authResult.error };
  }
  const { store } = authResult;

  if (!id || typeof id !== 'string') {
    return { success: false, message: 'ID do item inválido.' };
  }

  const { error } = await supabaseAdmin
    .from('items')
    .delete()
    .eq('id', id)
    .eq('namespace_id', store.id);

  if (error) {
    return { success: false, message: 'Erro ao excluir item.' };
  }

  revalidatePath(`/${slug}`);
  return { success: true, message: 'Item excluído!' };
}

// Alternar status de "vendido"
export async function toggleItemSold(slug: string, id: string, currentStatus: boolean): Promise<ActionResponse> {
  const authResult = await requireStore(slug);
  if (!authResult.success) {
    return { success: false, message: authResult.error };
  }
  const { store } = authResult;

  if (!id || typeof id !== 'string') {
    return { success: false, message: 'ID do item inválido.' };
  }

  const { error } = await supabaseAdmin
    .from('items')
    .update({
      is_sold: !currentStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('namespace_id', store.id);

  if (error) {
    return { success: false, message: 'Erro ao atualizar status.' };
  }

  revalidatePath(`/${slug}`);
  return { success: true, message: 'Status atualizado!' };
}

// Atualizar informações da loja (namespace)
export async function updateNamespace(slug: string, formData: FormData): Promise<ActionResponse> {
  const authResult = await requireStore(slug);
  if (!authResult.success) {
    return { success: false, message: authResult.error };
  }
  const { store } = authResult;

  const rawName = formData.get('name');
  const rawSubtitle = formData.get('subtitle');
  const rawWhatsapp = formData.get('whatsapp');
  const rawInstagramHandle = formData.get('instagram_handle');

  const parsed = updateNamespaceSchema.safeParse({
    name: typeof rawName === 'string' ? rawName : undefined,
    subtitle: typeof rawSubtitle === 'string' ? rawSubtitle : undefined,
    whatsapp: formData.has('whatsapp')
      ? (typeof rawWhatsapp === 'string' ? rawWhatsapp : '')
      : undefined,
    instagram_handle: formData.has('instagram_handle')
      ? (typeof rawInstagramHandle === 'string' ? rawInstagramHandle : '')
      : undefined,
  });

  if (!parsed.success) {
    return { success: false, message: getFirstZodErrorMessage(parsed.error) };
  }

  const updatePayload: {
    name: string;
    subtitle: string | null;
    whatsapp?: string | null;
    instagram_handle?: string | null;
  } = {
    name: parsed.data.name,
    subtitle: parsed.data.subtitle ?? null,
  };

  if (parsed.data.whatsapp !== undefined) {
    updatePayload.whatsapp = parsed.data.whatsapp;
  }
  if (parsed.data.instagram_handle !== undefined) {
    updatePayload.instagram_handle = parsed.data.instagram_handle;
  }

  const { error } = await supabaseAdmin
    .from('namespaces')
    .update(updatePayload)
    .eq('id', store.id);

  if (error) {
    return { success: false, message: 'Erro ao atualizar a loja.' };
  }

  revalidatePath(`/${slug}`);
  return { success: true, message: 'Loja atualizada com sucesso!' };
}

// Marcar compartilhamento e avaliar ativação progressiva 14+16 dias (T15 / RF13 / D3)
export async function markShared(slug: string): Promise<ActionResponse> {
  const authResult = await requireStore(slug);
  if (!authResult.success) {
    return { success: false, message: authResult.error };
  }
  const { store } = authResult;

  // 1. Buscar dados da loja para validação e datas de trial
  const { data: namespace, error: nsError } = await supabaseAdmin
    .from('namespaces')
    .select('id, slug, first_shared_at, trial_starts_at, trial_extended, created_at')
    .eq('id', store.id)
    .single();

  if (nsError || !namespace) {
    return { success: false, message: 'Loja não encontrada.' };
  }

  let firstSharedAt = namespace.first_shared_at;

  // 2. Se first_shared_at for nulo, registra a data atual (D3: registrado uma única vez)
  if (!firstSharedAt) {
    const nowIso = new Date().toISOString();
    firstSharedAt = nowIso;
    const { error: updateShareError } = await supabaseAdmin
      .from('namespaces')
      .update({ first_shared_at: nowIso })
      .eq('id', store.id);

    if (updateShareError) {
      return { success: false, message: 'Erro ao registrar compartilhamento.' };
    }
  }

  // 3. Contar itens cadastrados da loja
  const { count, error: countError } = await supabaseAdmin
    .from('items')
    .select('id', { count: 'exact', head: true })
    .eq('namespace_id', store.id);

  if (countError) {
    return { success: false, message: 'Erro ao verificar itens da loja.' };
  }

  const itemsCount = count ?? 0;
  const trialStartsAt =
    namespace.trial_starts_at || namespace.created_at || new Date().toISOString();

  // 4. Avaliar elegibilidade do trial progressivo
  const evaluation = evaluateProgressiveTrial({
    itemsCount,
    firstSharedAt,
    trialStartsAt,
    trialExtended: Boolean(namespace.trial_extended),
  });

  let extended = false;

  if (evaluation.isEligible && evaluation.newTrialExpiresAt) {
    const { error: extendError } = await supabaseAdmin
      .from('namespaces')
      .update({
        trial_expires_at: evaluation.newTrialExpiresAt.toISOString(),
        trial_extended: true,
        activation_completed: true,
      })
      .eq('id', store.id);

    if (extendError) {
      return { success: false, message: 'Erro ao estender período de teste.' };
    }

    extended = true;
  }

  revalidatePath(`/${slug}`);

  return {
    success: true,
    message: extended
      ? 'Compartilhamento registrado! Seu período de teste foi estendido para 30 dias.'
      : 'Compartilhamento registrado com sucesso!',
    data: { extended },
  };
}

