-- Tabela de Namespaces (Lojas/Catálogos)
CREATE TABLE namespaces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL, -- Ex: 'minha-loja' (usado na URL)
  name TEXT,                 -- Nome de exibição (opcional)
  subtitle TEXT,             -- Subtítulo/Descrição da loja (opcional)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Códigos de Autorização
CREATE TABLE namespace_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  namespace_id UUID REFERENCES namespaces(id) ON DELETE CASCADE,
  code VARCHAR(4) NOT NULL,  -- Código de 4 dígitos
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Itens (Produtos)
CREATE TABLE items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  namespace_id UUID REFERENCES namespaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  image_url TEXT,            -- URL da foto armazenada no Supabase Storage
  is_sold BOOLEAN DEFAULT FALSE, -- Status de vendido
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configurações de Storage
-- Certifique-se de habilitar o Storage e criar o bucket manualmente caso não utilize RLS abaixo.
-- Criando o bucket
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true);

-- Políticas do Storage para o bucket 'product-images'
-- O acesso será público para leitura, mas a escrita será feita através do servidor (Service Role)
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'product-images');

CREATE POLICY "Enable insert for authenticated users only"
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'product-images'); -- Se for usar a anon key ou autenticação. Usando Service Role bypassa isso.

-- Desabilitando o RLS nas tabelas, já que o controle de acesso será feito via Backend (Server Actions) com Service Role.
-- Caso queira mais segurança, pode habilitar o RLS e usar tokens JWT, mas para simplicidade manteremos assim.
ALTER TABLE namespaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE namespace_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE items DISABLE ROW LEVEL SECURITY;

-- Dados de exemplo
INSERT INTO namespaces (id, slug, name) VALUES ('d834a8e6-7643-41bb-98f5-171b12b55f11', 'loja-carol', 'Loja da Carol');
INSERT INTO namespace_codes (namespace_id, code) VALUES ('d834a8e6-7643-41bb-98f5-171b12b55f11', '9563');
INSERT INTO items (namespace_id, title, description, price) VALUES ('d834a8e6-7643-41bb-98f5-171b12b55f11', 'Produto Teste', 'Descrição do produto teste', 99.90);
