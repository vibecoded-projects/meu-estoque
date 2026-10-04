import Link from "next/link";
import { Package, Store, ArrowRight, ShieldCheck, Zap } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center selection:bg-indigo-100 selection:text-indigo-900">
      <div className="w-full max-w-5xl px-6 py-12 md:py-20 flex flex-col items-center">
        {/* Header/Logo */}
        <div className="flex items-center gap-3 mb-12 md:mb-16">
          <div className="bg-indigo-600 p-2.5 rounded-xl shadow-sm">
            <Package className="text-white" size={26} />
          </div>
          <span className="text-2xl font-bold tracking-tight text-slate-900">Meu Estoque</span>
        </div>

        {/* Hero */}
        <div className="text-center max-w-3xl mb-12 md:mb-16">
          <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight mb-6 leading-[1.1]">
            Catálogos simples, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">vendas rápidas.</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Crie sua vitrine virtual em segundos. Gerencie produtos, fotos e preços de forma fácil, sem sistemas complexos ou burocracia.
          </p>
        </div>

        {/* CTA / Demo Card */}
        <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 max-w-md w-full mb-20 relative overflow-hidden group hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
          <div className="flex justify-center mb-5">
            <div className="bg-indigo-50 p-4 rounded-full group-hover:scale-110 transition-transform duration-300">
              <Store className="text-indigo-600" size={28} />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center text-slate-800 mb-3">Acesse sua Loja</h2>
          <p className="text-center text-slate-500 mb-8 text-sm leading-relaxed">
            Cada negócio possui seu próprio endereço exclusivo. Acesse a loja de demonstração para testar as funcionalidades.
          </p>
          <Link 
            href="/loja-carol" 
            className="flex items-center justify-center gap-2 w-full bg-slate-900 text-white px-6 py-4 rounded-xl hover:bg-slate-800 hover:gap-4 active:scale-[0.98] transition-all font-semibold text-lg shadow-md"
          >
            Acessar /loja-carol
            <ArrowRight size={20} />
          </Link>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 md:gap-8 w-full max-w-4xl">
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center hover:shadow-md transition-shadow">
            <div className="bg-emerald-50 text-emerald-600 p-3.5 rounded-2xl mb-5">
              <Zap size={24} />
            </div>
            <h3 className="font-bold text-lg text-slate-800 mb-3">Rápido e Simples</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Adicione produtos e atualize sua vitrine instantaneamente. A interface foca no que importa.
            </p>
          </div>
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center hover:shadow-md transition-shadow">
            <div className="bg-blue-50 text-blue-600 p-3.5 rounded-2xl mb-5">
              <Package size={24} />
            </div>
            <h3 className="font-bold text-lg text-slate-800 mb-3">Gestão Visual</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Suba múltiplas fotos, adicione descrições detalhadas e marque itens como vendidos num piscar de olhos.
            </p>
          </div>
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center hover:shadow-md transition-shadow">
            <div className="bg-amber-50 text-amber-600 p-3.5 rounded-2xl mb-5">
              <ShieldCheck size={24} />
            </div>
            <h3 className="font-bold text-lg text-slate-800 mb-3">Acesso Seguro</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Sua vitrine é pública para clientes, mas a gestão do estoque é protegida por um PIN exclusivo.
            </p>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="mt-auto py-8 text-center text-slate-400 text-sm font-medium">
        &copy; {new Date().getFullYear()} Meu Estoque. Simplificando vendas.
      </footer>
    </main>
  );
}
