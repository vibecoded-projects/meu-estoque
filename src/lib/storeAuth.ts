import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/session';
import { getStoreLifecycle, type StoreLifecycle } from '@/lib/lifecycle';

export interface RequireStoreOptions {
  requireEditPermission?: boolean;
}

export type RequireStoreResult =
  | {
      success: true;
      store: { id: string; slug: string };
      canEdit?: boolean;
      lifecycle?: StoreLifecycle;
    }
  | {
      success: false;
      error: string;
      canEdit?: boolean;
      lifecycle?: StoreLifecycle;
    };

/**
 * Valida a autenticação do lojista via cookie assinado e recupera os dados do namespace.
 * Opcionalmente valida permissão de escrita no ciclo de vida da loja (T22 / RF15).
 * Módulo compartilhado seguro (sem 'use server') para evitar exposição acidental de endpoint RPC público.
 *
 * NOTA DE SEGURANÇA E CICLO DE VIDA (D1 / D4 / RF15):
 * A validação é criptográfica via HMAC-SHA256 do token gravado no cookie auth_<slug>.
 * Caso o PIN da loja seja alterado após o lojista já estar logado, sessões emitidas
 * continuam válidas até sua expiração natural (7 dias) ou logout explícito.
 * Quando requireEditPermission for true, calcula o ciclo de vida via getStoreLifecycle:
 * lojas em 'grace', 'paused' ou 'blocked' têm a escrita rejeitada com canEdit: false.
 */
export async function requireStore(
  slug: string,
  options?: RequireStoreOptions
): Promise<RequireStoreResult> {
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
    .select('id, slug, status, plan, trial_expires_at, plan_expires_at')
    .eq('slug', slug)
    .single();

  if (nsError || !namespace) {
    return { success: false, error: 'Loja não encontrada.' };
  }

  if (options?.requireEditPermission) {
    const lifecycle = getStoreLifecycle(namespace);
    if (!lifecycle.canEdit) {
      return {
        success: false,
        error:
          'A edição está bloqueada porque o período da sua loja encerrou. Renove sua assinatura para continuar editando.',
        canEdit: false,
        lifecycle,
      };
    }
    return {
      success: true,
      store: {
        id: namespace.id,
        slug: namespace.slug,
      },
      canEdit: true,
      lifecycle,
    };
  }

  return {
    success: true,
    store: {
      id: namespace.id,
      slug: namespace.slug,
    },
  };
}
