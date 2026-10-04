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
        <ItemList 
          initialItems={items || []} 
          slug={slug} 
          isAuthenticated={isAuthenticated} 
          namespace={namespace}
        />
      </div>
    </main>
  );
}
