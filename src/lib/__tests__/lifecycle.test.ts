import { describe, expect, it } from 'vitest';
import {
  GRACE_PERIOD_DAYS,
  RENEWAL_BANNER_DAYS,
  getStoreLifecycle,
} from '@/lib/lifecycle';

describe('lifecycle', () => {
  describe('constantes', () => {
    it('exporta constantes com os valores esperados pela especificação', () => {
      expect(GRACE_PERIOD_DAYS).toBe(7);
      expect(RENEWAL_BANNER_DAYS).toBe(5);
    });
  });

  describe('estados básicos', () => {
    it('retorna active para trial ativo dentro do prazo', () => {
      const now = new Date('2026-10-10T00:00:00.000Z');
      const trialExpiresAt = '2026-10-24T00:00:00.000Z'; // 14 dias depois

      const result = getStoreLifecycle(
        {
          status: 'active',
          plan: 'trial',
          trial_expires_at: trialExpiresAt,
        },
        now
      );

      expect(result).toEqual({
        state: 'active',
        expiresAt: new Date(trialExpiresAt),
        daysLeft: 14,
        canEdit: true,
        isPublic: true,
        showRenewalBanner: false,
      });
    });

    it('retorna grace quando o período de teste expirou mas está dentro dos 7 dias de tolerância', () => {
      const expiresAt = '2026-10-10T00:00:00.000Z';
      const now = new Date('2026-10-13T00:00:00.000Z'); // 3 dias após expirar (faltam 4 dias de carência)

      const result = getStoreLifecycle(
        {
          status: 'active',
          plan: 'trial',
          trial_expires_at: expiresAt,
        },
        now
      );

      expect(result).toEqual({
        state: 'grace',
        expiresAt: new Date(expiresAt),
        daysLeft: 4,
        canEdit: false,
        isPublic: true,
        showRenewalBanner: true,
      });
    });

    it('retorna paused com banner de renovação quando o período de tolerância encerrou', () => {
      const expiresAt = '2026-10-01T00:00:00.000Z';
      const now = new Date('2026-10-15T00:00:00.000Z'); // 14 dias após expirar (> 7 dias)

      const result = getStoreLifecycle(
        {
          status: 'active',
          plan: 'trial',
          trial_expires_at: expiresAt,
        },
        now
      );

      expect(result).toEqual({
        state: 'paused',
        expiresAt: new Date(expiresAt),
        daysLeft: 0,
        canEdit: false,
        isPublic: false,
        showRenewalBanner: true,
      });
    });

    it('retorna paused sem banner quando o operador aplicou bloqueio manual via status', () => {
      const expiresAt = '2026-12-31T00:00:00.000Z';
      const now = new Date('2026-10-10T00:00:00.000Z');

      const result = getStoreLifecycle(
        {
          status: 'paused',
          plan: 'annual',
          plan_expires_at: expiresAt,
        },
        now
      );

      expect(result).toEqual({
        state: 'paused',
        expiresAt: new Date(expiresAt),
        daysLeft: null,
        canEdit: false,
        isPublic: false,
        showRenewalBanner: false,
      });
    });

    it('retorna blocked sem banner quando o operador bloqueou a loja via status', () => {
      const expiresAt = '2026-12-31T00:00:00.000Z';
      const now = new Date('2026-10-10T00:00:00.000Z');

      const result = getStoreLifecycle(
        {
          status: 'blocked',
          plan: 'monthly',
          plan_expires_at: expiresAt,
        },
        now
      );

      expect(result).toEqual({
        state: 'blocked',
        expiresAt: new Date(expiresAt),
        daysLeft: null,
        canEdit: false,
        isPublic: false,
        showRenewalBanner: false,
      });
    });
  });

  describe('fronteiras exatas', () => {
    const expiresAtIso = '2026-10-15T12:00:00.000Z';
    const expiresAtDate = new Date(expiresAtIso);
    const msPerDay = 24 * 60 * 60 * 1000;

    it('1ms antes de expirar ainda é active', () => {
      const now = new Date(expiresAtDate.getTime() - 1);

      const result = getStoreLifecycle(
        {
          status: 'active',
          plan: 'trial',
          trial_expires_at: expiresAtIso,
        },
        now
      );

      expect(result.state).toBe('active');
      expect(result.canEdit).toBe(true);
      expect(result.isPublic).toBe(true);
      expect(result.daysLeft).toBe(1);
    });

    it('now === expiresAt entra imediatamente em grace', () => {
      const now = new Date(expiresAtDate.getTime());

      const result = getStoreLifecycle(
        {
          status: 'active',
          plan: 'trial',
          trial_expires_at: expiresAtIso,
        },
        now
      );

      expect(result).toEqual({
        state: 'grace',
        expiresAt: expiresAtDate,
        daysLeft: 7,
        canEdit: false,
        isPublic: true,
        showRenewalBanner: true,
      });
    });

    it('expiresAt + 7d menos 1ms ainda é grace', () => {
      const now = new Date(expiresAtDate.getTime() + 7 * msPerDay - 1);

      const result = getStoreLifecycle(
        {
          status: 'active',
          plan: 'trial',
          trial_expires_at: expiresAtIso,
        },
        now
      );

      expect(result).toEqual({
        state: 'grace',
        expiresAt: expiresAtDate,
        daysLeft: 1,
        canEdit: false,
        isPublic: true,
        showRenewalBanner: true,
      });
    });

    it('expiresAt + 7d exato transiciona para paused', () => {
      const now = new Date(expiresAtDate.getTime() + 7 * msPerDay);

      const result = getStoreLifecycle(
        {
          status: 'active',
          plan: 'trial',
          trial_expires_at: expiresAtIso,
        },
        now
      );

      expect(result).toEqual({
        state: 'paused',
        expiresAt: expiresAtDate,
        daysLeft: 0,
        canEdit: false,
        isPublic: false,
        showRenewalBanner: true,
      });
    });
  });

  describe('banner de renovação por daysLeft', () => {
    const expiresAtIso = '2026-10-20T12:00:00.000Z';
    const expiresAtDate = new Date(expiresAtIso);
    const msPerDay = 24 * 60 * 60 * 1000;

    it('não exibe banner quando daysLeft === 6', () => {
      const now = new Date(expiresAtDate.getTime() - 6 * msPerDay);

      const result = getStoreLifecycle(
        {
          status: 'active',
          plan: 'monthly',
          plan_expires_at: expiresAtIso,
        },
        now
      );

      expect(result.daysLeft).toBe(6);
      expect(result.showRenewalBanner).toBe(false);
    });

    it('não exibe banner quando faltam 5 dias e 1ms (ceil arredonda para 6 dias)', () => {
      const now = new Date(expiresAtDate.getTime() - 5 * msPerDay - 1);

      const result = getStoreLifecycle(
        {
          status: 'active',
          plan: 'monthly',
          plan_expires_at: expiresAtIso,
        },
        now
      );

      expect(result.daysLeft).toBe(6);
      expect(result.showRenewalBanner).toBe(false);
    });

    it('exibe banner quando daysLeft === 5', () => {
      const now = new Date(expiresAtDate.getTime() - 5 * msPerDay);

      const result = getStoreLifecycle(
        {
          status: 'active',
          plan: 'monthly',
          plan_expires_at: expiresAtIso,
        },
        now
      );

      expect(result.daysLeft).toBe(5);
      expect(result.showRenewalBanner).toBe(true);
    });

    it('exibe banner quando daysLeft <= 5 (ex: 4 dias)', () => {
      const now = new Date(expiresAtDate.getTime() - 4 * msPerDay);

      const result = getStoreLifecycle(
        {
          status: 'active',
          plan: 'monthly',
          plan_expires_at: expiresAtIso,
        },
        now
      );

      expect(result.daysLeft).toBe(4);
      expect(result.showRenewalBanner).toBe(true);
    });
  });

  describe('planos pagos vs trial', () => {
    it('plano pago usa plan_expires_at e ignora trial vencido', () => {
      const now = new Date('2026-10-15T00:00:00.000Z');
      const planExpiresAt = '2026-11-15T00:00:00.000Z'; // Válido por 31 dias
      const trialExpiresAt = '2026-01-01T00:00:00.000Z'; // Trial antigo e vencido

      const result = getStoreLifecycle(
        {
          status: 'active',
          plan: 'monthly',
          plan_expires_at: planExpiresAt,
          trial_expires_at: trialExpiresAt,
        },
        now
      );

      expect(result.state).toBe('active');
      expect(result.expiresAt).toEqual(new Date(planExpiresAt));
      expect(result.daysLeft).toBe(31);
      expect(result.showRenewalBanner).toBe(false);
      expect(result.canEdit).toBe(true);
    });

    it('plano pago sem plan_expires_at é tratado como active vitalício/sem expiração (loja antiga)', () => {
      const now = new Date('2026-10-15T00:00:00.000Z');
      const trialExpiresAt = '2026-01-01T00:00:00.000Z'; // Mesmo com trial antigo

      const result = getStoreLifecycle(
        {
          status: 'active',
          plan: 'annual',
          plan_expires_at: null,
          trial_expires_at: trialExpiresAt,
        },
        now
      );

      expect(result).toEqual({
        state: 'active',
        expiresAt: null,
        daysLeft: null,
        canEdit: true,
        isPublic: true,
        showRenewalBanner: false,
      });
    });

    it('trial sem trial_expires_at é tratado como active sem expiração', () => {
      const now = new Date('2026-10-15T00:00:00.000Z');

      const result = getStoreLifecycle(
        {
          status: 'active',
          plan: 'trial',
          trial_expires_at: null,
        },
        now
      );

      expect(result).toEqual({
        state: 'active',
        expiresAt: null,
        daysLeft: null,
        canEdit: true,
        isPublic: true,
        showRenewalBanner: false,
      });
    });

    it('default de plano sem especificação é trial', () => {
      const now = new Date('2026-10-15T00:00:00.000Z');
      const trialExpiresAt = '2026-10-25T00:00:00.000Z';

      const result = getStoreLifecycle(
        {
          trial_expires_at: trialExpiresAt,
        },
        now
      );

      expect(result.state).toBe('active');
      expect(result.expiresAt).toEqual(new Date(trialExpiresAt));
      expect(result.daysLeft).toBe(10);
    });
  });

  describe('tolerância a dados ausentes ou inválidos', () => {
    it('data inválida é tratada como ausente (active sem expiração)', () => {
      const now = new Date('2026-10-15T00:00:00.000Z');

      const result = getStoreLifecycle(
        {
          status: 'active',
          plan: 'monthly',
          plan_expires_at: 'data-invalida',
        },
        now
      );

      expect(result).toEqual({
        state: 'active',
        expiresAt: null,
        daysLeft: null,
        canEdit: true,
        isPublic: true,
        showRenewalBanner: false,
      });
    });

    it('string vazia ou apenas espaços é tratada como ausente', () => {
      const now = new Date('2026-10-15T00:00:00.000Z');

      const result = getStoreLifecycle(
        {
          status: 'active',
          plan: 'trial',
          trial_expires_at: '   ',
        },
        now
      );

      expect(result).toEqual({
        state: 'active',
        expiresAt: null,
        daysLeft: null,
        canEdit: true,
        isPublic: true,
        showRenewalBanner: false,
      });
    });
  });

  describe('precedência de bloqueio', () => {
    it('blocked tem precedência absoluta mesmo com plano válido e ativo', () => {
      const now = new Date('2026-10-15T00:00:00.000Z');
      const planExpiresAt = '2027-10-15T00:00:00.000Z'; // 1 ano à frente

      const result = getStoreLifecycle(
        {
          status: 'blocked',
          plan: 'annual',
          plan_expires_at: planExpiresAt,
        },
        now
      );

      expect(result).toEqual({
        state: 'blocked',
        expiresAt: new Date(planExpiresAt),
        daysLeft: null,
        canEdit: false,
        isPublic: false,
        showRenewalBanner: false,
      });
    });

    it('paused manual tem precedência sobre plano válido', () => {
      const now = new Date('2026-10-15T00:00:00.000Z');
      const planExpiresAt = '2027-10-15T00:00:00.000Z';

      const result = getStoreLifecycle(
        {
          status: 'paused',
          plan: 'annual',
          plan_expires_at: planExpiresAt,
        },
        now
      );

      expect(result).toEqual({
        state: 'paused',
        expiresAt: new Date(planExpiresAt),
        daysLeft: null,
        canEdit: false,
        isPublic: false,
        showRenewalBanner: false,
      });
    });
  });

  describe('status legado trial_grace_period', () => {
    it('ignora status legado trial_grace_period e mantém active se data for futura', () => {
      const now = new Date('2026-10-15T00:00:00.000Z');
      const trialExpiresAt = '2026-10-25T00:00:00.000Z'; // 10 dias no futuro

      const result = getStoreLifecycle(
        {
          status: 'trial_grace_period',
          plan: 'trial',
          trial_expires_at: trialExpiresAt,
        },
        now
      );

      expect(result.state).toBe('active');
      expect(result.canEdit).toBe(true);
      expect(result.isPublic).toBe(true);
      expect(result.daysLeft).toBe(10);
    });

    it('ignora status legado trial_grace_period e entra em grace se data estiver em tolerância', () => {
      const now = new Date('2026-10-15T00:00:00.000Z');
      const trialExpiresAt = '2026-10-14T00:00:00.000Z'; // 1 dia após expirar

      const result = getStoreLifecycle(
        {
          status: 'trial_grace_period',
          plan: 'trial',
          trial_expires_at: trialExpiresAt,
        },
        now
      );

      expect(result.state).toBe('grace');
      expect(result.canEdit).toBe(false);
      expect(result.isPublic).toBe(true);
      expect(result.daysLeft).toBe(6);
    });

    it('ignora status legado trial_grace_period e pausa se data exceder 7 dias', () => {
      const now = new Date('2026-10-25T00:00:00.000Z');
      const trialExpiresAt = '2026-10-10T00:00:00.000Z'; // 15 dias após expirar

      const result = getStoreLifecycle(
        {
          status: 'trial_grace_period',
          plan: 'trial',
          trial_expires_at: trialExpiresAt,
        },
        now
      );

      expect(result.state).toBe('paused');
      expect(result.canEdit).toBe(false);
      expect(result.isPublic).toBe(false);
      expect(result.daysLeft).toBe(0);
      expect(result.showRenewalBanner).toBe(true);
    });
  });

  describe('comportamento padrão com new Date() injetado', () => {
    it('funciona quando now não é fornecido explicitamente', () => {
      // Cria uma data futura distante para garantir active
      const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const result = getStoreLifecycle({
        status: 'active',
        plan: 'trial',
        trial_expires_at: future,
      });

      expect(result.state).toBe('active');
      expect(result.canEdit).toBe(true);
      expect(result.isPublic).toBe(true);
      expect(typeof result.daysLeft).toBe('number');
      expect(result.daysLeft).toBeGreaterThan(0);
    });
  });
});
