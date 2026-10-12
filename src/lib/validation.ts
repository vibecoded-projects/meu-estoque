import { z } from 'zod';
import { normalizeBrazilianPhone } from '@/lib/phone';

/**
 * Normaliza e converte uma entrada de preço (número ou string com ponto/vírgula) para number.
 * Retorna NaN caso não seja um número válido.
 */
export function parsePrice(value: unknown): number {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return NaN;
    }
    const normalized = trimmed.replace(',', '.');
    return Number(normalized);
  }
  return NaN;
}

/**
 * Schema de validação para itens de catálogo (criação e atualização).
 */
export const itemSchema = z.object({
  title: z
    .string({ message: 'Título é obrigatório.' })
    .trim()
    .min(1, 'Título é obrigatório.')
    .max(120, 'Título deve ter no máximo 120 caracteres.'),
  price: z.preprocess(
    parsePrice,
    z
      .number({ message: 'Preço deve ser um número válido.' })
      .finite('Preço deve ser um número finito.')
      .min(0, 'Preço deve ser maior ou igual a zero.')
  ),
  description: z
    .string()
    .max(2000, 'Descrição deve ter no máximo 2000 caracteres.')
    .optional()
    .nullable(),
  image_url: z
    .string()
    .max(10000, 'URL da imagem excede o tamanho máximo permitido.')
    .optional()
    .nullable(),
});

/**
 * Schema de validação para dados da loja / namespace.
 */
export const updateNamespaceSchema = z.object({
  name: z
    .string({ message: 'Nome da loja é obrigatório.' })
    .trim()
    .min(1, 'Nome da loja é obrigatório.')
    .max(100, 'Nome da loja deve ter no máximo 100 caracteres.'),
  subtitle: z
    .string()
    .max(255, 'Subtítulo deve ter no máximo 255 caracteres.')
    .optional()
    .nullable(),
  whatsapp: z.preprocess(
    (val) => {
      if (val === undefined) return undefined;
      if (val === null) return null;
      if (typeof val === 'string') {
        const trimmed = val.trim();
        return trimmed === '' ? null : trimmed;
      }
      return val;
    },
    z
      .string({ message: 'WhatsApp deve ser uma string.' })
      .refine((val) => normalizeBrazilianPhone(val) !== null, {
        message: 'Número de WhatsApp inválido.',
      })
      .transform((val) => normalizeBrazilianPhone(val)!)
      .nullable()
      .optional()
  ),
  instagram_handle: z.preprocess(
    (val) => {
      if (val === undefined) return undefined;
      if (val === null) return null;
      if (typeof val === 'string') {
        const trimmed = val.trim();
        return trimmed === '' ? null : trimmed;
      }
      return val;
    },
    z
      .string({ message: 'Instagram deve ser uma string.' })
      .refine((val) => !val.includes('@'), {
        message: 'Nome de usuário do Instagram não deve conter "@".',
      })
      .max(30, 'Instagram deve ter no máximo 30 caracteres.')
      .nullable()
      .optional()
  ),
});

export type ItemInput = z.infer<typeof itemSchema>;
export type UpdateNamespaceInput = z.infer<typeof updateNamespaceSchema>;

/**
 * Extrai a mensagem da primeira issue de validação do Zod em PT-BR.
 */
export function getFirstZodErrorMessage(error: z.ZodError): string {
  return error.issues[0]?.message || 'Dados inválidos.';
}
