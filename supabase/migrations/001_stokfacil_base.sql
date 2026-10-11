-- ==============================================================================
-- StokFácil — Migração 001: Schema Base, Ciclo de Vida e Segurança (RLS)
-- ==============================================================================
-- IMPORTANTE:
--   1. Este script deve ser aplicado MANUALMENTE pelo dono do projeto através do
--      SQL Editor do Supabase (Decisão D7).
--   2. Este script é 100% IDEMPOTENTE: pode ser reexecutado múltiplas vezes
--      sem erro e sem corromper ou duplicar estruturas/dados existentes.
--
-- ATENÇÃO PARA LOJAS EXISTENTES (ex.: 'loja-carol'):
--   Ao aplicar esta migração, lojas que já existiam no banco receberão os
--   valores padrão de trial (status = 'active', plan = 'trial', trial_expires_at = now() + 14 dias).
--   Caso deseje promover uma loja pré-existente para um plano pago sem expiração
--   de trial (ex.: plano anual com validade de 1 ano), execute manualmente:
--
--   UPDATE public.namespaces
--   SET plan = 'annual',
--       plan_expires_at = timezone('utc'::text, now()) + interval '1 year'
--   WHERE slug = 'loja-carol';
-- ==============================================================================

-- ==============================================================================
-- 1. TABELA DE LEADS (Captura de novos lojistas na Home)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_name TEXT NOT NULL,
    store_name TEXT NOT NULL,
    requested_slug TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    current_inventory_method TEXT,
    status TEXT NOT NULL DEFAULT 'trial_pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    notes TEXT,
    CONSTRAINT uq_leads_requested_slug UNIQUE (requested_slug)
);

-- Constraint CHECK para status de leads (idempotente)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_leads_status'
          AND conrelid = 'public.leads'::regclass
    ) THEN
        ALTER TABLE public.leads
            ADD CONSTRAINT chk_leads_status
            CHECK (status IN ('trial_pending', 'active', 'rejected', 'converted'));
    END IF;
END $$;

-- Índice para buscas por WhatsApp em leads
CREATE INDEX IF NOT EXISTS idx_leads_whatsapp ON public.leads(whatsapp);

-- Nota de Performance:
-- O índice 'idx_leads_requested_slug' (proposto no rascunho original) foi omitido propositalmente,
-- pois a restrição UNIQUE 'uq_leads_requested_slug' já cria automaticamente um índice B-Tree
-- exclusivo para a coluna 'requested_slug'. Um índice adicional seria 100% redundante.


-- ==============================================================================
-- 2. AJUSTES NA TABELA NAMESPACES (Lojas)
-- ==============================================================================
ALTER TABLE public.namespaces 
    ADD COLUMN IF NOT EXISTS whatsapp TEXT,
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'trial',
    ADD COLUMN IF NOT EXISTS trial_starts_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMPTZ DEFAULT (timezone('utc'::text, now()) + interval '14 days'),
    ADD COLUMN IF NOT EXISTS trial_extended BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS activation_completed BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_whitelabel BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS instagram_handle TEXT,
    ADD COLUMN IF NOT EXISTS logo_url TEXT,
    ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS first_shared_at TIMESTAMPTZ;

-- Garantir restrição de unicidade no slug da loja sem duplicar restrições existentes:
-- A tabela criada originalmente em supabase-schema.sql já possui 'slug TEXT UNIQUE NOT NULL',
-- o que gera a constraint automática 'namespaces_slug_key'.
-- Verificamos se já existe QUALQUER constraint UNIQUE na coluna 'slug' antes de adicionar 'uq_namespaces_slug'.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
        WHERE c.conrelid = 'public.namespaces'::regclass
          AND c.contype = 'u'
          AND a.attname = 'slug'
    ) THEN
        ALTER TABLE public.namespaces ADD CONSTRAINT uq_namespaces_slug UNIQUE (slug);
    END IF;
END $$;

-- Nota de Performance:
-- O índice 'idx_namespaces_slug' presente no blueprint original foi omitido propositalmente,
-- pois a coluna 'slug' já possui constraint UNIQUE ('namespaces_slug_key' ou 'uq_namespaces_slug'),
-- e o PostgreSQL cria automaticamente um índice B-Tree subjacente para toda restrição UNIQUE.
-- Um índice explícito 'idx_namespaces_slug' seria redundante e gastaria memória/IO desnecessários.

CREATE INDEX IF NOT EXISTS idx_namespaces_trial_expires ON public.namespaces(trial_expires_at);

-- Constraint CHECK para status de namespaces (idempotente)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_namespaces_status'
          AND conrelid = 'public.namespaces'::regclass
    ) THEN
        ALTER TABLE public.namespaces
            ADD CONSTRAINT chk_namespaces_status
            CHECK (status IN ('active', 'trial_grace_period', 'paused', 'blocked'));
    END IF;
END $$;

-- Constraint CHECK para plano de namespaces (idempotente)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_namespaces_plan'
          AND conrelid = 'public.namespaces'::regclass
    ) THEN
        ALTER TABLE public.namespaces
            ADD CONSTRAINT chk_namespaces_plan
            CHECK (plan IN ('trial', 'monthly', 'quarterly', 'semiannual', 'annual'));
    END IF;
END $$;


-- ==============================================================================
-- 3. AJUSTES NA TABELA ITEMS
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_items_namespace_created ON public.items(namespace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_is_sold ON public.items(namespace_id, is_sold);


-- ==============================================================================
-- 4. POLÍTICAS DE SEGURANÇA (ROW LEVEL SECURITY - RLS)
-- ==============================================================================
-- Habilita RLS em todas as tabelas
ALTER TABLE public.namespaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.namespace_codes ENABLE ROW LEVEL SECURITY;

-- Limpeza idempotente de políticas anteriores caso já tenham sido aplicadas
DROP POLICY IF EXISTS "Leitura pública de namespaces ativos" ON public.namespaces;
DROP POLICY IF EXISTS "Leitura pública de itens da loja ativa" ON public.items;
DROP POLICY IF EXISTS "Inserção pública de novos leads" ON public.leads;

-- Leitura pública para vitrines ativas ou em período de tolerância
CREATE POLICY "Leitura pública de namespaces ativos"
    ON public.namespaces FOR SELECT
    USING (status IN ('active', 'trial_grace_period'));

-- Leitura pública de itens de lojas ativas ou em período de tolerância
CREATE POLICY "Leitura pública de itens da loja ativa"
    ON public.items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.namespaces ns 
            WHERE ns.id = items.namespace_id 
            AND ns.status IN ('active', 'trial_grace_period')
        )
    );

-- Nota sobre 'leads' e 'namespace_codes':
-- NENHUMA política de acesso público (anon) é concedida para 'public.leads' ou 'public.namespace_codes'.
-- Com o RLS habilitado e sem políticas públicas, qualquer tentativa de consulta ou inserção anônima
-- diretamente pelo client Supabase (anon key) será rejeitada.
-- O acesso deve ser realizado exclusivamente pelas Server Actions no backend através do cliente com
-- Service Role ('supabaseAdmin'), que possui a permissão BYPASSRLS (Decisão D6).
