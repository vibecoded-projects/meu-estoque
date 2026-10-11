import type { Namespace } from './types';

export type LifecycleState = 'active' | 'grace' | 'paused' | 'blocked';

export const GRACE_PERIOD_DAYS = 7;
export const RENEWAL_BANNER_DAYS = 5;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface StoreLifecycle {
  state: LifecycleState;
  expiresAt: Date | null;
  daysLeft: number | null;
  canEdit: boolean;
  isPublic: boolean;
  showRenewalBanner: boolean;
}

export type StoreLifecycleInput = Pick<
  Namespace,
  'status' | 'plan' | 'trial_expires_at' | 'plan_expires_at'
>;

/**
 * Converte com segurança uma string ISO em Date válida.
 * Retorna null para valores ausentes, vazios ou inválidos.
 */
function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value || typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

/**
 * Deriva o estado de ciclo de vida da loja sob demanda (sem cron).
 *
 * Regras aplicadas em ordem:
 * 1. status 'blocked' -> blocked (canEdit false, isPublic false, showRenewalBanner false).
 * 2. status 'paused' -> paused por bloqueio manual (canEdit false, isPublic false, showRenewalBanner false).
 * 3. expiresAt = plano pago (plan !== 'trial') ? plan_expires_at : trial_expires_at.
 *    Plano pago sem plan_expires_at ou trial sem trial_expires_at -> active sem expiração.
 * 4. now < expiresAt -> active (canEdit true, isPublic true, showRenewalBanner = daysLeft <= 5).
 * 5. expiresAt <= now < expiresAt + 7 dias -> grace (canEdit false, isPublic true, showRenewalBanner true, daysLeft = dias restantes da carência).
 * 6. depois -> paused por expiração (canEdit false, isPublic false, showRenewalBanner true, daysLeft = 0).
 *
 * Status legado 'trial_grace_period' não força nada; segue as regras de datas.
 */
export function getStoreLifecycle(
  ns: Pick<Namespace, 'status' | 'plan' | 'trial_expires_at' | 'plan_expires_at'>,
  now: Date = new Date()
): {
  state: LifecycleState;
  expiresAt: Date | null;
  daysLeft: number | null;
  canEdit: boolean;
  isPublic: boolean;
  showRenewalBanner: boolean;
} {
  const isPaidPlan = Boolean(ns.plan && ns.plan !== 'trial');
  const rawExpiresAt = isPaidPlan ? ns.plan_expires_at : ns.trial_expires_at;
  const expiresAt = parseIsoDate(rawExpiresAt);

  // 1. Bloqueio administrativo pelo operador tem precedência absoluta
  if (ns.status === 'blocked') {
    return {
      state: 'blocked',
      expiresAt,
      daysLeft: null,
      canEdit: false,
      isPublic: false,
      showRenewalBanner: false,
    };
  }

  // 2. Pausa manual pelo operador
  if (ns.status === 'paused') {
    return {
      state: 'paused',
      expiresAt,
      daysLeft: null,
      canEdit: false,
      isPublic: false,
      showRenewalBanner: false,
    };
  }

  // 3. Sem data de expiração válida -> active sem expiração (compatibilidade legada)
  if (!expiresAt) {
    return {
      state: 'active',
      expiresAt: null,
      daysLeft: null,
      canEdit: true,
      isPublic: true,
      showRenewalBanner: false,
    };
  }

  const nowMs = now.getTime();
  const expiresAtMs = expiresAt.getTime();
  const graceExpiresAtMs = expiresAtMs + GRACE_PERIOD_DAYS * MS_PER_DAY;

  // 4. Período ativo regular
  if (nowMs < expiresAtMs) {
    const daysLeft = Math.ceil((expiresAtMs - nowMs) / MS_PER_DAY);
    return {
      state: 'active',
      expiresAt,
      daysLeft,
      canEdit: true,
      isPublic: true,
      showRenewalBanner: daysLeft <= RENEWAL_BANNER_DAYS,
    };
  }

  // 5. Período de tolerância (carência de 7 dias)
  if (nowMs < graceExpiresAtMs) {
    const daysLeft = Math.ceil((graceExpiresAtMs - nowMs) / MS_PER_DAY);
    return {
      state: 'grace',
      expiresAt,
      daysLeft,
      canEdit: false,
      isPublic: true,
      showRenewalBanner: true,
    };
  }

  // 6. Carência encerrada -> pausa por expiração
  return {
    state: 'paused',
    expiresAt,
    daysLeft: 0,
    canEdit: false,
    isPublic: false,
    showRenewalBanner: true,
  };
}
