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

export const BASE_MONTHLY_PRICE = 39;

/**
 * Calcula a economia em reais em relação ao preço mensal base acumulado.
 */
export function calculateSavings(price: number, durationMonths: number): number {
  return BASE_MONTHLY_PRICE * durationMonths - price;
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
  return Math.floor(discount);
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
    price: 39,
    formattedPrice: formatPrice(39),
    cycle: 'mês',
    cyclePeriodLabel: '/mês',
    durationMonths: 1,
    monthlyEquivalent: 39,
    formattedMonthlyEquivalent: 'R$ 39,00/mês',
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
    preco: 39,
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
    price: 99,
    formattedPrice: formatPrice(99),
    cycle: 'trimestre',
    cyclePeriodLabel: '/trimestre',
    durationMonths: 3,
    monthlyEquivalent: 33,
    formattedMonthlyEquivalent: 'R$ 33,00/mês',
    savings: 18,
    discountPercent: 15,
    formattedDiscount: '15% OFF',
    highlight: false,
    mainBenefit: '15% OFF: economia garantida no plano trimestral',
    features: [
      'Todos os recursos do plano Mensal',
      '15% OFF de desconto (Economia de R$ 18 no ciclo)',
      'Cobrança a cada 3 meses (R$ 33/mês)',
      'Suporte direto via WhatsApp',
    ],
    ctaText: 'Escolher Trimestral',
    titulo: 'Trimestral',
    preco: 99,
    ciclo: 'trimestre',
    destaque: false,
    percentualDesconto: 15,
    descontoFormatado: '15% OFF',
    recursos: [
      'Todos os recursos do plano Mensal',
      '15% OFF de desconto (Economia de R$ 18 no ciclo)',
      'Cobrança a cada 3 meses (R$ 33/mês)',
      'Suporte direto via WhatsApp',
    ],
    beneficioPrincipal: '15% OFF: economia garantida no plano trimestral',
  },
  {
    id: 'semiannual',
    title: 'Semestral',
    price: 169,
    formattedPrice: formatPrice(169),
    cycle: 'semestre',
    cyclePeriodLabel: '/semestre',
    durationMonths: 6,
    monthlyEquivalent: 28.17,
    formattedMonthlyEquivalent: 'R$ 28,17/mês',
    savings: 65,
    discountPercent: 27,
    formattedDiscount: '27% OFF',
    highlight: false,
    mainBenefit: '27% OFF: mais de 1/4 de desconto e tranquilidade por 6 meses',
    features: [
      'Todos os recursos do plano Mensal',
      '27% OFF de desconto (Economia de R$ 65 no ciclo)',
      'Cobrança a cada 6 meses (~R$ 28,17/mês)',
      'Suporte direto via WhatsApp',
    ],
    ctaText: 'Escolher Semestral',
    titulo: 'Semestral',
    preco: 169,
    ciclo: 'semestre',
    destaque: false,
    percentualDesconto: 27,
    descontoFormatado: '27% OFF',
    recursos: [
      'Todos os recursos do plano Mensal',
      '27% OFF de desconto (Economia de R$ 65 no ciclo)',
      'Cobrança a cada 6 meses (~R$ 28,17/mês)',
      'Suporte direto via WhatsApp',
    ],
    beneficioPrincipal: '27% OFF: mais de 1/4 de desconto e tranquilidade por 6 meses',
  },
  {
    id: 'annual',
    title: 'Anual',
    price: 299,
    formattedPrice: formatPrice(299),
    cycle: 'ano',
    cyclePeriodLabel: '/ano',
    durationMonths: 12,
    monthlyEquivalent: 24.92,
    formattedMonthlyEquivalent: '~R$ 24,90/mês',
    savings: 169,
    discountPercent: 36,
    formattedDiscount: '36% OFF',
    highlight: true,
    badge: 'Mais Popular · Melhor Custo-Benefício',
    mainBenefit: 'Super Economia com 36% OFF: ~R$ 24,90/mês, Setup de 15 itens incluso, White-label e Kit Balcão',
    features: [
      'Todos os recursos da plataforma',
      'Setup inicial de até 15 itens incluso (Concierge)',
      'White-label sem marca no rodapé',
      'Gerador de Kit de Balcão em PDF com QR Code',
      'Super Economia: 36% OFF (R$ 169 de desconto no ano, ~R$ 24,90/mês)',
      'Atendimento VIP prioritário',
    ],
    ctaText: 'Garantir Plano Anual VIP',
    titulo: 'Anual',
    preco: 299,
    ciclo: 'ano',
    destaque: true,
    percentualDesconto: 36,
    descontoFormatado: '36% OFF',
    recursos: [
      'Todos os recursos da plataforma',
      'Setup inicial de até 15 itens incluso (Concierge)',
      'White-label sem marca no rodapé',
      'Gerador de Kit de Balcão em PDF com QR Code',
      'Super Economia: 36% OFF (R$ 169 de desconto no ano, ~R$ 24,90/mês)',
      'Atendimento VIP prioritário',
    ],
    beneficioPrincipal: 'Super Economia com 36% OFF: ~R$ 24,90/mês, Setup de 15 itens incluso, White-label e Kit Balcão',
  },
] as const;

/**
 * Busca a definição de um plano pelo seu ID de ciclo.
 */
export function getPlan(id: PlanCycle): PlanDefinition | undefined {
  return PLANS.find((plan) => plan.id === id);
}
