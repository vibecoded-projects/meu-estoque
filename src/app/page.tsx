import Link from "next/link";
import { Package, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center">
      <div className="w-full max-w-2xl px-6 py-20 flex flex-col items-center">
        
        {/* Header/Logo */}
        <div className="flex items-center gap-3 mb-16">
          <div className="bg-slate-800 p-2.5 rounded-xl shadow-sm">
            <Package className="text-white" size={24} />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">Meu Estoque</span>
        </div>

        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-5">
            O catálogo da sua loja.
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed max-w-lg mx-auto">
            Uma forma simples e direta de cadastrar, gerenciar fotos e compartilhar seus produtos com os clientes.
          </p>
        </div>

        {/* Demo Card */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm w-full max-w-md">
          <h2 className="text-lg font-bold text-slate-800 mb-2">Ambiente de Teste</h2>
          <p className="text-slate-500 mb-8 text-sm leading-relaxed">
            Acesse nossa loja de demonstração para entender como o sistema funciona na prática.
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
      <footer className="mt-auto py-8 text-center text-slate-400 text-sm">
        &copy; {new Date().getFullYear()} Meu Estoque
      </footer>
    </main>
  );
}
