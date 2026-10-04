import { supabaseAdmin } from '@/lib/supabase';
import { checkAuth } from '@/app/actions';
import { notFound } from 'next/navigation';
import { ItemList } from '@/components/ItemList';

export const revalidate = 0; // Para garantir que os dados estejam sempre atualizados no SSR inicial se precisarmos

export default async function NamespacePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // 1. Buscar o namespace
  const { data: namespace, error } = await supabaseAdmin
    .from('namespaces')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !namespace) {
    notFound();
  }

  // 2. Verificar se o usuário atual (cookie) está autenticado para edição
  const isAuthenticated = await checkAuth(slug);

  // 3. Buscar os itens do namespace
  const { data: items } = await supabaseAdmin
    .from('items')
    .select('*')
    .eq('namespace_id', namespace.id)
    .order('created_at', { ascending: false });

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{namespace.name || slug}</h1>
            <p className="text-sm text-gray-500 mt-1">Catálogo de produtos</p>
          </div>
          {/* O componente ItemList vai gerenciar o botão de "Gerenciar" e os modais */}
        </header>

        <ItemList 
          initialItems={items || []} 
          slug={slug} 
          isAuthenticated={isAuthenticated} 
        />
      </div>
    </main>
  );
}
