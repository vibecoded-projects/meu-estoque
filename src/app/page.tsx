import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
      <div className="max-w-md text-center space-y-6">
        <h1 className="text-4xl font-bold text-gray-900">Meu Estoque</h1>
        <p className="text-lg text-gray-600">
          Gerencie o seu catálogo de produtos de forma simples e rápida.
        </p>
        
        <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-2">Como usar?</h2>
          <p className="text-sm text-gray-600 mb-4">
            Acesse o seu namespace pela URL. Por exemplo, criamos um namespace de teste para você.
          </p>
          <Link 
            href="/loja-carol" 
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Acessar /loja-carol
          </Link>
        </div>
      </div>
    </main>
  );
}
