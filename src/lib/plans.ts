import { formatPrice } from './format';

export type PlanCycle = 'monthly' | 'quarterly' | 'semiannual' | 'annual';

export interface PlanDefinition {
  id: PlanCycle;
  title: string;
  price: number;
  formattedPrice: string;
  cycle: string;
  cyclePeriodLabel: string;
  durationMonths: number;
  monthlyEquivalent: number;
  formattedMonthlyEquivalent: string;
  savings: number;
  discountPercent: number;
  formattedDiscount: string;
  highlight: boolean;
  badge?: string;
  mainBenefit: string;
  features: readonly string[];
  ctaText: string;

  // Propriedades espelhadas em PT-BR para ergonomia e conformidade direta
  titulo: string;
  preco: number;
  ciclo: string;
  destaque: boolean;
  percentualDesconto: number;
  descontoFormatado: string;
  recursos: readonly string[];
  beneficioPrincipal: string;
}

export const BASE_MONTHLY_PRICE = 19.9;

/**
 * Calcula a economia em reais em relação ao preço mensal base acumulado.
 */
export function calculateSavings(price: number, durationMonths: number): number {
  const diff = BASE_MONTHLY_PRICE * durationMonths - price;
  return Math.round(diff * 100) / 100;
}

/**
 * Calcula a porcentagem inteira de desconto em relação ao preço base mensal acumulado.
 * Retorna 0 caso não haja desconto ou os parâmetros sejam inválidos.
 */
export function calculateDiscountPercent(price: number, durationMonths: number): number {
  if (durationMonths <= 0 || price <= 0) return 0;
  const baseTotal = BASE_MONTHLY_PRICE * durationMonths;
  if (price >= baseTotal) return 0;
  const discount = ((baseTotal - price) / baseTotal) * 100;
  return Math.round(discount);
}

/**
 * Calcula o valor mensal equivalente arredondado para duas casas decimais.
 */
export function calculateMonthlyEquivalent(price: number, durationMonths: number): number {
  if (durationMonths <= 0) return price;
  return Math.round((price / durationMonths) * 100) / 100;
}

