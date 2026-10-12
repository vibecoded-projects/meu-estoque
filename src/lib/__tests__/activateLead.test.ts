import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseCliArgs,
  generatePin,
  buildStoreUrl,
  buildMagicLink,
  buildWhatsAppActivationMessage,
  activateLead,
} from '@/lib/activate-lead';
import { verifyMagicToken } from '@/lib/session';
import type { Lead } from '@/lib/types';

interface QueryRecord {
  table: string;
  operation: 'select' | 'insert' | 'update';
  payload: unknown;
  eqCalls: Array<{ column: string; value: unknown }>;
}

let recordedQueries: QueryRecord[] = [];
let mockExistingLead: Lead | null = null;
let mockExistingNamespace: { id: string; slug: string; name: string } | null = null;
let mockSelectLeadError: { message: string } | null = null;
let mockSelectNsError: { message: string } | null = null;
let mockInsertNsError: { message: string } | null = null;
let mockInsertCodeError: { message: string } | null = null;
let mockUpdateLeadError: { message: string } | null = null;

function createMockSupabaseClient() {
  return {
    from: (table: string) => {
      const record: QueryRecord = {
        table,
        operation: 'select',
        payload: null,
        eqCalls: [],
      };
      recordedQueries.push(record);

      const builder = {
        select: () => {
          return builder;
        },
        insert: (data: unknown) => {
          record.operation = 'insert';
          record.payload = data;
          return builder;
        },
        update: (data: unknown) => {
          record.operation = 'update';
          record.payload = data;
          return builder;
        },
        eq: (column: string, value: unknown) => {
          record.eqCalls.push({ column, value });
          return builder;
        },
        maybeSingle: async () => {
          return builder.executeSingle();
        },
        single: async () => {
          return builder.executeSingle();
        },
        executeSingle: () => {
          if (table === 'leads' && record.operation === 'select') {
            if (mockSelectLeadError) {
              return { data: null, error: mockSelectLeadError };
            }
            const slugEq = record.eqCalls.find((c) => c.column === 'requested_slug');
            if (mockExistingLead && slugEq && slugEq.value === mockExistingLead.requested_slug) {
              return { data: mockExistingLead, error: null };
            }
            return { data: null, error: null };
          }

          if (table === 'namespaces' && record.operation === 'select') {
            if (mockSelectNsError) {
              return { data: null, error: mockSelectNsError };
            }
            const slugEq = record.eqCalls.find((c) => c.column === 'slug');
            if (mockExistingNamespace && slugEq && slugEq.value === mockExistingNamespace.slug) {
              return { data: mockExistingNamespace, error: null };
            }
            return { data: null, error: null };
          }

          if (table === 'namespaces' && record.operation === 'insert') {
            if (mockInsertNsError) {
              return { data: null, error: mockInsertNsError };
            }
            return { data: { id: 'ns-uuid-created-456' }, error: null };
          }

          if (table === 'namespace_codes' && record.operation === 'insert') {
            if (mockInsertCodeError) {
              return { data: null, error: mockInsertCodeError };
            }
            return { data: { id: 'code-uuid-789' }, error: null };
          }

          if (table === 'leads' && record.operation === 'update') {
            if (mockUpdateLeadError) {
              return { data: null, error: mockUpdateLeadError };
            }
            return { data: { id: 'lead-uuid-123' }, error: null };
          }

          return { data: null, error: null };
        },
        then: <TResult1 = unknown, TResult2 = never>(
          onfulfilled?: ((value: { data: unknown; error: unknown }) => TResult1 | PromiseLike<TResult1>) | null,
          onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
        ) => {
          return Promise.resolve(builder.executeSingle()).then(onfulfilled, onrejected);
        },
      };

      return builder;
    },
  };
}

