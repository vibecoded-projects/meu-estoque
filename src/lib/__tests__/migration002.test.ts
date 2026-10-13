import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Migração 002 — Políticas de Segurança do Storage (RNF06 / D7)', () => {
  let db: PGlite;

  const baseSchemaSql = fs.readFileSync(
    path.join(__dirname, 'fixtures/base-schema.sql'),
    'utf-8'
  );

  const migration001Sql = fs.readFileSync(
    path.join(process.cwd(), 'supabase/migrations/001_stokfacil_base.sql'),
    'utf-8'
  );

  const migration002Sql = fs.readFileSync(
    path.join(process.cwd(), 'supabase/migrations/002_storage_policies.sql'),
    'utf-8'
  );

  beforeEach(async () => {
    db = new PGlite();
    // 1. Aplica schema inicial base
    await db.exec(baseSchemaSql);
    // 2. Aplica migração 001
    await db.exec(migration001Sql);

    // 3. Simula scaffolding nativo do Supabase (schema storage, role service_role e RLS nativo)
    // No Supabase real, estas estruturas são gerenciadas internamente e já existem quando o SQL Editor é executado.
    await db.exec(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
          CREATE ROLE service_role;
        END IF;
      END $$;

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
      INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', false)
      ON CONFLICT (id) DO NOTHING;

      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

      -- Simula políticas legadas permissivas pré-existentes
      CREATE POLICY "Public Access" 
      ON storage.objects FOR SELECT 
      USING (bucket_id = 'product-images');

      CREATE POLICY "Enable insert for authenticated users only"
      ON storage.objects FOR INSERT 
      WITH CHECK (bucket_id = 'product-images');
    `);
  });

  afterEach(async () => {
    await db.close();
  });

  it('aplica a migração 002 duas vezes consecutivas sem erro (idempotência)', async () => {
    // 1ª execução
    await expect(db.exec(migration002Sql)).resolves.toBeDefined();

    // 2ª execução (deve passar sem falhas e sem duplicidade)
    await expect(db.exec(migration002Sql)).resolves.toBeDefined();
  });

  it('remove a policy permissiva legada de inserção anônima', async () => {
    await db.exec(migration002Sql);

    const res = await db.query<{ policyname: string }>(`
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname = 'Enable insert for authenticated users only';
    `);

    expect(res.rows).toHaveLength(0);
  });

  it('configura policy de INSERT restrita ao papel service_role para product-images', async () => {
    await db.exec(migration002Sql);

    const res = await db.query<{ policyname: string; cmd: string; roles: string }>(`
      SELECT policyname, cmd, roles
      FROM pg_policies
      WHERE schemaname = 'storage'
        AND tablename = 'objects'
        AND cmd = 'INSERT';
    `);

    expect(res.rows.length).toBeGreaterThanOrEqual(1);
    const insertPolicy = res.rows.find(
      (r) => r.policyname === 'Upload restrito via service_role em product-images'
    );
    expect(insertPolicy).toBeDefined();
    expect(insertPolicy?.cmd).toBe('INSERT');
    expect(insertPolicy?.roles).toContain('service_role');
  });

  it('mantém policy pública de SELECT para que imagens continuem visíveis aos visitantes', async () => {
    await db.exec(migration002Sql);

    const res = await db.query<{ policyname: string; cmd: string; roles: string }>(`
      SELECT policyname, cmd, roles
      FROM pg_policies
      WHERE schemaname = 'storage'
        AND tablename = 'objects'
        AND cmd = 'SELECT';
    `);

    expect(res.rows.length).toBeGreaterThanOrEqual(1);
    const selectPolicy = res.rows.find(
      (r) => r.policyname === 'Leitura pública de imagens em product-images'
    );
    expect(selectPolicy).toBeDefined();
    expect(selectPolicy?.cmd).toBe('SELECT');
    expect(selectPolicy?.roles).toContain('public');
  });

  it('garante que o bucket product-images está configurado como público para download/leitura', async () => {
    await db.exec(migration002Sql);

    const res = await db.query<{ id: string; public: boolean }>(`
      SELECT id, public
      FROM storage.buckets
      WHERE id = 'product-images';
    `);

    expect(res.rows).toHaveLength(1);
    expect(res.rows[0].public).toBe(true);
  });

  it('garante que o arquivo da migração não contém DDLs restritas ou perigosas no schema storage', () => {
    // No Supabase real, o usuário 'postgres' do SQL Editor não é owner do schema storage nem superuser.
    // DDLs como CREATE TABLE, CREATE SCHEMA, CREATE ROLE e ENABLE ROW LEVEL SECURITY causam erro 42501 (permission denied).
    expect(migration002Sql).not.toMatch(/\bCREATE\s+SCHEMA\b/i);
    expect(migration002Sql).not.toMatch(/\bCREATE\s+TABLE\b/i);
    expect(migration002Sql).not.toMatch(/\bCREATE\s+ROLE\b/i);
    expect(migration002Sql).not.toMatch(/\bENABLE\s+ROW\s+LEVEL\s+SECURITY\b/i);
  });
});
