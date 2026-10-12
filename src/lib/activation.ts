/**
 * StokFácil — Ativação Progressiva de Trial (T15 / RF13 / D3)
 *
 * Regra:
 * O lojista começa com 14 dias de teste gratuito.
 * Ao cadastrar pelo menos 5 produtos E compartilhar a vitrine pela primeira vez
 * (first_shared_at preenchido), se o trial ainda não foi estendido (!trial_extended),
 * ganha +16 dias de bônus, totalizando 30 dias a partir do início do trial (trial_starts_at).
 *
 * Operação 100% idempotente: lojas já estendidas (trial_extended = true) não recebem nova extensão.
 */

export const ACTIVATION_MIN_ITEMS = 5;
export const PROGRESSIVE_TRIAL_TOTAL_DAYS = 30;
export const PROGRESSIVE_TRIAL_INITIAL_DAYS = 14;
export const PROGRESSIVE_TRIAL_BONUS_DAYS = 16;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface ProgressiveTrialParams {
  itemsCount: number;
  firstSharedAt: Date | string | null;
  trialStartsAt: Date | string;
  trialExtended: boolean;
}

export interface ProgressiveTrialResult {
  isEligible: boolean;
  newTrialExpiresAt: Date | null;
}

export interface ActivationCompletedParams {
  itemsCount: number;
  firstSharedAt: Date | string | null;
}

/**
 * Converte com segurança um Date ou string ISO em instância válida de Date.
 * Retorna null para valores ausentes, vazios ou com parsing inválido (NaN).
 */
function parseDate(value: Date | string | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

/**
 * Avalia se uma loja é elegível para a extensão progressiva de trial (14 + 16 = 30 dias).
 *
 * Critérios de elegibilidade:
 * 1. trialExtended deve ser false (idempotência).
 * 2. itemsCount deve ser maior ou igual a 5.
 * 3. firstSharedAt deve ser uma data válida e preenchida.
 * 4. trialStartsAt deve ser uma data válida.
 *
 * Retorno:
 * - isEligible: true se atende a todos os critérios; false caso contrário.
 * - newTrialExpiresAt: nova data de expiração (trialStartsAt + 30 dias) se elegível; null caso contrário.
 */
export function evaluateProgressiveTrial({
  itemsCount,
  firstSharedAt,
  trialStartsAt,
  trialExtended,
}: ProgressiveTrialParams): ProgressiveTrialResult {
  // 1. Idempotência: se já foi estendido anteriormente, não é mais elegível
  if (trialExtended) {
    return {
      isEligible: false,
      newTrialExpiresAt: null,
    };
  }

  // 2. Requisito de catálogo: mínimo de 5 itens cadastrados
  if (itemsCount < ACTIVATION_MIN_ITEMS) {
    return {
      isEligible: false,
      newTrialExpiresAt: null,
    };
  }

  // 3. Requisito de compartilhamento: vitrine compartilhada pela primeira vez
  const parsedSharedAt = parseDate(firstSharedAt);
  if (!parsedSharedAt) {
    return {
      isEligible: false,
      newTrialExpiresAt: null,
    };
  }

  // 4. Data base de início do trial
  const parsedStartsAt = parseDate(trialStartsAt);
  if (!parsedStartsAt) {
    return {
      isEligible: false,
      newTrialExpiresAt: null,
    };
  }

  // Calcula a nova data de expiração: trialStartsAt + 30 dias exatos
  const newTrialExpiresAt = new Date(
    parsedStartsAt.getTime() + PROGRESSIVE_TRIAL_TOTAL_DAYS * MS_PER_DAY
  );

  return {
    isEligible: true,
    newTrialExpiresAt,
  };
}

/**
 * Verifica se os marcos de ativação do lojista foram completados:
 * - Pelo menos 5 itens cadastrados
 * - Vitrine compartilhada pelo menos uma vez (firstSharedAt preenchido)
 */
export function isActivationCompleted({
  itemsCount,
  firstSharedAt,
}: ActivationCompletedParams): boolean {
  if (itemsCount < ACTIVATION_MIN_ITEMS) {
    return false;
  }
  const parsedSharedAt = parseDate(firstSharedAt);
  return parsedSharedAt !== null;
}
