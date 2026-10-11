'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import {
  itemSchema,
  updateNamespaceSchema,
  getFirstZodErrorMessage,
} from '@/lib/validation';

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
 * Valida a autenticação do lojista via cookie e recupera os dados do namespace.
 * Função estritamente interna (não exportada) para não expor endpoint de Server Action.
 */
async function requireStore(slug: string): Promise<RequireStoreResult> {
  if (!slug || typeof slug !== 'string') {
    return { success: false, error: 'Loja não encontrada.' };
  }

  const cookieStore = await cookies();
  const code = cookieStore.get(`auth_${slug}`)?.value;
  if (!code) {
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

  const { data: validCode, error: codeError } = await supabaseAdmin
    .from('namespace_codes')
    .select('id')
    .eq('namespace_id', namespace.id)
    .eq('code', code)
    .single();

  if (codeError || !validCode) {
    return { success: false, error: 'Não autorizado.' };
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

  // 3. Salvar no cookie (dura a sessão/algumas horas)
  const cookieStore = await cookies();
  cookieStore.set(`auth_${slug}`, code, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7 // 1 semana
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

  const parsed = updateNamespaceSchema.safeParse({
    name: typeof rawName === 'string' ? rawName : undefined,
    subtitle: typeof rawSubtitle === 'string' ? rawSubtitle : undefined,
  });

  if (!parsed.success) {
    return { success: false, message: getFirstZodErrorMessage(parsed.error) };
  }

  const { error } = await supabaseAdmin
    .from('namespaces')
    .update({
      name: parsed.data.name,
      subtitle: parsed.data.subtitle ?? null,
    })
    .eq('id', store.id);

  if (error) {
    return { success: false, message: 'Erro ao atualizar a loja.' };
  }

  revalidatePath(`/${slug}`);
  return { success: true, message: 'Loja atualizada com sucesso!' };
}