describe('T13 — Ativação de Loja a partir de Lead', () => {
  const sampleLead: Lead = {
    id: 'lead-123',
    contact_name: 'Carol Silva',
    store_name: 'Brechó da Carol',
    requested_slug: 'brecho-da-carol',
    whatsapp: '5511987654321',
    current_inventory_method: 'Caderno',
    status: 'trial_pending',
    created_at: new Date().toISOString(),
    notes: null,
  };

  beforeEach(() => {
    recordedQueries = [];
    mockExistingLead = null;
    mockExistingNamespace = null;
    mockSelectLeadError = null;
    mockSelectNsError = null;
    mockInsertNsError = null;
    mockInsertCodeError = null;
    mockUpdateLeadError = null;
  });

  describe('parseCliArgs — Validação de argumentos da CLI', () => {
    it('lê slug como argumento posicional sem flags', () => {
      const parsed = parseCliArgs(['brecho-da-carol']);
      expect(parsed.slug).toBe('brecho-da-carol');
      expect(parsed.dryRun).toBe(false);
    });

    it('lê slug com flag --dry-run ao final', () => {
      const parsed = parseCliArgs(['brecho-da-carol', '--dry-run']);
      expect(parsed.slug).toBe('brecho-da-carol');
      expect(parsed.dryRun).toBe(true);
    });

    it('lê slug com flag -d (atalho de dry-run) no início', () => {
      const parsed = parseCliArgs(['-d', 'brecho-da-carol']);
      expect(parsed.slug).toBe('brecho-da-carol');
      expect(parsed.dryRun).toBe(true);
    });

    it('lê slug informado via flag --slug <slug>', () => {
      const parsed = parseCliArgs(['--slug', 'loja-sapato', '--dry-run']);
      expect(parsed.slug).toBe('loja-sapato');
      expect(parsed.dryRun).toBe(true);
    });

    it('lê slug informado via flag --slug=<slug>', () => {
      const parsed = parseCliArgs(['--slug=loja-bolsas']);
      expect(parsed.slug).toBe('loja-bolsas');
      expect(parsed.dryRun).toBe(false);
    });

    it('retorna slug vazio quando nenhum argumento é passado', () => {
      const parsed = parseCliArgs([]);
      expect(parsed.slug).toBe('');
      expect(parsed.dryRun).toBe(false);
    });

    it('retorna slug vazio se apenas --dry-run for fornecido', () => {
      const parsed = parseCliArgs(['--dry-run']);
      expect(parsed.slug).toBe('');
      expect(parsed.dryRun).toBe(true);
    });
  });

  describe('generatePin — Geração de PIN de 4 dígitos', () => {
    it('gera PIN com exatamente 4 dígitos numéricos entre 1000 e 9999', () => {
      for (let i = 0; i < 50; i++) {
        const pin = generatePin();
        expect(pin).toMatch(/^\d{4}$/);
        const num = Number.parseInt(pin, 10);
        expect(num).toBeGreaterThanOrEqual(1000);
        expect(num).toBeLessThanOrEqual(9999);
      }
    });
  });

  describe('buildStoreUrl & buildMagicLink — Montagem de URLs', () => {
    it('monta a URL da vitrine com siteUrl padrão', () => {
      const url = buildStoreUrl('brecho-da-carol', 'https://stokfacil.com');
      expect(url).toBe('https://stokfacil.com/brecho-da-carol');
    });

    it('remove barras extras no final do siteUrl e no início do slug', () => {
      const url = buildStoreUrl('/brecho-da-carol/', 'https://stokfacil.com///');
      expect(url).toBe('https://stokfacil.com/brecho-da-carol/');
    });

    it('monta o Magic Link apontando para /[slug]/entrar?token=...', () => {
      const storeUrl = 'https://stokfacil.com/brecho-da-carol';
      const token = 'token-teste-123';
      const magicLink = buildMagicLink(storeUrl, token);
      expect(magicLink).toBe('https://stokfacil.com/brecho-da-carol/entrar?token=token-teste-123');
    });
  });

  describe('buildWhatsAppActivationMessage — Formatação da mensagem', () => {
    it('gera mensagem contendo URL da vitrine, PIN e Magic Link com formatação exata', () => {
      const msg = buildWhatsAppActivationMessage({
        storeUrl: 'https://stokfacil.com/brecho-da-carol',
        pin: '4821',
        magicLink: 'https://stokfacil.com/brecho-da-carol/entrar?token=sample-magic-token',
      });

      expect(msg).toContain('🎉 Sua vitrine StokFácil está pronta!');
      expect(msg).toContain('👉 Link da sua vitrine: https://stokfacil.com/brecho-da-carol');
      expect(msg).toContain('🔐 Seu código PIN de acesso: 4821');
      expect(msg).toContain('⚡ Ou entre com 1 clique (Magic Link): https://stokfacil.com/brecho-da-carol/entrar?token=sample-magic-token');

      // Validação das quebras de linha
      const lines = msg.split('\n');
      expect(lines).toHaveLength(4);
      expect(lines[0]).toBe('🎉 Sua vitrine StokFácil está pronta!');
      expect(lines[1]).toBe('👉 Link da sua vitrine: https://stokfacil.com/brecho-da-carol');
      expect(lines[2]).toBe('🔐 Seu código PIN de acesso: 4821');
      expect(lines[3]).toBe('⚡ Ou entre com 1 clique (Magic Link): https://stokfacil.com/brecho-da-carol/entrar?token=sample-magic-token');
    });
  });

  describe('activateLead — Tratamento de erros e validações', () => {
    it('retorna erro claro quando slug é vazio ou inválido', async () => {
      const client = createMockSupabaseClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await activateLead({ slug: '   ' }, { supabase: client as any });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('INVALID_SLUG');
        expect(result.error).toContain('Slug do lead não fornecido');
      }
      expect(recordedQueries).toHaveLength(0);
    });

    it('retorna erro claro em LEAD_NOT_FOUND quando lead não existe', async () => {
      const client = createMockSupabaseClient();
      mockExistingLead = null; // nenhum lead no banco

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await activateLead({ slug: 'loja-inexistente' }, { supabase: client as any });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('LEAD_NOT_FOUND');
        expect(result.error).toContain('loja-inexistente');
        expect(result.error).toContain('não foi encontrado');
      }

      // Verificou apenas na tabela leads, não tentou gravar nada
      expect(recordedQueries.some((q) => q.operation === 'insert')).toBe(false);
    });

    it('retorna erro claro em NAMESPACE_EXISTS quando o slug já existe em namespaces', async () => {
      const client = createMockSupabaseClient();
      mockExistingLead = sampleLead;
      mockExistingNamespace = {
        id: 'ns-already-here',
        slug: 'brecho-da-carol',
        name: 'Brechó Antigo',
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await activateLead({ slug: 'brecho-da-carol' }, { supabase: client as any });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('NAMESPACE_EXISTS');
        expect(result.error).toContain('Já existe uma loja cadastrada com o slug "brecho-da-carol"');
      }

      // Nenhuma gravação deve ter sido feita
      expect(recordedQueries.some((q) => q.operation === 'insert')).toBe(false);
      expect(recordedQueries.some((q) => q.operation === 'update')).toBe(false);
    });

    it('trata erro de banco de dados na consulta do lead', async () => {
      const client = createMockSupabaseClient();
      mockSelectLeadError = { message: 'Conexão recusada' };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await activateLead({ slug: 'brecho-da-carol' }, { supabase: client as any });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('DATABASE_ERROR');
        expect(result.error).toContain('Conexão recusada');
      }
    });

    it('trata erro de banco de dados na verificação de namespaces', async () => {
      const client = createMockSupabaseClient();
      mockExistingLead = sampleLead;
      mockSelectNsError = { message: 'Timeout ao consultar namespaces' };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await activateLead({ slug: 'brecho-da-carol' }, { supabase: client as any });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('DATABASE_ERROR');
        expect(result.error).toContain('Timeout ao consultar namespaces');
      }
    });
  });

  describe('activateLead — Modo Dry-Run (--dry-run)', () => {
    it('executa simulação completa sem nenhuma gravação no banco de dados', async () => {
      const client = createMockSupabaseClient();
      mockExistingLead = sampleLead;
      mockExistingNamespace = null;

      const fixedNow = new Date('2026-10-15T12:00:00Z');
      const result = await activateLead(
        { slug: 'brecho-da-carol', dryRun: true },
        {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          supabase: client as any,
          siteUrl: 'https://stokfacil.com',
          now: fixedNow,
          generatePinFn: () => '9563',
        }
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.isDryRun).toBe(true);
        expect(result.pin).toBe('9563');
        expect(result.slug).toBe('brecho-da-carol');
        expect(result.storeName).toBe('Brechó da Carol');
        expect(result.whatsapp).toBe('5511987654321');
        expect(result.storeUrl).toBe('https://stokfacil.com/brecho-da-carol');
        expect(result.magicLink).toContain('/brecho-da-carol/entrar?token=');
        expect(result.whatsappMessage).toContain('🔐 Seu código PIN de acesso: 9563');
        expect(result.whatsappMessage).toContain('👉 Link da sua vitrine: https://stokfacil.com/brecho-da-carol');

        // Magic token gerado é válido criptograficamente
        expect(verifyMagicToken(result.magicToken, 'brecho-da-carol')).toBe(true);
      }

      // IMPORTANTE: Garantir que nenhuma query de escrita foi disparada
      const writeQueries = recordedQueries.filter(
        (q) => q.operation === 'insert' || q.operation === 'update'
      );
      expect(writeQueries).toHaveLength(0);
    });
  });

  describe('activateLead — Modo Real (Gravação no Banco)', () => {
    it('cria namespace com trial de 14 dias, insere PIN em namespace_codes e marca lead como converted', async () => {
      const client = createMockSupabaseClient();
      mockExistingLead = sampleLead;
      mockExistingNamespace = null;

      const fixedNow = new Date('2026-10-15T10:00:00Z');
      const expectedTrialExpiresAt = new Date('2026-10-29T10:00:00Z'); // +14 dias

      const result = await activateLead(
        { slug: 'brecho-da-carol', dryRun: false },
        {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          supabase: client as any,
          siteUrl: 'https://stokfacil.com',
          now: fixedNow,
          generatePinFn: () => '7744',
        }
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.isDryRun).toBe(false);
        expect(result.namespaceId).toBe('ns-uuid-created-456');
        expect(result.pin).toBe('7744');
        expect(result.storeUrl).toBe('https://stokfacil.com/brecho-da-carol');
        expect(result.trialExpiresAt.toISOString()).toBe(expectedTrialExpiresAt.toISOString());

        // Magic Token é válido
        expect(verifyMagicToken(result.magicToken, 'brecho-da-carol')).toBe(true);
      }

      // 1. Inserção em namespaces
      const nsInsert = recordedQueries.find(
        (q) => q.table === 'namespaces' && q.operation === 'insert'
      );
      expect(nsInsert).toBeDefined();
      expect(nsInsert?.payload).toEqual({
        name: 'Brechó da Carol',
        slug: 'brecho-da-carol',
        whatsapp: '5511987654321',
        status: 'active',
        plan: 'trial',
        trial_starts_at: fixedNow.toISOString(),
        trial_expires_at: expectedTrialExpiresAt.toISOString(),
      });

      // 2. Inserção em namespace_codes
      const codeInsert = recordedQueries.find(
        (q) => q.table === 'namespace_codes' && q.operation === 'insert'
      );
      expect(codeInsert).toBeDefined();
      expect(codeInsert?.payload).toEqual({
        namespace_id: 'ns-uuid-created-456',
        code: '7744',
      });

      // 3. Atualização de status em leads
      const leadUpdate = recordedQueries.find(
        (q) => q.table === 'leads' && q.operation === 'update'
      );
      expect(leadUpdate).toBeDefined();
      expect(leadUpdate?.payload).toEqual({
        status: 'converted',
      });
      expect(leadUpdate?.eqCalls).toContainEqual({
        column: 'id',
        value: 'lead-123',
      });
    });

    it('retorna erro se a inserção em namespaces falhar', async () => {
      const client = createMockSupabaseClient();
      mockExistingLead = sampleLead;
      mockExistingNamespace = null;
      mockInsertNsError = { message: 'Erro ao inserir namespace' };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await activateLead({ slug: 'brecho-da-carol' }, { supabase: client as any });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('DATABASE_ERROR');
        expect(result.error).toContain('Erro ao criar namespace da loja');
      }

      // Não deve prosseguir para namespace_codes nem leads
      expect(recordedQueries.some((q) => q.table === 'namespace_codes')).toBe(false);
      expect(recordedQueries.some((q) => q.table === 'leads' && q.operation === 'update')).toBe(false);
    });

    it('retorna erro se a inserção em namespace_codes falhar', async () => {
      const client = createMockSupabaseClient();
      mockExistingLead = sampleLead;
      mockExistingNamespace = null;
      mockInsertCodeError = { message: 'Erro ao inserir PIN' };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await activateLead({ slug: 'brecho-da-carol' }, { supabase: client as any });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('DATABASE_ERROR');
        expect(result.error).toContain('Erro ao salvar código PIN');
      }

      // Não deve atualizar o lead se o PIN falhou
      expect(recordedQueries.some((q) => q.table === 'leads' && q.operation === 'update')).toBe(false);
    });

    it('retorna erro se a atualização do status do lead falhar', async () => {
      const client = createMockSupabaseClient();
      mockExistingLead = sampleLead;
      mockExistingNamespace = null;
      mockUpdateLeadError = { message: 'Erro ao atualizar lead' };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await activateLead({ slug: 'brecho-da-carol' }, { supabase: client as any });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('DATABASE_ERROR');
        expect(result.error).toContain('Erro ao atualizar status do lead');
      }
    });
  });
});
