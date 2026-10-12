import type { Metadata } from 'next';
import { cache } from 'react';
import { supabaseAdmin } from '@/lib/supabase';
import { checkAuth } from '@/app/actions';
import { notFound } from 'next/navigation';
import { ItemList } from '@/components/ItemList';
import { StoreFooter } from '@/components/store/StoreFooter';
import { getStoreLifecycle } from '@/lib/lifecycle';
import type { Namespace } from '@/lib/types';

export const revalidate = 0; // Para garantir que os dados estejam sempre atualizados no SSR inicial se precisarmos

interface PageProps {
  params: Promise<{ slug: string }>;
}

const getNamespace = cache(async (slug: string): Promise<Namespace | null> => {
  const { data: namespace, error } = await supabaseAdmin
    .from('namespaces')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !namespace) {
    return null;
  }
  return namespace as Namespace;
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const namespace = await getNamespace(slug);

  if (!namespace) {
    return {
      title: 'Loja não encontrada | StokFácil',
      description: 'A vitrine solicitada não foi encontrada no StokFácil.',
    };
  }

  const storeName = namespace.name?.trim() || slug;
  const description =
    namespace.subtitle?.trim() ||
    `Confira o catálogo de produtos de ${storeName} no StokFácil e faça seu pedido direto no WhatsApp.`;

  return {
    title: `${storeName} | StokFácil`,
    description,
    openGraph: {
      title: `${storeName} | StokFácil`,
      description,
      type: 'website',
      images: namespace.logo_url ? [{ url: namespace.logo_url }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${storeName} | StokFácil`,
      description,
      images: namespace.logo_url ? [namespace.logo_url] : undefined,
    },
  };
}

export default async function NamespacePage({ params }: PageProps) {
  const { slug } = await params;
  const namespace = await getNamespace(slug);

  if (!namespace) {
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

  // 4. Calcular o ciclo de vida da loja para alertas e renovação
  const lifecycle = getStoreLifecycle(namespace);

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8 flex flex-col justify-between">
      <div className="max-w-4xl mx-auto space-y-6 w-full">
        <ItemList 
          initialItems={items || []} 
          slug={slug} 
          isAuthenticated={isAuthenticated} 
          namespace={namespace}
          lifecycle={lifecycle}
        />
      </div>
      <StoreFooter isWhiteLabel={namespace.is_whitelabel} />
    </main>
  );
}
