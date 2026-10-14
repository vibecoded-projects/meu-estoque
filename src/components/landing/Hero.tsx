"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, ShieldCheck, CreditCard, Store } from "lucide-react";

export function Hero() {
  const handleScrollToAccess = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById("pedir-acesso");
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth" });
      window.history.pushState(null, "", "#pedir-acesso");
    }
  };

  return (
    <section className="w-full pt-12 pb-16 md:pt-20 md:pb-24 flex flex-col items-center">
      {/* Brand Header */}
      <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 mb-8 shadow-xs">
        <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
          <Store size={18} />
        </div>
        <span className="text-sm font-bold tracking-tight text-indigo-900">StokFácil</span>
        <span className="text-indigo-400 font-semibold">·</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700">Vitrine Digital</span>
      </div>

      {/* Main Title / Slogan */}
      <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight text-center max-w-4xl leading-[1.15] mb-6">
        Seu estoque no bolso, suas vendas no WhatsApp
      </h1>

      {/* Subtitle */}
      <p className="text-base sm:text-lg md:text-xl text-slate-600 max-w-2xl mx-auto text-center leading-relaxed mb-8">
        O catálogo digital simples e direto para pequenos lojistas, brechós e autônomos organizarem produtos, compartilharem fotos no Instagram e receberem pedidos prontos no WhatsApp.
      </p>

      {/* Benefit Badges */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-4 mb-10 text-xs sm:text-sm font-medium">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
          <Sparkles size={15} className="text-emerald-600" />
          <span>14 dias grátis</span>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200">
          <ShieldCheck size={15} className="text-sky-600" />
          <span>Sem mensalidade inicial</span>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
          <CreditCard size={15} className="text-purple-600" />
          <span>Sem cartão de crédito</span>
        </div>
      </div>

      {/* CTAs */}
      <div className="w-full max-w-md flex flex-col sm:flex-row items-center justify-center gap-3.5 px-4">
        <a
          href="#pedir-acesso"
          onClick={handleScrollToAccess}
          className="flex items-center justify-center gap-2 w-full sm:w-auto px-7 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-base shadow-sm hover:shadow transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <span>Pedir acesso grátis</span>
          <ArrowRight size={18} />
        </a>

        <Link
          href="/explorar"
          className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-semibold text-base transition-all focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 shadow-2xs"
        >
          <span>Explorar vitrines modelo</span>
          <ArrowRight size={17} className="text-slate-500" />
        </Link>
      </div>
    </section>
  );
}
