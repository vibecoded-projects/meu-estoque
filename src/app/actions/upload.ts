'use server';

import crypto from 'node:crypto';
import type { ActionResponse } from '@/app/actions';
import { requireStore } from '@/lib/storeAuth';
import { supabaseAdmin } from '@/lib/supabase';

export interface UploadUrlData {
  signedUrl: string;
  token: string;
  path: string;
  publicUrl: string;
}

const ALLOWED_UPLOAD_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'] as const;
type AllowedUploadExtension = (typeof ALLOWED_UPLOAD_EXTENSIONS)[number];

const BUCKET_NAME = 'product-images';

/**
 * Server Action para gerar URL de upload assinada e autorizada no Supabase Storage (RNF06 / D7).
 *
 * Garante que:
 * 1. O lojista esteja autenticado com sessão válida (D1).
 * 2. O arquivo possua uma extensão permitida e segura (jpg, jpeg, png, webp).
 * 3. O arquivo seja armazenado sob o namespace da loja (`product-images/${store.id}/${uuid}.${ext}`),
 *    eliminando qualquer risco de IDOR e sobrescrita de imagens entre lojistas.
 * 4. A anon key não consiga fazer upload direto sem a URL assinada pelo servidor.
 */
export async function createUploadUrl(
  slug: string,
  extension: string
): Promise<ActionResponse<UploadUrlData>> {
  // 1. Validar autenticação do lojista
  const authResult = await requireStore(slug);
  if (!authResult.success) {
    return {
      success: false,
      message: authResult.error,
    };
  }

  const { store } = authResult;

  // 2. Validar extensão permitida
  if (!extension || typeof extension !== 'string') {
    return {
      success: false,
      message: 'Extensão de imagem inválida. Formatos permitidos: jpg, jpeg, png ou webp.',
    };
  }

  const cleanExt = extension.toLowerCase().replace(/^\./, '').trim();
  const isAllowed = ALLOWED_UPLOAD_EXTENSIONS.includes(cleanExt as AllowedUploadExtension);

  if (!isAllowed) {
    return {
      success: false,
      message: 'Extensão de imagem inválida. Formatos permitidos: jpg, jpeg, png ou webp.',
    };
  }

  // 3. Gerar UUID e compor caminho seguro prefixado pelo namespace_id da loja
  const fileUuid = crypto.randomUUID();
  const path = `${store.id}/${fileUuid}.${cleanExt}`;

  // 4. Solicitar a URL assinada via supabaseAdmin com service_role
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET_NAME)
    .createSignedUploadUrl(path);

  if (error || !data) {
    return {
      success: false,
      message: error?.message || 'Erro ao gerar URL de upload assinado no servidor.',
    };
  }

  // 5. Montar a URL pública definitiva do arquivo
  const { data: publicData } = supabaseAdmin.storage
    .from(BUCKET_NAME)
    .getPublicUrl(path);

  return {
    success: true,
    message: 'URL de upload gerada com sucesso.',
    data: {
      signedUrl: data.signedUrl,
      token: data.token,
      path,
      publicUrl: publicData.publicUrl,
    },
  };
}
