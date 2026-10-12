import Link from "next/link";
import { Store, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center">
      <div className="w-full max-w-2xl px-6 py-20 flex flex-col items-center">
        
        {/* Header/Logo */}
        <div className="flex items-center gap-3 mb-16">
          <div className="bg-indigo-600 p-2.5 rounded-xl shadow-sm">
            <Store className="text-white" size={24} />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">StokFácil</span>
        </div>

        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-5">
            Seu estoque no bolso, suas vendas no WhatsApp
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed max-w-lg mx-auto">
            O catálogo digital simples e direto para cadastrar produtos, compartilhar fotos e receber pedidos dos clientes.
          </p>
        </div>

        {/* Demo Card */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm w-full max-w-md">
          <h2 className="text-lg font-bold text-slate-800 mb-2">Ambiente de Demonstração</h2>
          <p className="text-slate-600 mb-8 text-sm leading-relaxed">
            Acesse nossa loja de demonstração para entender como o catálogo funciona na prática.
          </p>
          <Link 
            href="/loja-carol" 
            className="flex items-center justify-center gap-2 w-full bg-indigo-600 text-white px-6 py-3.5 rounded-xl hover:bg-indigo-700 transition-colors font-medium shadow-sm"
          >
            Acessar /loja-carol
            <ArrowRight size={18} />
          </Link>
        </div>

      </div>
      
      {/* Footer */}
      <footer className="mt-auto py-8 text-center text-slate-600 text-sm">
        &copy; {new Date().getFullYear()} StokFácil — Seu estoque no bolso, suas vendas no WhatsApp
      </footer>
    </main>
  );
}
