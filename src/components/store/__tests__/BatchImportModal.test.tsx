import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BatchImportModal, removeLineFromText } from '../BatchImportModal';
import { parseBatch } from '@/lib/batchParser';

vi.mock('@/app/actions/batch', () => ({
  createItemsBatch: vi.fn(),
}));

describe('BatchImportModal — Modal de Importação em Lote (T18 / RF06)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Função utilitária removeLineFromText', () => {
    it('remove a primeira linha do texto corretamente', () => {
      const text = 'Linha 1\nLinha 2\nLinha 3';
      const result = removeLineFromText(text, 1);
      expect(result).toBe('Linha 2\nLinha 3');
    });

    it('remove uma linha intermediária do texto preservando as demais', () => {
      const text = 'Vestido floral 89,90\nCalça sem preço\nBlusa linho 45,00';
      const result = removeLineFromText(text, 2);
      expect(result).toBe('Vestido floral 89,90\nBlusa linho 45,00');
    });

    it('remove a última linha do texto', () => {
      const text = 'Item A 10\nItem B 20\nItem C 30';
      const result = removeLineFromText(text, 3);
      expect(result).toBe('Item A 10\nItem B 20');
    });

    it('retorna texto inalterado se lineNumber for inválido ou fora do intervalo', () => {
      const text = 'Item A 10\nItem B 20';
      expect(removeLineFromText(text, 0)).toBe(text);
      expect(removeLineFromText(text, 99)).toBe(text);
      expect(removeLineFromText('', 1)).toBe('');
    });
  });

  describe('Renderização e Estrutura do Modal', () => {
    it('não renderiza nada quando isOpen é false', () => {
      const html = renderToStaticMarkup(
        <BatchImportModal
          isOpen={false}
          slug="loja-carol"
          onClose={vi.fn()}
        />
      );
      expect(html).toBe('');
    });

    it('renderiza título, textarea com placeholder e botões quando isOpen é true', () => {
      const html = renderToStaticMarkup(
        <BatchImportModal
          isOpen={true}
          slug="loja-carol"
          onClose={vi.fn()}
        />
      );

      expect(html).toContain('Importação em lote');
      expect(html).toContain('Cadastre várias peças colando texto ou anotações informais');
      expect(html).toContain('id="batch-textarea"');
      expect(html).toContain('Vestido floral 89,90');
      expect(html).toContain('Calça jeans 120,00');
      expect(html).toContain('Preencher exemplo');
      expect(html).toContain('Nenhum produto identificado ainda');
      expect(html).toContain('Cancelar');
      expect(html).toContain('Importar produtos');
      expect(html).toContain('disabled=""'); // Botão de importar começa desabilitado sem itens
    });

    it('inclui elementos de acessibilidade WCAG (role dialog, aria-modal, labels)', () => {
      const html = renderToStaticMarkup(
        <BatchImportModal
          isOpen={true}
          slug="loja-carol"
          onClose={vi.fn()}
        />
      );

      expect(html).toContain('role="dialog"');
      expect(html).toContain('aria-modal="true"');
      expect(html).toContain('aria-labelledby="batch-modal-title"');
      expect(html).toContain('aria-label="Fechar modal"');
    });
  });

  describe('Integração com parseBatch e Lógica de Validação', () => {
    it('detecta produtos válidos com moedas variadas através do parseBatch', () => {
      const sample = `Vestido floral midi 89,90\nCalça jeans mom 120,00\nBlusa canelada branca - R$ 45,00`;
      const parsed = parseBatch(sample);

      expect(parsed).toHaveLength(3);
      expect(parsed.every((p) => !p.warning)).toBe(true);
      expect(parsed[0]).toEqual({
        line: 1,
        title: 'Vestido floral midi',
        price: 89.9,
        description: null,
      });
      expect(parsed[1]).toEqual({
        line: 2,
        title: 'Calça jeans mom',
        price: 120,
        description: null,
      });
      expect(parsed[2]).toEqual({
        line: 3,
        title: 'Blusa canelada branca',
        price: 45,
        description: null,
      });
    });

    it('identifica linhas com aviso de preço não encontrado para bloqueio', () => {
      const sample = `Vestido floral 89,90\nCamisa social sem valor informado\nCalça jeans 120,00`;
      const parsed = parseBatch(sample);

      expect(parsed).toHaveLength(3);
      expect(parsed[1].warning).toBe('Preço não encontrado');
      expect(parsed[1].price).toBeNull();

      // Linha 1 e 3 continuam válidas
      expect(parsed[0].warning).toBeUndefined();
      expect(parsed[2].warning).toBeUndefined();

      // Removendo a linha com problema (linha 2)
      const cleaned = removeLineFromText(sample, parsed[1].line);
      const reParsed = parseBatch(cleaned);
      expect(reParsed).toHaveLength(2);
      expect(reParsed.every((p) => !p.warning)).toBe(true);
    });

    it('identifica linhas com aviso de título vazio para bloqueio', () => {
      const sample = `89,90\nCalça jeans 120,00`;
      const parsed = parseBatch(sample);

      expect(parsed[0].warning).toBe('Título vazio');
      expect(parsed[0].price).toBe(89.9);

      // Removendo a linha com problema (linha 1)
      const cleaned = removeLineFromText(sample, parsed[0].line);
      const reParsed = parseBatch(cleaned);
      expect(reParsed).toHaveLength(1);
      expect(reParsed[0].title).toBe('Calça jeans');
      expect(reParsed[0].warning).toBeUndefined();
    });

    it('identifica lote com mais de 100 itens para acionar alerta de limite', () => {
      const lines = Array.from({ length: 105 }, (_, i) => `Item ${i + 1} ${10 + i}`).join('\n');
      const parsed = parseBatch(lines);

      expect(parsed.length).toBe(105);
      expect(parsed.length > 100).toBe(true);
    });
  });

  describe('Renderização com Dados e Estados de Alerta', () => {
    it('renderiza prévia compacta com contagem e habilita botão para lote válido', () => {
      const validText = 'Vestido floral 89,90\nCalça jeans 120,00';
      const html = renderToStaticMarkup(
        <BatchImportModal
          isOpen={true}
          slug="loja-carol"
          initialText={validText}
          onClose={vi.fn()}
        />
      );

      expect(html).toContain('2 itens identificados');
      expect(html).toContain('2 válidos');
      expect(html).toContain('Vestido floral');
      expect(html).toContain('89,90');
      expect(html).toContain('Calça jeans');
      expect(html).toContain('120,00');
      expect(html).toContain('Importar 2 produtos');
      // O botão não deve ter disabled=""
      expect(html).not.toMatch(/disabled=""[^>]*><span>Importar 2 produtos<\/span>/);
    });

    it('renderiza destaque visual e alerta de bloqueio quando há linhas com aviso', () => {
      const textWithWarning = 'Vestido floral 89,90\nCamisa sem preco';
      const html = renderToStaticMarkup(
        <BatchImportModal
          isOpen={true}
          slug="loja-carol"
          initialText={textWithWarning}
          onClose={vi.fn()}
        />
      );

      expect(html).toContain('Existe 1 linha com aviso');
      expect(html).toContain('Preço não encontrado');
      expect(html).toContain('Sem preço');
      expect(html).toContain('bg-rose-50/70');
      // Botão deve estar desabilitado
      expect(html).toContain('disabled=""');
    });

    it('renderiza alerta de limite quando ultrapassa 100 itens', () => {
      const excessText = Array.from({ length: 102 }, (_, i) => `Item ${i + 1} 50,00`).join('\n');
      const html = renderToStaticMarkup(
        <BatchImportModal
          isOpen={true}
          slug="loja-carol"
          initialText={excessText}
          onClose={vi.fn()}
        />
      );

      expect(html).toContain('Limite de 100 itens excedido');
      expect(html).toContain('O lote possui 102 itens');
      expect(html).toContain('disabled=""');
    });

    it('renderiza botão de exclusão de linha com aria-label específico', () => {
      const text = 'Saia midi 75,00';
      const html = renderToStaticMarkup(
        <BatchImportModal
          isOpen={true}
          slug="loja-carol"
          initialText={text}
          onClose={vi.fn()}
        />
      );

      expect(html).toContain('aria-label="Remover linha 1"');
      expect(html).toContain('title="Remover linha 1"');
    });
  });

  describe('Integração do Botão "Importar em lote" no StoreHeader (T18)', () => {
    it('renderiza o botão "Importar em lote" quando autenticado', async () => {
      const { StoreHeader } = await import('../StoreHeader');
      const html = renderToStaticMarkup(
        <StoreHeader
          slug="loja-carol"
          namespace={{
            id: 'ns-carol-123',
            slug: 'loja-carol',
            name: 'Loja da Carol',
            subtitle: 'Moda sustentável',
            status: 'active',
          }}
          isAuthenticated={true}
        />
      );

      expect(html).toContain('Importar em lote');
      expect(html).toContain('lucide-list-plus');
    });

    it('não renderiza o botão "Importar em lote" para visitantes', async () => {
      const { StoreHeader } = await import('../StoreHeader');
      const html = renderToStaticMarkup(
        <StoreHeader
          slug="loja-carol"
          namespace={{
            id: 'ns-carol-123',
            slug: 'loja-carol',
            name: 'Loja da Carol',
            subtitle: 'Moda sustentável',
            status: 'active',
          }}
          isAuthenticated={false}
        />
      );

      expect(html).not.toContain('Importar em lote');
    });
  });
});
