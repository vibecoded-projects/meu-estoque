-- ==============================================================================
-- StokFácil — Migração 002: Políticas de Segurança do Storage (RNF06 / D7)
-- ==============================================================================
-- IMPORTANTE:
--   1. Este script deve ser aplicado MANUALMENTE pelo dono do projeto através do
--      SQL Editor do Supabase (Decisão D7).
--   2. Este script é 100% IDEMPOTENTE: pode ser reexecutado múltiplas vezes
--      sem erro e sem corromper ou duplicar estruturas/dados existentes.
--   3. Este script assume o ambiente Supabase real: o schema storage, as tabelas
--      storage.buckets, storage.objects (com RLS já nativo) e o papel service_role
--      já existem no banco gerenciado. Este script não executa DDLs estruturais
--      no schema storage para evitar erro de permissão 42501 do usuário postgres.
--   4. Remove políticas permissivas que permitiam INSERT anônimo (anon key).
--   5. Restringe a inserção de imagens no bucket 'product-images' exclusivamente
--      ao papel 'service_role' (utilizado pelo backend para gerar URLs assinadas).
--   6. Garante política pública de SELECT para que visitantes e clientes
--      continuem visualizando as fotos dos produtos na vitrine.
-- ==============================================================================

-- 1. Assegurar que o bucket 'product-images' existe e é público para leitura
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Remover qualquer política permissiva ou anterior de INSERT e SELECT no bucket
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Public Access Insert" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon uploads" ON storage.objects;
DROP POLICY IF EXISTS "product-images insert policy" ON storage.objects;
DROP POLICY IF EXISTS "Upload restrito via service_role em product-images" ON storage.objects;
DROP POLICY IF EXISTS "Leitura pública de imagens em product-images" ON storage.objects;

-- 3. Política de INSERT: restrita exclusivamente ao papel service_role
-- As imagens são enviadas exclusivamente via URLs assinadas geradas pelo servidor (supabaseAdmin).
CREATE POLICY "Upload restrito via service_role em product-images"
ON storage.objects
FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'product-images');

-- 4. Política de SELECT: pública para que visitantes vejam as fotos na vitrine
CREATE POLICY "Leitura pública de imagens em product-images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'product-images');
