import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Migração 001 — StokFácil Base', () => {
  let db: PGlite;

  const baseSchemaSql = fs.readFileSync(
    path.join(__dirname, 'fixtures/base-schema.sql'),
    'utf-8'
  );

  const migrationSql = fs.readFileSync(
    path.join(process.cwd(), 'supabase/migrations/001_stokfacil_base.sql'),
    'utf-8'
  );

  beforeEach(async () => {
    db = new PGlite();
    // Aplica schema inicial
    await db.exec(baseSchemaSql);
    // Insere loja pré-existente
    await db.exec(`
      INSERT INTO namespaces (id, slug, name) 
      VALUES ('d834a8e6-7643-41bb-98f5-171b12b55f11', 'loja-carol', 'Loja da Carol');
    `);
  });

  afterEach(async () => {
    await db.close();
  });

  it('aplica a migração 001 duas vezes sem erro (idempotência)', async () => {
    // 1ª execução
    await expect(db.exec(migrationSql)).resolves.toBeDefined();

    // 2ª execução (deve passar sem falhas)
    await expect(db.exec(migrationSql)).resolves.toBeDefined();
  });

  it('atribui defaults esperados para loja pré-existente', async () => {
    await db.exec(migrationSql);

    const res = await db.query<Record<string, unknown>>(`
      SELECT slug, status, plan, trial_starts_at, trial_expires_at, trial_extended, activation_completed, is_whitelabel, plan_expires_at, first_shared_at
      FROM namespaces
      WHERE slug = 'loja-carol'
    `);

    expect(res.rows).toHaveLength(1);
    const carol = res.rows[0];
    expect(carol.status).toBe('active');
    expect(carol.plan).toBe('trial');
    expect(carol.trial_extended).toBe(false);
    expect(carol.activation_completed).toBe(false);
    expect(carol.is_whitelabel).toBe(false);
    expect(carol.plan_expires_at).toBeNull();
    expect(carol.first_shared_at).toBeNull();

    // trial_expires_at ≈ now + 14 dias
    expect(carol.trial_expires_at).toBeDefined();
    const trialExp = new Date(carol.trial_expires_at as string);
    const now = new Date();
    const diffDays = (trialExp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThan(13);
    expect(diffDays).toBeLessThan(15);
  });

  it('rejeita plan inválido via CHECK constraint', async () => {
    await db.exec(migrationSql);

    await expect(
      db.exec(`
        INSERT INTO namespaces (slug, name, plan)
        VALUES ('loja-invalida', 'Loja Inválida', 'plano_inexistente');
      `)
    ).rejects.toThrow();
  });

  it('rejeita status grace via CHECK constraint', async () => {
    await db.exec(migrationSql);

    await expect(
      db.exec(`
        INSERT INTO namespaces (slug, name, status)
        VALUES ('loja-grace', 'Loja Grace', 'grace');
      `)
    ).rejects.toThrow();
  });

  it('garante unicidade de leads.requested_slug', async () => {
    await db.exec(migrationSql);

    await db.exec(`
      INSERT INTO leads (contact_name, store_name, requested_slug, whatsapp)
      VALUES ('Maria', 'Loja Maria', 'loja-maria', '11999999999');
    `);

    await expect(
      db.exec(`
        INSERT INTO leads (contact_name, store_name, requested_slug, whatsapp)
        VALUES ('Outro', 'Outra Loja', 'loja-maria', '11888888888');
      `)
    ).rejects.toThrow();
  });

  it('habilita RLS nas 4 tabelas do sistema', async () => {
    await db.exec(migrationSql);

    const res = await db.query<{ relname: string; relrowsecurity: boolean }>(`
      SELECT relname, relrowsecurity
      FROM pg_class
      WHERE relname IN ('namespaces', 'items', 'leads', 'namespace_codes')
        AND relnamespace = 'public'::regnamespace;
    `);

    expect(res.rows).toHaveLength(4);
    for (const row of res.rows) {
      expect(row.relrowsecurity).toBe(true);
    }
  });

  it('não possui políticas públicas em leads e namespace_codes', async () => {
    await db.exec(migrationSql);

    const res = await db.query<{ tablename: string; policyname: string }>(`
      SELECT tablename, policyname
      FROM pg_policies
      WHERE tablename IN ('leads', 'namespace_codes');
    `);

    expect(res.rows).toHaveLength(0);
  });

  it('possui políticas públicas de SELECT em namespaces e items', async () => {
    await db.exec(migrationSql);

    const res = await db.query<{ tablename: string; policyname: string; cmd: string }>(`
      SELECT tablename, policyname, cmd
      FROM pg_policies
      WHERE tablename IN ('namespaces', 'items');
    `);

    const policies = res.rows.map(r => ({ table: r.tablename, name: r.policyname, cmd: r.cmd }));
    expect(policies).toContainEqual({
      table: 'namespaces',
      name: 'Leitura pública de namespaces ativos',
      cmd: 'SELECT',
    });
    expect(policies).toContainEqual({
      table: 'items',
      name: 'Leitura pública de itens da loja ativa',
      cmd: 'SELECT',
    });
  });
});
