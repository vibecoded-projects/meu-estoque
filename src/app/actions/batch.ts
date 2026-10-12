'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { evaluateProgressiveTrial } from '@/lib/activation';
import { requireStore } from '@/lib/storeAuth';

export type ActionResponse<T = unknown> = {
  success: boolean;
  message: string;
  data?: T;
};

const batchItemInputSchema = z.object({
  title: z
    .string({ message: 'Título é obrigatório.' })
    .trim()
    .min(1, 'Título é obrigatório.')
    .max(100, 'Título deve ter no máximo 100 caracteres.'),
  price: z
    .number({ message: 'Preço deve ser um número válido.' })
    .finite('Preço deve ser um número finito.')
    .min(0, 'Preço deve ser maior ou igual a zero.'),
  description: z
    .string({ message: 'Descrição deve ser texto.' })
    .max(500, 'Descrição deve ter no máximo 500 caracteres.')
    .nullish(),
});

const batchItemsInputSchema = z
  .array(batchItemInputSchema, { message: 'Lista de produtos inválida.' })
  .min(1, 'Envie pelo menos 1 produto para importação.')
  .max(100, 'Limite de no máximo 100 produtos por importação.');

export type BatchItemInput = z.infer<typeof batchItemInputSchema>;

/**
 * Importa múltiplos itens para o catálogo da loja em uma única chamada de banco.
 * Requisitos: RF06, blueprint 3.3.
 */
export async function createItemsBatch(
  slug: string,
  rawItems: Array<{ title: string; price: number; description?: string | null }>
): Promise<ActionResponse<{ count: number }>> {
  // 1. Validação de autenticação
  const authResult = await requireStore(slug);
  if (!authResult.success) {
    return { success: false, message: authResult.error };
  }
  const { store } = authResult;

  // 2. Validação dos dados do lote com Zod
  const validationResult = batchItemsInputSchema.safeParse(rawItems);
  if (!validationResult.success) {
    const firstError = validationResult.error.issues[0]?.message || 'Dados do lote inválidos.';
    return { success: false, message: firstError };
  }

  const validItems = validationResult.data;

  // 3. Montagem dos registros associando tenant e status inicial
  const itemsToInsert = validItems.map((item) => ({
    namespace_id: store.id,
    title: item.title,
    price: item.price,
    description: item.description && item.description.trim() ? item.description.trim() : null,
    is_sold: false,
  }));

  // 4. Inserção em lote em chamada única
  const { error } = await supabaseAdmin
    .from('items')
    .insert(itemsToInsert);

  if (error) {
    console.error('[createItemsBatch] Erro ao inserir itens em lote:', error);
    return { success: false, message: 'Erro ao importar produtos. Tente novamente.' };
  }

  // 5. Revalida o caminho da vitrine
  revalidatePath(`/${slug}`);

  // 6. Ativação progressiva (T15 / RF13 / D3):
  // Se a vitrine já foi compartilhada e ainda não teve o trial estendido,
  // recalcula a contagem de itens para ativar bônus de 30 dias se atingir >= 5 itens.
  try {
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
            trial_expires_at: evaluation.newTrialExpiresAt,
            trial_extended: true,
            activation_completed: true,
          })
          .eq('id', store.id);
      }
    }
  } catch (err) {
    console.error('[createItemsBatch] Erro na avaliação de ativação progressiva:', err);
  }

  return {
    success: true,
    message: `${itemsToInsert.length} produto(s) importado(s) com sucesso!`,
    data: { count: itemsToInsert.length },
  };
}
