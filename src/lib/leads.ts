import { z } from 'zod';
import { normalizeBrazilianPhone } from '@/lib/phone';
import { sanitizeSlug, isValidSlug } from '@/lib/slug';

export const INVENTORY_METHODS = [
  'WhatsApp/Áudios',
  'Planilha',
  'Bloco de Notas',
  'Fotos no Celular',
  'Vou cadastrar do zero',
] as const;

export type InventoryMethod = (typeof INVENTORY_METHODS)[number];

export const leadSchema = z.object({
  contact_name: z
    .string({ message: 'Nome do responsável é obrigatório.' })
    .trim()
    .min(2, 'Nome deve ter pelo menos 2 caracteres.')
    .max(100, 'Nome deve ter no máximo 100 caracteres.'),
  store_name: z
    .string({ message: 'Nome da loja é obrigatório.' })
    .trim()
    .min(2, 'Nome da loja deve ter pelo menos 2 caracteres.')
    .max(100, 'Nome da loja deve ter no máximo 100 caracteres.'),
  slug: z
    .string({ message: 'Link pretendido é obrigatório.' })
    .trim()
    .transform((val) => sanitizeSlug(val))
    .refine((val) => isValidSlug(val), {
      message:
        'Link inválido. Use entre 3 e 40 letras, números e hífens (nomes reservados não são permitidos).',
    }),
  whatsapp: z
    .string({ message: 'Número de WhatsApp é obrigatório.' })
    .trim()
    .refine((val) => normalizeBrazilianPhone(val) !== null, {
      message: 'Informe um número de WhatsApp brasileiro válido com DDD.',
    })
    .transform((val) => normalizeBrazilianPhone(val)!),
  current_inventory_method: z.enum(INVENTORY_METHODS, {
    message: 'Selecione um método atual de controle de estoque.',
  }),
});

export type LeadInput = z.infer<typeof leadSchema>;

export type SubmitLeadResult = {
  success: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
  whatsappAdminUrl?: string;
};
