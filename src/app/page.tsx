import Link from "next/link";
import { Hero } from "@/components/landing/Hero";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { LeadCaptureForm } from "@/components/landing/LeadCaptureForm";

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

      {/* 4. Access Request Section (T11 Lead Capture Form) */}
      <section id="pedir-acesso" className="w-full py-16 md:py-24 bg-slate-50 border-t border-slate-200 scroll-mt-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
              Comece agora sua vitrine digital StokFácil
            </h2>
            <p className="text-base sm:text-lg text-slate-600 max-w-xl mx-auto leading-relaxed">
              Tenha seu catálogo pronto no celular, compartilhe nas redes sociais e receba pedidos organizados no WhatsApp. Sem necessidade de cartão de crédito.
            </p>
          </div>

          <LeadCaptureForm />
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
            <Link href="/explorar" className="hover:text-slate-900 transition-colors">
              Explorar Lojas
            </Link>
          </div>
        </div>
      </footer>

    </main>
  );
}
