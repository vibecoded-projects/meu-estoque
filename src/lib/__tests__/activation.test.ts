import { describe, it, expect } from 'vitest';
import {
  evaluateProgressiveTrial,
  isActivationCompleted,
  ACTIVATION_MIN_ITEMS,
  PROGRESSIVE_TRIAL_TOTAL_DAYS,
  PROGRESSIVE_TRIAL_INITIAL_DAYS,
  PROGRESSIVE_TRIAL_BONUS_DAYS,
} from '@/lib/activation';

describe('activation.ts — Ativação progressiva 14+16 dias (T15 / RF13 / D3)', () => {
  const baseTrialStartsAtIso = '2026-10-01T12:00:00.000Z';
  const baseTrialStartsAtDate = new Date(baseTrialStartsAtIso);
  const sharedAtIso = '2026-10-05T15:30:00.000Z';
  const sharedAtDate = new Date(sharedAtIso);

  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const expectedExpiresAtMs = baseTrialStartsAtDate.getTime() + 30 * MS_PER_DAY;
  const expectedExpiresAtDate = new Date(expectedExpiresAtMs);

  describe('Constantes de ativação', () => {
    it('garante que a regra é 14 dias iniciais + 16 dias de bônus = 30 dias no total', () => {
      expect(PROGRESSIVE_TRIAL_INITIAL_DAYS).toBe(14);
      expect(PROGRESSIVE_TRIAL_BONUS_DAYS).toBe(16);
      expect(PROGRESSIVE_TRIAL_TOTAL_DAYS).toBe(30);
      expect(PROGRESSIVE_TRIAL_INITIAL_DAYS + PROGRESSIVE_TRIAL_BONUS_DAYS).toBe(
        PROGRESSIVE_TRIAL_TOTAL_DAYS
      );
      expect(ACTIVATION_MIN_ITEMS).toBe(5);
    });
  });

  describe('evaluateProgressiveTrial', () => {
    it('menos de 5 itens e não compartilhado -> inelegível', () => {
      const res = evaluateProgressiveTrial({
        itemsCount: 0,
        firstSharedAt: null,
        trialStartsAt: baseTrialStartsAtIso,
        trialExtended: false,
      });

      expect(res.isEligible).toBe(false);
      expect(res.newTrialExpiresAt).toBeNull();

      const res4 = evaluateProgressiveTrial({
        itemsCount: 4,
        firstSharedAt: null,
        trialStartsAt: baseTrialStartsAtIso,
        trialExtended: false,
      });

      expect(res4.isEligible).toBe(false);
      expect(res4.newTrialExpiresAt).toBeNull();
    });

    it('5 itens ou mais mas não compartilhado -> inelegível', () => {
      const res5 = evaluateProgressiveTrial({
        itemsCount: 5,
        firstSharedAt: null,
        trialStartsAt: baseTrialStartsAtIso,
        trialExtended: false,
      });

      expect(res5.isEligible).toBe(false);
      expect(res5.newTrialExpiresAt).toBeNull();

      const res10 = evaluateProgressiveTrial({
        itemsCount: 10,
        firstSharedAt: null,
        trialStartsAt: baseTrialStartsAtIso,
        trialExtended: false,
      });

      expect(res10.isEligible).toBe(false);
      expect(res10.newTrialExpiresAt).toBeNull();
    });

    it('menos de 5 itens mas compartilhado -> inelegível', () => {
      const res3 = evaluateProgressiveTrial({
        itemsCount: 3,
        firstSharedAt: sharedAtIso,
        trialStartsAt: baseTrialStartsAtIso,
        trialExtended: false,
      });

      expect(res3.isEligible).toBe(false);
      expect(res3.newTrialExpiresAt).toBeNull();

      const res4 = evaluateProgressiveTrial({
        itemsCount: 4,
        firstSharedAt: sharedAtDate,
        trialStartsAt: baseTrialStartsAtDate,
        trialExtended: false,
      });

      expect(res4.isEligible).toBe(false);
      expect(res4.newTrialExpiresAt).toBeNull();
    });

    it('5 itens ou mais E compartilhado E !trialExtended -> elegível com newTrialExpiresAt = trialStartsAt + 30 dias (string ISO)', () => {
      const res = evaluateProgressiveTrial({
        itemsCount: 5,
        firstSharedAt: sharedAtIso,
        trialStartsAt: baseTrialStartsAtIso,
        trialExtended: false,
      });

      expect(res.isEligible).toBe(true);
      expect(res.newTrialExpiresAt).toBeInstanceOf(Date);
      expect(res.newTrialExpiresAt?.toISOString()).toBe(expectedExpiresAtDate.toISOString());
      expect(res.newTrialExpiresAt?.getTime()).toBe(expectedExpiresAtMs);
    });

    it('5 itens ou mais E compartilhado E !trialExtended -> elegível com objeto Date', () => {
      const res = evaluateProgressiveTrial({
        itemsCount: 15,
        firstSharedAt: sharedAtDate,
        trialStartsAt: baseTrialStartsAtDate,
        trialExtended: false,
      });

      expect(res.isEligible).toBe(true);
      expect(res.newTrialExpiresAt).toBeInstanceOf(Date);
      expect(res.newTrialExpiresAt?.getTime()).toBe(expectedExpiresAtMs);
    });

    it('já estendido (trialExtended: true) -> inelegível (idempotência)', () => {
      const res = evaluateProgressiveTrial({
        itemsCount: 10,
        firstSharedAt: sharedAtIso,
        trialStartsAt: baseTrialStartsAtIso,
        trialExtended: true,
      });

      expect(res.isEligible).toBe(false);
      expect(res.newTrialExpiresAt).toBeNull();
    });

    it('retorna inelegível para trialStartsAt inválido', () => {
      const res = evaluateProgressiveTrial({
        itemsCount: 5,
        firstSharedAt: sharedAtIso,
        trialStartsAt: 'data-invalida',
        trialExtended: false,
      });

      expect(res.isEligible).toBe(false);
      expect(res.newTrialExpiresAt).toBeNull();
    });

    it('retorna inelegível para firstSharedAt vazio ou string inválida', () => {
      const resEmpty = evaluateProgressiveTrial({
        itemsCount: 5,
        firstSharedAt: '   ',
        trialStartsAt: baseTrialStartsAtIso,
        trialExtended: false,
      });

      expect(resEmpty.isEligible).toBe(false);
      expect(resEmpty.newTrialExpiresAt).toBeNull();

      const resInvalid = evaluateProgressiveTrial({
        itemsCount: 5,
        firstSharedAt: 'invalido',
        trialStartsAt: baseTrialStartsAtIso,
        trialExtended: false,
      });

      expect(resInvalid.isEligible).toBe(false);
      expect(resInvalid.newTrialExpiresAt).toBeNull();
    });
  });

  describe('isActivationCompleted', () => {
    it('retorna false quando possui menos de 5 itens e firstSharedAt é nulo', () => {
      expect(isActivationCompleted({ itemsCount: 0, firstSharedAt: null })).toBe(false);
      expect(isActivationCompleted({ itemsCount: 4, firstSharedAt: null })).toBe(false);
    });

    it('retorna false quando possui 5 ou mais itens mas firstSharedAt é nulo', () => {
      expect(isActivationCompleted({ itemsCount: 5, firstSharedAt: null })).toBe(false);
      expect(isActivationCompleted({ itemsCount: 20, firstSharedAt: null })).toBe(false);
    });

    it('retorna false quando compartilhou mas possui menos de 5 itens', () => {
      expect(isActivationCompleted({ itemsCount: 0, firstSharedAt: sharedAtIso })).toBe(false);
      expect(isActivationCompleted({ itemsCount: 4, firstSharedAt: sharedAtDate })).toBe(false);
    });

    it('retorna true quando possui 5 itens ou mais E firstSharedAt preenchido (string ISO)', () => {
      expect(isActivationCompleted({ itemsCount: 5, firstSharedAt: sharedAtIso })).toBe(true);
      expect(isActivationCompleted({ itemsCount: 8, firstSharedAt: sharedAtIso })).toBe(true);
    });

    it('retorna true quando possui 5 itens ou mais E firstSharedAt preenchido (Date)', () => {
      expect(isActivationCompleted({ itemsCount: 5, firstSharedAt: sharedAtDate })).toBe(true);
      expect(isActivationCompleted({ itemsCount: 12, firstSharedAt: sharedAtDate })).toBe(true);
    });

    it('retorna false quando firstSharedAt é string vazia ou inválida', () => {
      expect(isActivationCompleted({ itemsCount: 5, firstSharedAt: '' })).toBe(false);
      expect(isActivationCompleted({ itemsCount: 5, firstSharedAt: '   ' })).toBe(false);
      expect(isActivationCompleted({ itemsCount: 5, firstSharedAt: 'invalido' })).toBe(false);
    });
  });
});
