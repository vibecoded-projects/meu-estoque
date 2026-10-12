import { describe, it, expect } from 'vitest';
import {
  PLANS,
  getPlan,
  BASE_MONTHLY_PRICE,
  calculateSavings,
  calculateMonthlyEquivalent,
} from '../plans';

describe('StokFácil — Fonte Única de Verdade dos Planos (plans.ts)', () => {
  it('deve conter exatamente os 4 planos comerciais da plataforma', () => {
    expect(PLANS).toHaveLength(4);
    const ids = PLANS.map((p) => p.id);
    expect(ids).toEqual(['monthly', 'quarterly', 'semiannual', 'annual']);
  });

  it('deve ter o preço base mensal correto de R$ 39', () => {
    expect(BASE_MONTHLY_PRICE).toBe(39);
  });

  it('deve configurar o plano Mensal com R$ 39/mês e sem economia acumulada', () => {
    const monthly = getPlan('monthly');
    expect(monthly).toBeDefined();
    expect(monthly?.title).toBe('Mensal');
    expect(monthly?.titulo).toBe('Mensal');
    expect(monthly?.price).toBe(39);
    expect(monthly?.preco).toBe(39);
    expect(monthly?.cycle).toBe('mês');
    expect(monthly?.ciclo).toBe('mês');
    expect(monthly?.durationMonths).toBe(1);
    expect(monthly?.savings).toBe(0);
    expect(monthly?.monthlyEquivalent).toBe(39);
    expect(monthly?.highlight).toBe(false);
    expect(monthly?.destaque).toBe(false);
    expect(monthly?.features.length).toBeGreaterThanOrEqual(4);
    expect(monthly?.recursos.length).toBeGreaterThanOrEqual(4);
    expect(monthly?.mainBenefit).toBeTruthy();
    expect(monthly?.beneficioPrincipal).toBeTruthy();
  });

  it('deve configurar o plano Trimestral com R$ 99/trimestre e economia exata de R$ 18', () => {
    const quarterly = getPlan('quarterly');
    expect(quarterly).toBeDefined();
    expect(quarterly?.title).toBe('Trimestral');
    expect(quarterly?.price).toBe(99);
    expect(quarterly?.durationMonths).toBe(3);
    expect(quarterly?.savings).toBe(18); // 3 * 39 - 99 = 117 - 99 = 18
    expect(quarterly?.monthlyEquivalent).toBe(33); // 99 / 3 = 33
    expect(quarterly?.highlight).toBe(false);
  });

  it('deve configurar o plano Semestral com R$ 169/semestre e economia exata de R$ 65', () => {
    const semiannual = getPlan('semiannual');
    expect(semiannual).toBeDefined();
    expect(semiannual?.title).toBe('Semestral');
    expect(semiannual?.price).toBe(169);
    expect(semiannual?.durationMonths).toBe(6);
    expect(semiannual?.savings).toBe(65); // 6 * 39 - 169 = 234 - 169 = 65
    expect(semiannual?.monthlyEquivalent).toBe(28.17); // 169 / 6 = 28.1666...
    expect(semiannual?.highlight).toBe(false);
  });

  it('deve configurar o plano Anual como Destaque VIP com R$ 299/ano, economia de R$ 169 e benefícios exclusivos', () => {
    const annual = getPlan('annual');
    expect(annual).toBeDefined();
    expect(annual?.title).toBe('Anual');
    expect(annual?.price).toBe(299);
    expect(annual?.durationMonths).toBe(12);
    expect(annual?.savings).toBe(169); // 12 * 39 - 299 = 468 - 299 = 169
    expect(annual?.monthlyEquivalent).toBe(24.92); // ~R$ 24,90/mês
    expect(annual?.highlight).toBe(true);
    expect(annual?.destaque).toBe(true);
    expect(annual?.badge).toBeDefined();

    // Validação dos recursos VIP requisitados
    const featuresJoined = annual?.features.join(' ') || '';
    expect(featuresJoined).toMatch(/Setup inicial de até 15 itens/i);
    expect(featuresJoined).toMatch(/White-label/i);
    expect(featuresJoined).toMatch(/Kit de Balcão/i);
  });

  it('deve garantir que somente o plano Anual possui destaque ativo', () => {
    const highlightedPlans = PLANS.filter((p) => p.highlight);
    expect(highlightedPlans).toHaveLength(1);
    expect(highlightedPlans[0].id).toBe('annual');
  });

  it('deve calcular economias e equivalências com precisão pelas funções utilitárias', () => {
    expect(calculateSavings(39, 1)).toBe(0);
    expect(calculateSavings(99, 3)).toBe(18);
    expect(calculateSavings(169, 6)).toBe(65);
    expect(calculateSavings(299, 12)).toBe(169);

    expect(calculateMonthlyEquivalent(39, 1)).toBe(39);
    expect(calculateMonthlyEquivalent(99, 3)).toBe(33);
    expect(calculateMonthlyEquivalent(169, 6)).toBe(28.17);
    expect(calculateMonthlyEquivalent(299, 12)).toBe(24.92);
  });

  it('deve exportar todos os atributos obrigatórios em cada plano', () => {
    for (const plan of PLANS) {
      expect(plan.id).toBeDefined();
      expect(plan.title).toBeTruthy();
      expect(plan.titulo).toBeTruthy();
      expect(plan.price).toBeGreaterThan(0);
      expect(plan.preco).toBeGreaterThan(0);
      expect(plan.cycle).toBeTruthy();
      expect(plan.ciclo).toBeTruthy();
      expect(typeof plan.highlight).toBe('boolean');
      expect(typeof plan.destaque).toBe('boolean');
      expect(Array.isArray(plan.features)).toBe(true);
      expect(plan.features.length).toBeGreaterThan(0);
      expect(Array.isArray(plan.recursos)).toBe(true);
      expect(plan.recursos.length).toBeGreaterThan(0);
      expect(plan.mainBenefit).toBeTruthy();
      expect(plan.beneficioPrincipal).toBeTruthy();
      expect(plan.formattedPrice).toContain('R$');
    }
  });
});
