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
    highlight: false,
    mainBenefit: 'Economia de R$ 18 a cada 3 meses',
    features: [
      'Todos os recursos do plano Mensal',
      'Economia de R$ 18 no ciclo',
      'Cobrança a cada 3 meses',
      'Suporte direto via WhatsApp',
    ],
    ctaText: 'Escolher Trimestral',
    titulo: 'Trimestral',
    preco: 99,
    ciclo: 'trimestre',
    destaque: false,
    recursos: [
      'Todos os recursos do plano Mensal',
      'Economia de R$ 18 no ciclo',
      'Cobrança a cada 3 meses',
      'Suporte direto via WhatsApp',
    ],
    beneficioPrincipal: 'Economia de R$ 18 a cada 3 meses',
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
    highlight: false,
    mainBenefit: 'Economia de R$ 65 e tranquilidade por 6 meses',
    features: [
      'Todos os recursos do plano Mensal',
      'Economia de R$ 65 no ciclo',
      'Cobrança a cada 6 meses',
      'Suporte direto via WhatsApp',
    ],
    ctaText: 'Escolher Semestral',
    titulo: 'Semestral',
    preco: 169,
    ciclo: 'semestre',
    destaque: false,
    recursos: [
      'Todos os recursos do plano Mensal',
      'Economia de R$ 65 no ciclo',
      'Cobrança a cada 6 meses',
      'Suporte direto via WhatsApp',
    ],
    beneficioPrincipal: 'Economia de R$ 65 e tranquilidade por 6 meses',
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
    highlight: true,
    badge: 'Mais Popular · Melhor Custo-Benefício',
    mainBenefit: 'Destaque VIP: ~R$ 24,90/mês, Setup de 15 itens incluso, White-label e Kit Balcão',
    features: [
      'Todos os recursos da plataforma',
      'Setup inicial de até 15 itens incluso (Concierge)',
      'White-label sem marca no rodapé',
      'Gerador de Kit de Balcão em PDF com QR Code',
      'Maior economia: R$ 169 de desconto no ano (~R$ 24,90/mês)',
      'Atendimento VIP prioritário',
    ],
    ctaText: 'Garantir Plano Anual VIP',
    titulo: 'Anual',
    preco: 299,
    ciclo: 'ano',
    destaque: true,
    recursos: [
      'Todos os recursos da plataforma',
      'Setup inicial de até 15 itens incluso (Concierge)',
      'White-label sem marca no rodapé',
      'Gerador de Kit de Balcão em PDF com QR Code',
      'Maior economia: R$ 169 de desconto no ano (~R$ 24,90/mês)',
      'Atendimento VIP prioritário',
    ],
    beneficioPrincipal: 'Destaque VIP: ~R$ 24,90/mês, Setup de 15 itens incluso, White-label e Kit Balcão',
  },
] as const;

/**
 * Busca a definição de um plano pelo seu ID de ciclo.
 */
export function getPlan(id: PlanCycle): PlanDefinition | undefined {
  return PLANS.find((plan) => plan.id === id);
}
