-- ==============================================================================
-- StokFácil — Migração 002: Políticas de Segurança do Storage (RNF06 / D7)
-- ==============================================================================
-- IMPORTANTE:
--   1. Este script deve ser aplicado MANUALMENTE pelo dono do projeto através do
--      SQL Editor do Supabase (Decisão D7).
--   2. Este script é 100% IDEMPOTENTE: pode ser reexecutado múltiplas vezes
--      sem erro e sem corromper ou duplicar estruturas/dados existentes.
--   3. Remove políticas permissivas que permitiam INSERT anônimo (anon key).
--   4. Restringe a inserção de imagens no bucket 'product-images' exclusivamente
--      ao papel 'service_role' (utilizado pelo backend para gerar URLs assinadas).
--   5. Garante política pública de SELECT para que visitantes e clientes
--      continuem visualizando as fotos dos produtos na vitrine.
-- ==============================================================================

-- 1. Assegurar schema 'storage' e tabelas de suporte (idempotência no Supabase e PGlite)
CREATE SCHEMA IF NOT EXISTS storage;

CREATE TABLE IF NOT EXISTS storage.buckets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS storage.objects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket_id TEXT REFERENCES storage.buckets(id),
    name TEXT,
    owner UUID,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    last_accessed_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    metadata JSONB
);

-- 2. Assegurar a existência do papel 'service_role' (nativo no Supabase; suporte ao PGlite)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role;
    END IF;
END $$;

-- 3. Assegurar que o bucket 'product-images' existe e é público para leitura
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 4. Habilitar Row Level Security (RLS) na tabela de objetos do Storage
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 5. Remover qualquer política permissiva ou anterior de INSERT e SELECT no bucket
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Public Access Insert" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon uploads" ON storage.objects;
DROP POLICY IF EXISTS "product-images insert policy" ON storage.objects;
DROP POLICY IF EXISTS "Upload restrito via service_role em product-images" ON storage.objects;
DROP POLICY IF EXISTS "Leitura pública de imagens em product-images" ON storage.objects;

-- 6. Política de INSERT: restrita exclusivamente ao papel service_role
-- As imagens são enviadas exclusivamente via URLs assinadas geradas pelo servidor (supabaseAdmin).
CREATE POLICY "Upload restrito via service_role em product-images"
ON storage.objects
FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'product-images');

-- 7. Política de SELECT: pública para que visitantes vejam as fotos na vitrine
CREATE POLICY "Leitura pública de imagens em product-images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'product-images');