export const PLANS: readonly PlanDefinition[] = [
  {
    id: 'monthly',
    title: 'Mensal',
    price: 19.9,
    formattedPrice: formatPrice(19.9),
    cycle: 'mês',
    cyclePeriodLabel: '/mês',
    durationMonths: 1,
    monthlyEquivalent: 19.9,
    formattedMonthlyEquivalent: 'R$ 19,90/mês',
    savings: 0,
    discountPercent: 0,
    formattedDiscount: 'Sem desconto',
    highlight: false,
    mainBenefit: 'Sem fidelidade, flexibilidade mês a mês',
    features: [
      'Catálogo digital ilimitado com fotos',
      'Botão direto "Pedir no WhatsApp"',
      'Compartilhamento em 1 clique para Instagram',
      'Alternância rápida Disponível / Vendido',
      'Suporte direto via WhatsApp',
    ],
    ctaText: 'Começar com Mensal',
    titulo: 'Mensal',
    preco: 19.9,
    ciclo: 'mês',
    destaque: false,
    percentualDesconto: 0,
    descontoFormatado: 'Sem desconto',
    recursos: [
      'Catálogo digital ilimitado com fotos',
      'Botão direto "Pedir no WhatsApp"',
      'Compartilhamento em 1 clique para Instagram',
      'Alternância rápida Disponível / Vendido',
      'Suporte direto via WhatsApp',
    ],
    beneficioPrincipal: 'Sem fidelidade, flexibilidade mês a mês',
  },
  {
    id: 'quarterly',
    title: 'Trimestral',
    price: 49.9,
    formattedPrice: formatPrice(49.9),
    cycle: 'trimestre',
    cyclePeriodLabel: '/trimestre',
    durationMonths: 3,
    monthlyEquivalent: 16.63,
    formattedMonthlyEquivalent: '~R$ 16,63/mês',
    savings: 9.8,
    discountPercent: 16,
    formattedDiscount: '16% OFF',
    highlight: false,
    mainBenefit: '16% OFF: economia garantida no plano trimestral',
    features: [
      'Todos os recursos do plano Mensal',
      '16% OFF de desconto (Economia de R$ 9,80 no ciclo)',
      'Cobrança a cada 3 meses (~R$ 16,63/mês)',
      'Suporte direto via WhatsApp',
    ],
    ctaText: 'Escolher Trimestral',
    titulo: 'Trimestral',
    preco: 49.9,
    ciclo: 'trimestre',
    destaque: false,
    percentualDesconto: 16,
    descontoFormatado: '16% OFF',
    recursos: [
      'Todos os recursos do plano Mensal',
      '16% OFF de desconto (Economia de R$ 9,80 no ciclo)',
      'Cobrança a cada 3 meses (~R$ 16,63/mês)',
      'Suporte direto via WhatsApp',
    ],
    beneficioPrincipal: '16% OFF: economia garantida no plano trimestral',
  },
  {
    id: 'semiannual',
    title: 'Semestral',
    price: 89.9,
    formattedPrice: formatPrice(89.9),
    cycle: 'semestre',
    cyclePeriodLabel: '/semestre',
    durationMonths: 6,
    monthlyEquivalent: 14.98,
    formattedMonthlyEquivalent: '~R$ 14,98/mês',
    savings: 29.5,
    discountPercent: 25,
    formattedDiscount: '25% OFF',
    highlight: false,
    mainBenefit: '25% OFF: mais de 1/4 de desconto e tranquilidade por 6 meses',
    features: [
      'Todos os recursos do plano Mensal',
      '25% OFF de desconto (Economia de R$ 29,50 no ciclo)',
      'Cobrança a cada 6 meses (~R$ 14,98/mês)',
      'Suporte direto via WhatsApp',
    ],
    ctaText: 'Escolher Semestral',
    titulo: 'Semestral',
    preco: 89.9,
    ciclo: 'semestre',
    destaque: false,
    percentualDesconto: 25,
    descontoFormatado: '25% OFF',
    recursos: [
      'Todos os recursos do plano Mensal',
      '25% OFF de desconto (Economia de R$ 29,50 no ciclo)',
      'Cobrança a cada 6 meses (~R$ 14,98/mês)',
      'Suporte direto via WhatsApp',
    ],
    beneficioPrincipal: '25% OFF: mais de 1/4 de desconto e tranquilidade por 6 meses',
  },
  {
    id: 'annual',
    title: 'Anual',
    price: 149.9,
    formattedPrice: formatPrice(149.9),
    cycle: 'ano',
    cyclePeriodLabel: '/ano',
    durationMonths: 12,
    monthlyEquivalent: 12.49,
    formattedMonthlyEquivalent: '~R$ 12,49/mês',
    savings: 88.9,
    discountPercent: 37,
    formattedDiscount: '37% OFF',
    highlight: true,
    badge: 'Mais Popular · Melhor Custo-Benefício',
    mainBenefit: 'Super Economia com 37% OFF: ~R$ 12,49/mês, Setup de 15 itens incluso, White-label e Kit Balcão',
    features: [
      'Todos os recursos da plataforma',
      'Setup inicial de até 15 itens incluso (Concierge)',
      'White-label sem marca no rodapé',
      'Gerador de Kit de Balcão em PDF com QR Code',
      'Super Economia: 37% OFF (R$ 88,90 de desconto no ano, ~R$ 12,49/mês)',
      'Atendimento VIP prioritário',
    ],
    ctaText: 'Garantir Plano Anual VIP',
    titulo: 'Anual',
    preco: 149.9,
    ciclo: 'ano',
    destaque: true,
    percentualDesconto: 37,
    descontoFormatado: '37% OFF',
    recursos: [
      'Todos os recursos da plataforma',
      'Setup inicial de até 15 itens incluso (Concierge)',
      'White-label sem marca no rodapé',
      'Gerador de Kit de Balcão em PDF com QR Code',
      'Super Economia: 37% OFF (R$ 88,90 de desconto no ano, ~R$ 12,49/mês)',
      'Atendimento VIP prioritário',
    ],
    beneficioPrincipal: 'Super Economia com 37% OFF: ~R$ 12,49/mês, Setup de 15 itens incluso, White-label e Kit Balcão',
  },
] as const;

/**
 * Busca a definição de um plano pelo seu ID de ciclo.
 */
export function getPlan(id: PlanCycle): PlanDefinition | undefined {
  return PLANS.find((plan) => plan.id === id);
}
