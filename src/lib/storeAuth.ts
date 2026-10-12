import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/session';

export type RequireStoreResult =
  | { success: true; store: { id: string; slug: string } }
  | { success: false; error: string };

/**
 * Valida a autenticação do lojista via cookie assinado e recupera os dados do namespace.
 * Módulo compartilhado seguro (sem 'use server') para evitar exposição acidental de endpoint RPC público.
 *
 * NOTA DE SEGURANÇA E CICLO DE VIDA (D1):
 * A validação é criptográfica via HMAC-SHA256 do token gravado no cookie auth_<slug>.
 * Caso o PIN da loja seja alterado após o lojista já estar logado, sessões emitidas
 * continuam válidas até sua expiração natural (7 dias) ou logout explícito.
 * Cookies legados que continham o PIN em texto puro falham na verificação da assinatura
 * e exigem novo login.
 */
export async function requireStore(slug: string): Promise<RequireStoreResult> {
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
