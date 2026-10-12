import Link from "next/link";
import { Sparkles, MessageCircle, ArrowRight } from "lucide-react";
import { Hero } from "@/components/landing/Hero";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { PricingSection } from "@/components/landing/PricingSection";

export default function Home() {
  const currentYear = new Date().getFullYear();

  return (
    <main className="min-h-screen bg-white flex flex-col selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* 1. Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <Hero />
      </div>

      {/* 2. Visual Features Presentation Section */}
      <FeaturesSection />

      {/* 3. Pricing Plans Section */}
      <PricingSection />

      {/* 4. Access Request Placeholder (Prepared for T11 Lead Capture Form) */}
      <section id="pedir-acesso" className="w-full py-16 md:py-24 bg-slate-50 border-t border-slate-200 scroll-mt-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-12 text-center shadow-sm">
            
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs sm:text-sm font-semibold mb-6">
              <Sparkles size={16} className="text-emerald-600" />
              <span>Teste Grátis por 14 Dias</span>
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
              Comece agora sua vitrine digital StokFácil
            </h2>

            <p className="text-base sm:text-lg text-slate-600 max-w-xl mx-auto leading-relaxed mb-8">
              Tenha seu catálogo pronto no celular, compartilhe nas redes sociais e receba pedidos organizados no WhatsApp. Sem necessidade de cartão de crédito.
            </p>

            {/* Placeholder Container ready for LeadCaptureForm (T11) */}
            <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-6 sm:p-8 max-w-lg mx-auto">
              <p className="text-sm font-semibold text-slate-800 mb-2">
                Solicitação de Acesso Simplificada
              </p>
              <p className="text-xs text-slate-600 mb-6 leading-relaxed">
                Nossa equipe ativa sua vitrine personalizada e envia o link direto no seu WhatsApp em minutos.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/loja-carol"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-xs transition-colors"
                >
                  <span>Ver Loja Demonstração</span>
                  <ArrowRight size={16} />
                </Link>
                <a
                  href={`https://wa.me/${process.env.NEXT_PUBLIC_ADMIN_WHATSAPP || '5511999999999'}?text=${encodeURIComponent('Olá! Gostaria de testar o StokFácil na minha loja.')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-semibold text-sm transition-colors"
                >
                  <MessageCircle size={16} className="text-emerald-600" />
                  <span>Falar no WhatsApp</span>
                </a>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 5. Footer */}
      <footer className="mt-auto py-10 border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-slate-600">
          <p className="text-center sm:text-left">
            &copy; {currentYear} StokFácil — Seu estoque no bolso, suas vendas no WhatsApp
          </p>
          <div className="flex items-center gap-6">
            <a href="#planos" className="hover:text-slate-900 transition-colors">
              Planos
            </a>
            <a href="#pedir-acesso" className="hover:text-slate-900 transition-colors">
              Pedir Acesso
            </a>
            <Link href="/loja-carol" className="hover:text-slate-900 transition-colors">
              Loja Demo
            </Link>
          </div>
        </div>
      </footer>

    </main>
  );
}
