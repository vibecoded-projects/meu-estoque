import { describe, it, expect } from 'vitest';
import {
  PLANS,
  getPlan,
  BASE_MONTHLY_PRICE,
  calculateSavings,
  calculateMonthlyEquivalent,
  calculateDiscountPercent,
} from '../plans';

describe('StokFácil — Fonte Única de Verdade dos Planos (plans.ts)', () => {
  it('deve conter exatamente os 4 planos comerciais da plataforma', () => {
    expect(PLANS).toHaveLength(4);
    const ids = PLANS.map((p) => p.id);
    expect(ids).toEqual(['monthly', 'quarterly', 'semiannual', 'annual']);
  });

  it('deve ter o preço base mensal correto de R$ 19,90', () => {
    expect(BASE_MONTHLY_PRICE).toBe(19.9);
  });

  it('deve configurar o plano Mensal com R$ 19,90/mês e sem desconto acumulado', () => {
    const monthly = getPlan('monthly');
    expect(monthly).toBeDefined();
    expect(monthly?.title).toBe('Mensal');
    expect(monthly?.titulo).toBe('Mensal');
    expect(monthly?.price).toBe(19.9);
    expect(monthly?.preco).toBe(19.9);
    expect(monthly?.cycle).toBe('mês');
    expect(monthly?.ciclo).toBe('mês');
    expect(monthly?.durationMonths).toBe(1);
    expect(monthly?.savings).toBe(0);
    expect(monthly?.discountPercent).toBe(0);
    expect(monthly?.percentualDesconto).toBe(0);
    expect(monthly?.formattedDiscount).toBe('Sem desconto');
    expect(monthly?.descontoFormatado).toBe('Sem desconto');
    expect(monthly?.monthlyEquivalent).toBe(19.9);
    expect(monthly?.formattedMonthlyEquivalent).toBe('R$ 19,90/mês');
    expect(monthly?.highlight).toBe(false);
    expect(monthly?.destaque).toBe(false);
    expect(monthly?.features.length).toBeGreaterThanOrEqual(4);
    expect(monthly?.recursos.length).toBeGreaterThanOrEqual(4);
    expect(monthly?.mainBenefit).toBeTruthy();
    expect(monthly?.beneficioPrincipal).toBeTruthy();
  });

  it('deve configurar o plano Trimestral com R$ 49,90/trimestre e 16% OFF de desconto', () => {
    const quarterly = getPlan('quarterly');
    expect(quarterly).toBeDefined();
    expect(quarterly?.title).toBe('Trimestral');
    expect(quarterly?.price).toBe(49.9);
    expect(quarterly?.durationMonths).toBe(3);
    expect(quarterly?.savings).toBe(9.8); // 3 * 19.9 - 49.9 = 59.7 - 49.9 = 9.8
    expect(quarterly?.discountPercent).toBe(16); // (59.7 - 49.9)/59.7 = 16.41% -> 16%
    expect(quarterly?.percentualDesconto).toBe(16);
    expect(quarterly?.formattedDiscount).toBe('16% OFF');
    expect(quarterly?.descontoFormatado).toBe('16% OFF');
    expect(quarterly?.monthlyEquivalent).toBe(16.63); // 49.9 / 3 = 16.633...
    expect(quarterly?.formattedMonthlyEquivalent).toBe('~R$ 16,63/mês');
    expect(quarterly?.highlight).toBe(false);
    expect(quarterly?.mainBenefit).toMatch(/16% OFF/i);
    expect(quarterly?.beneficioPrincipal).toMatch(/16% OFF/i);
    const features = quarterly?.features.join(' ') || '';
    expect(features).toMatch(/16% OFF/i);
    expect(features).toMatch(/Economia de R\$ 9,80/i);
  });

  it('deve configurar o plano Semestral com R$ 89,90/semestre e 25% OFF de desconto', () => {
    const semiannual = getPlan('semiannual');
    expect(semiannual).toBeDefined();
    expect(semiannual?.title).toBe('Semestral');
    expect(semiannual?.price).toBe(89.9);
    expect(semiannual?.durationMonths).toBe(6);
    expect(semiannual?.savings).toBe(29.5); // 6 * 19.9 - 89.9 = 119.4 - 89.9 = 29.5
    expect(semiannual?.discountPercent).toBe(25); // (119.4 - 89.9)/119.4 = 24.71% -> 25%
    expect(semiannual?.percentualDesconto).toBe(25);
    expect(semiannual?.formattedDiscount).toBe('25% OFF');
    expect(semiannual?.descontoFormatado).toBe('25% OFF');
    expect(semiannual?.monthlyEquivalent).toBe(14.98); // 89.9 / 6 = 14.9833...
    expect(semiannual?.formattedMonthlyEquivalent).toBe('~R$ 14,98/mês');
    expect(semiannual?.highlight).toBe(false);
    expect(semiannual?.mainBenefit).toMatch(/25% OFF/i);
    expect(semiannual?.beneficioPrincipal).toMatch(/25% OFF/i);
    const features = semiannual?.features.join(' ') || '';
    expect(features).toMatch(/25% OFF/i);
    expect(features).toMatch(/Economia de R\$ 29,50/i);
  });

  it('deve configurar o plano Anual como Destaque VIP com R$ 149,90/ano, 37% OFF e benefícios exclusivos', () => {
    const annual = getPlan('annual');
    expect(annual).toBeDefined();
    expect(annual?.title).toBe('Anual');
    expect(annual?.price).toBe(149.9);
    expect(annual?.durationMonths).toBe(12);
    expect(annual?.savings).toBe(88.9); // 12 * 19.9 - 149.9 = 238.8 - 149.9 = 88.9
    expect(annual?.discountPercent).toBe(37); // (238.8 - 149.9)/238.8 = 37.23% -> 37%
    expect(annual?.percentualDesconto).toBe(37);
    expect(annual?.formattedDiscount).toBe('37% OFF');
    expect(annual?.descontoFormatado).toBe('37% OFF');
    expect(annual?.monthlyEquivalent).toBe(12.49); // ~R$ 12,49/mês
    expect(annual?.formattedMonthlyEquivalent).toBe('~R$ 12,49/mês');
    expect(annual?.highlight).toBe(true);
    expect(annual?.destaque).toBe(true);
    expect(annual?.badge).toBeDefined();
    expect(annual?.mainBenefit).toMatch(/37% OFF/i);
    expect(annual?.mainBenefit).toMatch(/~R\$ 12,49\/mês/i);
    expect(annual?.beneficioPrincipal).toMatch(/37% OFF/i);

    // Validação dos recursos VIP requisitados
    const featuresJoined = annual?.features.join(' ') || '';
    expect(featuresJoined).toMatch(/Setup inicial de até 15 itens/i);
    expect(featuresJoined).toMatch(/White-label/i);
    expect(featuresJoined).toMatch(/Kit de Balcão/i);
    expect(featuresJoined).toMatch(/37% OFF/i);
    expect(featuresJoined).toMatch(/~R\$ 12,49\/mês/i);
  });

  it('deve garantir que somente o plano Anual possui destaque ativo', () => {
    const highlightedPlans = PLANS.filter((p) => p.highlight);
    expect(highlightedPlans).toHaveLength(1);
    expect(highlightedPlans[0].id).toBe('annual');
  });

  it('deve calcular economias e equivalências com precisão pelas funções utilitárias', () => {
    expect(calculateSavings(19.9, 1)).toBe(0);
    expect(calculateSavings(49.9, 3)).toBe(9.8);
    expect(calculateSavings(89.9, 6)).toBe(29.5);
    expect(calculateSavings(149.9, 12)).toBe(88.9);

    expect(calculateMonthlyEquivalent(19.9, 1)).toBe(19.9);
    expect(calculateMonthlyEquivalent(49.9, 3)).toBe(16.63);
    expect(calculateMonthlyEquivalent(89.9, 6)).toBe(14.98);
    expect(calculateMonthlyEquivalent(149.9, 12)).toBe(12.49);
  });

  it('deve calcular o percentual de desconto com a função calculateDiscountPercent', () => {
    // Casos padrão dos planos
    expect(calculateDiscountPercent(19.9, 1)).toBe(0);
    expect(calculateDiscountPercent(49.9, 3)).toBe(16);
    expect(calculateDiscountPercent(89.9, 6)).toBe(25);
    expect(calculateDiscountPercent(149.9, 12)).toBe(37);

    // Casos de borda e entradas inválidas
    expect(calculateDiscountPercent(0, 1)).toBe(0);
    expect(calculateDiscountPercent(-10, 3)).toBe(0);
    expect(calculateDiscountPercent(19.9, 0)).toBe(0);
    expect(calculateDiscountPercent(19.9, -1)).toBe(0);
    expect(calculateDiscountPercent(60, 3)).toBe(0); // Preço maior que 3 * 19.9 = 59.7
    expect(calculateDiscountPercent(59.7, 3)).toBe(0); // Preço igual ao total base
  });

  it('deve garantir que os discountPercent dos planos coincidem com calculateDiscountPercent', () => {
    for (const plan of PLANS) {
      const calculated = calculateDiscountPercent(plan.price, plan.durationMonths);
      expect(plan.discountPercent).toBe(calculated);
      expect(plan.percentualDesconto).toBe(calculated);
    }
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
      expect(typeof plan.discountPercent).toBe('number');
      expect(typeof plan.percentualDesconto).toBe('number');
      expect(plan.discountPercent).toBeGreaterThanOrEqual(0);
      expect(plan.formattedDiscount).toBeTruthy();
      expect(plan.descontoFormatado).toBeTruthy();
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
