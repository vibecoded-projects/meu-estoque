import { Check, Sparkles, Star } from "lucide-react";
import { PLANS } from "@/lib/plans";

export function PricingSection() {
  return (
    <section id="planos" className="w-full py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold uppercase tracking-wider mb-3">
            <Sparkles size={14} />
            <span>Tabela Transparente</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            Planos simples para o seu estoque voar
          </h2>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            Comece hoje com 14 dias de teste grátis sem cartão. Escolha o plano que melhor se adapta ao momento da sua loja.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {PLANS.map((plan) => {
            const isAnnual = plan.highlight;

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col justify-between rounded-2xl transition-all duration-200 p-6 sm:p-7 ${
                  isAnnual
                    ? "bg-white border-2 border-indigo-600 shadow-xl ring-2 ring-indigo-600/10 lg:-translate-y-2"
                    : "bg-white border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-md"
                }`}
              >
                {/* VIP Badge for Annual */}
                {isAnnual && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-600 text-white text-xs font-bold tracking-wide shadow-sm">
                      <Star size={13} className="fill-white" />
                      {plan.badge || "Mais Popular · Melhor Custo-Benefício"}
                    </span>
                  </div>
                )}

                <div>
                  {/* Plan Title & Benefit */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xl font-bold text-slate-900">
                        {plan.title}
                      </h3>
                      {plan.discountPercent > 0 && (
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide shrink-0 ${
                            isAnnual
                              ? "bg-emerald-700 text-white shadow-xs"
                              : "bg-emerald-50 text-emerald-800 border border-emerald-300"
                          }`}
                        >
                          {plan.formattedDiscount}
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1 min-h-[36px] line-clamp-2">
                      {plan.mainBenefit}
                    </p>
                  </div>

                  {/* Price Tag */}
                  <div className="pt-2 pb-5 border-b border-slate-100 mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                        {plan.formattedPrice}
                      </span>
                      <span className="text-sm font-medium text-slate-600">
                        {plan.cyclePeriodLabel}
                      </span>
                    </div>

                    {/* Monthly Equivalent or Savings Badge */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      {isAnnual ? (
                        <>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold shadow-2xs">
                            {plan.formattedDiscount} / Super Economia
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-semibold">
                            Apenas {plan.formattedMonthlyEquivalent}
                          </span>
                        </>
                      ) : plan.discountPercent > 0 ? (
                        <>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold shadow-2xs">
                            {plan.formattedDiscount}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
                            {plan.formattedMonthlyEquivalent}
                          </span>
                        </>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
                          Pagamento mensal flexível
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Features List */}
                  <div className="mb-6">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-900 block mb-3">
                      O que está incluso:
                    </span>
                    <ul className="space-y-2.5">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 leading-snug">
                          <Check
                            size={16}
                            className={`shrink-0 mt-0.5 ${
                              isAnnual ? "text-indigo-600 stroke-[2.5]" : "text-emerald-600"
                            }`}
                          />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* CTA Button */}
                <div className="pt-4 mt-auto">
                  <a
                    href="#pedir-acesso"
                    className={`flex items-center justify-center w-full py-3 px-4 rounded-xl text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 shadow-xs ${
                      isAnnual
                        ? "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 shadow-indigo-100"
                        : "bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-900"
                    }`}
                  >
                    {plan.ctaText}
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pricing Guarantee Footer */}
        <div className="mt-12 text-center text-xs sm:text-sm text-slate-600 max-w-2xl mx-auto space-y-1">
          <p>
            Todos os planos incluem catálogo online, visualizações ilimitadas e suporte direto via WhatsApp.
          </p>
          <p className="text-slate-500">
            Pagamentos por Pix com ativação imediata. Sem cobranças surpresa e sem multas de cancelamento.
          </p>
        </div>

      </div>
    </section>
  );
}
