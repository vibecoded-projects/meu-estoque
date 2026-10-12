'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { formatBrazilianPhone } from '@/lib/phone';
import { leadSchema, type SubmitLeadResult } from '@/lib/leads';

export type { SubmitLeadResult };

/**
 * Server Action para submissão de pedidos de acesso (leads) na Home.
 *
 * Segurança e Regras de Negócio:
 * - Valida entradas com Zod
 * - Detecta preenchimento de honeypot anti-spam (simulando sucesso silencioso)
 * - Verifica unicidade do slug pretendido em namespaces (lojas ativas) e leads (pedidos pendentes)
 * - Insere com service role (supabaseAdmin) respeitando Decisão D6 (sem policy pública de INSERT)
 * - Trata código de erro PostgreSQL 23505 (violação de unicidade)
 * - Retorna mensagem oficial de RF04 e link wa.me para o operador acelerar a ativação (D8).
 */
export async function submitLead(formData: FormData): Promise<SubmitLeadResult> {
  // 1. Verificação Honeypot anti-spam
  const honeypot = (
    formData.get('website') ??
    formData.get('hp_field') ??
    formData.get('b_hp_field') ??
    ''
  )
    .toString()
    .trim();

  if (honeypot.length > 0) {
    // Retorno falso-positivo silencioso para robôs
    return {
      success: true,
      message:
        'Seu pedido foi recebido! Em instantes você receberá seu link e PIN no WhatsApp.',
      whatsappAdminUrl: '#',
    };
  }

  // 2. Extração dos campos
  const rawData = {
    contact_name: formData.get('contact_name')?.toString() ?? '',
    store_name: formData.get('store_name')?.toString() ?? '',
    slug: (formData.get('slug') ?? formData.get('requested_slug') ?? '')
      .toString(),
    whatsapp: formData.get('whatsapp')?.toString() ?? '',
    current_inventory_method:
      formData.get('current_inventory_method')?.toString() ?? '',
  };

  // 3. Validação com Zod
  const validationResult = leadSchema.safeParse(rawData);

  if (!validationResult.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of validationResult.error.issues) {
      const field = issue.path[0]?.toString();
      if (field && !fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }

    const firstErrorMessage =
      validationResult.error.issues[0]?.message || 'Dados inválidos.';

    return {
      success: false,
      error: firstErrorMessage,
      fieldErrors,
    };
  }

  const {
    contact_name,
    store_name,
    slug: sanitizedSlug,
    whatsapp: normalizedPhone,
    current_inventory_method,
  } = validationResult.data;

  try {
    // 4. Verificação de disponibilidade prévia do slug em namespaces
    const { data: existingNamespace, error: nsQueryError } = await supabaseAdmin
      .from('namespaces')
      .select('id')
      .eq('slug', sanitizedSlug)
      .maybeSingle();

    if (nsQueryError) {
      console.error('[submitLead] Erro ao verificar namespace:', nsQueryError);
    }

    if (existingNamespace) {
      return {
        success: false,
        error: 'Este link já está em uso ou foi solicitado por outra loja.',
        fieldErrors: {
          slug: 'Este link já está em uso ou foi solicitado por outra loja.',
        },
      };
    }

    // 5. Verificação de disponibilidade prévia do slug em leads
    const { data: existingLead, error: leadQueryError } = await supabaseAdmin
      .from('leads')
      .select('id')
      .eq('requested_slug', sanitizedSlug)
      .maybeSingle();

    if (leadQueryError) {
      console.error('[submitLead] Erro ao verificar lead:', leadQueryError);
    }

    if (existingLead) {
      return {
        success: false,
        error: 'Este link já está em uso ou foi solicitado por outra loja.',
        fieldErrors: {
          slug: 'Este link já está em uso ou foi solicitado por outra loja.',
        },
      };
    }

    // 6. Inserção na tabela leads usando service role (supabaseAdmin)
    const { error: insertError } = await supabaseAdmin.from('leads').insert({
      contact_name,
      store_name,
      requested_slug: sanitizedSlug,
      whatsapp: normalizedPhone,
      current_inventory_method,
      status: 'trial_pending',
    });

    if (insertError) {
      console.error('[submitLead] Erro ao inserir lead:', insertError);

      // Tratamento específico de erro 23505 (violação de restrição UNIQUE)
      if (
        insertError.code === '23505' ||
        insertError.message?.includes('duplicate key') ||
        insertError.message?.includes('uq_leads_requested_slug')
      ) {
        return {
          success: false,
          error: 'Este link já está em uso ou foi solicitado por outra loja.',
          fieldErrors: {
            slug: 'Este link já está em uso ou foi solicitado por outra loja.',
          },
        };
      }

      return {
        success: false,
        error:
          'Não foi possível registrar seu pedido de acesso no momento. Tente novamente em instantes.',
      };
    }

    // 7. Geração da URL do WhatsApp do Operador (D8 / RF04)
    const adminPhoneRaw =
      process.env.NEXT_PUBLIC_ADMIN_WHATSAPP || '5511999999999';
    const adminPhone = adminPhoneRaw.replace(/\D/g, '');
    const displayPhone = formatBrazilianPhone(normalizedPhone);

    const messageLines = [
      `Olá! Acabei de pedir acesso ao StokFácil para a minha loja *${store_name}*.`,
      `Link pretendido: stokfacil.com/${sanitizedSlug}`,
      `Responsável: ${contact_name}`,
      `WhatsApp: ${displayPhone}`,
      `Estoque atual: ${current_inventory_method}`,
      '',
      'Gostaria de acelerar minha ativação!',
    ];

    const encodedMessage = encodeURIComponent(messageLines.join('\n'));
    const whatsappAdminUrl = `https://wa.me/${adminPhone}?text=${encodedMessage}`;

    return {
      success: true,
      message:
        'Seu pedido foi recebido! Em instantes você receberá seu link e PIN no WhatsApp.',
      whatsappAdminUrl,
    };
  } catch (err) {
    console.error('[submitLead] Exceção inesperada:', err);
    return {
      success: false,
      error:
        'Ocorreu uma falha inesperada ao processar sua solicitação. Tente novamente mais tarde.',
    };
  }
}
