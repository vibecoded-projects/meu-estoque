'use server'

import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

// Tipagem base
export type ActionResponse = {
  success: boolean;
  message: string;
  data?: unknown;
};

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
  const cookieStore = await cookies();
  const code = cookieStore.get(`auth_${slug}`)?.value;
  if (!code) return false;

  const { data: namespace } = await supabaseAdmin
    .from('namespaces')
    .select('id')
    .eq('slug', slug)
    .single();

  if (!namespace) return false;

  const { data: validCode } = await supabaseAdmin
    .from('namespace_codes')
    .select('id')
    .eq('namespace_id', namespace.id)
    .eq('code', code)
    .single();

  return !!validCode;
}

// Deslogar
export async function logoutNamespace(slug: string) {
  const cookieStore = await cookies();
  cookieStore.delete(`auth_${slug}`);
  revalidatePath(`/${slug}`);
}

// Criar item
export async function createItem(slug: string, formData: FormData): Promise<ActionResponse> {
  const isAuth = await checkAuth(slug);
  if (!isAuth) return { success: false, message: 'Não autorizado.' };

  const { data: namespace } = await supabaseAdmin
    .from('namespaces')
    .select('id')
    .eq('slug', slug)
    .single();

  if (!namespace) return { success: false, message: 'Namespace inválido.' };

  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const price = parseFloat(formData.get('price') as string);
  const image_url = formData.get('image_url') as string;

  const { error } = await supabaseAdmin
    .from('items')
    .insert({
      namespace_id: namespace.id,
      title,
      description,
      price,
      image_url
    });

  if (error) {
    return { success: false, message: 'Erro ao criar item.' };
  }

  revalidatePath(`/${slug}`);
  return { success: true, message: 'Item criado!' };
}

// Atualizar item
export async function updateItem(slug: string, id: string, formData: FormData): Promise<ActionResponse> {
  const isAuth = await checkAuth(slug);
  if (!isAuth) return { success: false, message: 'Não autorizado.' };

  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const price = parseFloat(formData.get('price') as string);
  const image_url = formData.get('image_url') as string;

  const { error } = await supabaseAdmin
    .from('items')
    .update({
      title,
      description,
      price,
      image_url,
      updated_at: new Date().toISOString()
    })
    .eq('id', id);

  if (error) {
    return { success: false, message: 'Erro ao atualizar item.' };
  }

  revalidatePath(`/${slug}`);
  return { success: true, message: 'Item atualizado!' };
}

// Excluir item
export async function deleteItem(slug: string, id: string): Promise<ActionResponse> {
  const isAuth = await checkAuth(slug);
  if (!isAuth) return { success: false, message: 'Não autorizado.' };

  const { error } = await supabaseAdmin
    .from('items')
    .delete()
    .eq('id', id);

  if (error) {
    return { success: false, message: 'Erro ao excluir item.' };
  }

  revalidatePath(`/${slug}`);
  return { success: true, message: 'Item excluído!' };
}

// Alternar status de "vendido"
export async function toggleItemSold(slug: string, id: string, currentStatus: boolean): Promise<ActionResponse> {
  const isAuth = await checkAuth(slug);
  if (!isAuth) return { success: false, message: 'Não autorizado.' };

  const { error } = await supabaseAdmin
    .from('items')
    .update({
      is_sold: !currentStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', id);

  if (error) {
    return { success: false, message: 'Erro ao atualizar status.' };
  }

  revalidatePath(`/${slug}`);
  return { success: true, message: 'Status atualizado!' };
}
