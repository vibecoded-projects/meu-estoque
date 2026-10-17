import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildCaption,
  getStoreUrl,
  copyToClipboard,
  shareOrDownloadImage,
  buildWhatsAppStoreShareLink,
  buildWhatsAppProductShareLink,
  shareUrlOrWhatsApp,
} from '../share';

describe('share.ts — Super-poder de compartilhamento', () => {
  describe('buildCaption', () => {
    it('monta legenda atrativa completa com emojis ✨, 💰, 📦 e 🔗', () => {
      const item = {
        title: 'Vestido Midi Floral',
        price: 129.9,
        description: 'Tecido leve e fluido, tamanho M, excelente caimento.',
      };
      const storeUrl = 'https://stokfacil.com/loja-carol';

      const caption = buildCaption(item, storeUrl);

      expect(caption).toContain('✨ Vestido Midi Floral');
      expect(caption.replace(/\s+/g, ' ')).toContain('💰 R$ 129,90');
      expect(caption).toContain('📦 Tecido leve e fluido, tamanho M, excelente caimento.');
      expect(caption).toContain('🔗 Link da vitrine: https://stokfacil.com/loja-carol');
    });

    it('omite o emoji 📦 quando description for nula', () => {
      const item = {
        title: 'Brinco Argola Dourada',
        price: 35,
        description: null,
      };
      const storeUrl = 'https://stokfacil.com/loja-carol';

      const caption = buildCaption(item, storeUrl);

      expect(caption).toContain('✨ Brinco Argola Dourada');
      expect(caption.replace(/\s+/g, ' ')).toContain('💰 R$ 35,00');
      expect(caption).not.toContain('📦');
      expect(caption).toContain('🔗 Link da vitrine: https://stokfacil.com/loja-carol');
    });

    it('omite o emoji 📦 quando description for undefined', () => {
      const item = {
        title: 'Bolsa Tiracolo Couro',
        price: 180,
      };
      const storeUrl = 'https://stokfacil.com/loja-carol';

      const caption = buildCaption(item, storeUrl);

      expect(caption).toContain('✨ Bolsa Tiracolo Couro');
      expect(caption).not.toContain('📦');
      expect(caption).toContain('🔗 Link da vitrine: https://stokfacil.com/loja-carol');
    });

    it('omite o emoji 📦 quando description for string vazia ou apenas espaços', () => {
      const item = {
        title: 'Óculos de Sol Retrô',
        price: 79.9,
        description: '   ',
      };
      const storeUrl = 'https://stokfacil.com/loja-carol';

      const caption = buildCaption(item, storeUrl);

      expect(caption).toContain('✨ Óculos de Sol Retrô');
      expect(caption).not.toContain('📦');
      expect(caption).toContain('🔗 Link da vitrine: https://stokfacil.com/loja-carol');
    });

    it('omite a linha de link e emoji 🔗 quando storeUrl for vazia ou espaços', () => {
      const item = {
        title: 'Cinto de Couro',
        price: 49,
        description: 'Cor caramelo',
      };

      const caption = buildCaption(item, '  ');

      expect(caption).toContain('✨ Cinto de Couro');
      expect(caption).toContain('📦 Cor caramelo');
      expect(caption).not.toContain('🔗');
    });

    it('remove espaços excedentes nas extremidades de título, descrição e link', () => {
      const item = {
        title: '   Camisa Linho Masculina   ',
        price: 150,
        description: '   100% linho puro   ',
      };

      const caption = buildCaption(item, '   https://stokfacil.com/camisas   ');

      expect(caption).toContain('✨ Camisa Linho Masculina');
      expect(caption).toContain('📦 100% linho puro');
      expect(caption).toContain('🔗 Link da vitrine: https://stokfacil.com/camisas');
    });

    it('formata adequadamente preço zero ou centavos', () => {
      const item = {
        title: 'Brinde Especial',
        price: 0,
      };

      const caption = buildCaption(item, 'https://stokfacil.com/loja');
      expect(caption.replace(/\s+/g, ' ')).toContain('💰 R$ 0,00');
    });
  });

  describe('getStoreUrl', () => {
    const originalEnv = process.env.NEXT_PUBLIC_SITE_URL;

    afterEach(() => {
      process.env.NEXT_PUBLIC_SITE_URL = originalEnv;
      vi.unstubAllGlobals();
    });

    it('monta a URL com slug em ambiente Node usando fallback do stokfacil.com', () => {
      delete process.env.NEXT_PUBLIC_SITE_URL;
      const url = getStoreUrl('loja-carol');
      expect(url).toBe('https://stokfacil.com/loja-carol');
    });

    it('respeita a env NEXT_PUBLIC_SITE_URL sem barra final duplicada', () => {
      process.env.NEXT_PUBLIC_SITE_URL = 'https://meudominio.com.br/';
      const url = getStoreUrl('loja-joao');
      expect(url).toBe('https://meudominio.com.br/loja-joao');
    });

    it('retorna a URL base quando slug é vazio', () => {
      process.env.NEXT_PUBLIC_SITE_URL = 'https://stokfacil.com';
      const url = getStoreUrl('');
      expect(url).toBe('https://stokfacil.com');
    });

    it('utiliza window.location.origin quando executado no navegador', () => {
      vi.stubGlobal('window', {
        location: { origin: 'http://localhost:3000' },
      });
      const url = getStoreUrl('loja-teste');
      expect(url).toBe('http://localhost:3000/loja-teste');
    });
  });

  describe('copyToClipboard', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    it('retorna false quando window for indefinida (ambiente SSR)', async () => {
      vi.stubGlobal('window', undefined);
      const res = await copyToClipboard('texto de teste');
      expect(res).toBe(false);
    });

    it('copia com sucesso usando navigator.clipboard.writeText', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);

      vi.stubGlobal('window', {});
      vi.stubGlobal('navigator', {
        clipboard: { writeText: writeTextMock },
      });

      const res = await copyToClipboard('Meu texto de vitrine');

      expect(writeTextMock).toHaveBeenCalledWith('Meu texto de vitrine');
      expect(res).toBe(true);
    });

    it('faz fallback para document.execCommand quando writeText rejeita', async () => {
      const writeTextMock = vi.fn().mockRejectedValue(new Error('Permissão negada'));
      const execCommandMock = vi.fn().mockReturnValue(true);
      const appendChildMock = vi.fn();
      const removeChildMock = vi.fn();

      vi.stubGlobal('window', {});
      vi.stubGlobal('navigator', {
        clipboard: { writeText: writeTextMock },
      });
      vi.stubGlobal('document', {
        createElement: vi.fn().mockReturnValue({
          style: {},
          setAttribute: vi.fn(),
          focus: vi.fn(),
          select: vi.fn(),
          setSelectionRange: vi.fn(),
        }),
        body: {
          appendChild: appendChildMock,
          removeChild: removeChildMock,
        },
        execCommand: execCommandMock,
      });

      const res = await copyToClipboard('Texto de fallback');

      expect(writeTextMock).toHaveBeenCalled();
      expect(execCommandMock).toHaveBeenCalledWith('copy');
      expect(appendChildMock).toHaveBeenCalled();
      expect(removeChildMock).toHaveBeenCalled();
      expect(res).toBe(true);
    });

    it('faz fallback para document.execCommand quando navigator.clipboard não existe', async () => {
      const execCommandMock = vi.fn().mockReturnValue(true);

      vi.stubGlobal('window', {});
      vi.stubGlobal('navigator', {});
      vi.stubGlobal('document', {
        createElement: vi.fn().mockReturnValue({
          style: {},
          setAttribute: vi.fn(),
          focus: vi.fn(),
          select: vi.fn(),
          setSelectionRange: vi.fn(),
        }),
        body: {
          appendChild: vi.fn(),
          removeChild: vi.fn(),
        },
        execCommand: execCommandMock,
      });

      const res = await copyToClipboard('Texto direto no execCommand');

      expect(execCommandMock).toHaveBeenCalledWith('copy');
      expect(res).toBe(true);
    });

    it('retorna false quando tanto clipboard quanto execCommand falham', async () => {
      vi.stubGlobal('window', {});
      vi.stubGlobal('navigator', {
        clipboard: {
          writeText: vi.fn().mockRejectedValue(new Error('Falhou')),
        },
      });
      vi.stubGlobal('document', {
        createElement: vi.fn().mockImplementation(() => {
          throw new Error('Falha ao criar elemento');
        }),
      });

      const res = await copyToClipboard('Falha total');
      expect(res).toBe(false);
    });
  });

  describe('shareOrDownloadImage', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let originalFetch: any;

    beforeEach(() => {
      originalFetch = globalThis.fetch;
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    it('retorna cancelled quando executado fora do navegador (SSR)', async () => {
      vi.stubGlobal('window', undefined);
      const res = await shareOrDownloadImage('https://exemplo.com/foto.jpg', 'foto');
      expect(res).toBe('cancelled');
    });

    it('compartilha via Web Share API quando navigator.canShare com arquivos é suportado', async () => {
      const mockBlob = new Blob(['fake-image'], { type: 'image/jpeg' });
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        blob: vi.fn().mockResolvedValue(mockBlob),
      });

      const shareMock = vi.fn().mockResolvedValue(undefined);
      const canShareMock = vi.fn().mockReturnValue(true);

      vi.stubGlobal('window', {});
      vi.stubGlobal('navigator', {
        canShare: canShareMock,
        share: shareMock,
      });

      const res = await shareOrDownloadImage('https://exemplo.com/foto.jpg', 'Vestido Floral');

      expect(canShareMock).toHaveBeenCalled();
      expect(shareMock).toHaveBeenCalled();
      expect(res).toBe('shared');
    });

    it('trata AbortError (usuário cancelou) retornando cancelled e NÃO acionando fallback de download', async () => {
      const mockBlob = new Blob(['fake-image'], { type: 'image/jpeg' });
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        blob: vi.fn().mockResolvedValue(mockBlob),
      });

      const abortError = new Error('Share canceled');
      abortError.name = 'AbortError';

      const shareMock = vi.fn().mockRejectedValue(abortError);
      const canShareMock = vi.fn().mockReturnValue(true);
      const createObjectURLMock = vi.fn();

      vi.stubGlobal('window', {
        URL: {
          createObjectURL: createObjectURLMock,
          revokeObjectURL: vi.fn(),
        },
      });
      vi.stubGlobal('navigator', {
        canShare: canShareMock,
        share: shareMock,
      });

      const res = await shareOrDownloadImage('https://exemplo.com/foto.jpg', 'Vestido Floral');

      expect(res).toBe('cancelled');
      // Garante que o fallback de download NÃO foi acionado
      expect(createObjectURLMock).not.toHaveBeenCalled();
    });

    it('aciona fallback de download via blob quando Web Share falha com NotAllowedError', async () => {
      const mockBlob = new Blob(['fake-image'], { type: 'image/jpeg' });
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        blob: vi.fn().mockResolvedValue(mockBlob),
      });

      const notAllowedError = new Error('Permission denied');
      notAllowedError.name = 'NotAllowedError';

      const shareMock = vi.fn().mockRejectedValue(notAllowedError);
      const canShareMock = vi.fn().mockReturnValue(true);
      const createObjectURLMock = vi.fn().mockReturnValue('blob:http://localhost/fake-uuid');
      const revokeObjectURLMock = vi.fn();
      const clickMock = vi.fn();

      vi.stubGlobal('window', {
        URL: {
          createObjectURL: createObjectURLMock,
          revokeObjectURL: revokeObjectURLMock,
        },
      });
      vi.stubGlobal('navigator', {
        canShare: canShareMock,
        share: shareMock,
      });
      vi.stubGlobal('document', {
        createElement: vi.fn().mockReturnValue({
          style: {},
          click: clickMock,
        }),
        body: {
          appendChild: vi.fn(),
          removeChild: vi.fn(),
        },
      });

      const res = await shareOrDownloadImage('https://exemplo.com/foto.jpg', 'Vestido Floral');

      expect(res).toBe('downloaded');
      expect(createObjectURLMock).toHaveBeenCalledWith(mockBlob);
      expect(clickMock).toHaveBeenCalled();
      expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:http://localhost/fake-uuid');
    });

    it('aciona fallback de download via blob quando canShare retorna false', async () => {
      const mockBlob = new Blob(['fake-image'], { type: 'image/jpeg' });
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        blob: vi.fn().mockResolvedValue(mockBlob),
      });

      const createObjectURLMock = vi.fn().mockReturnValue('blob:http://localhost/fake-uuid');
      const revokeObjectURLMock = vi.fn();
      const clickMock = vi.fn();

      vi.stubGlobal('window', {
        URL: {
          createObjectURL: createObjectURLMock,
          revokeObjectURL: revokeObjectURLMock,
        },
      });
      vi.stubGlobal('navigator', {
        canShare: vi.fn().mockReturnValue(false),
      });
      vi.stubGlobal('document', {
        createElement: vi.fn().mockReturnValue({
          style: {},
          click: clickMock,
        }),
        body: {
          appendChild: vi.fn(),
          removeChild: vi.fn(),
        },
      });

      const res = await shareOrDownloadImage('https://exemplo.com/foto.jpg', 'Bolsa');

      expect(res).toBe('downloaded');
      expect(createObjectURLMock).toHaveBeenCalledWith(mockBlob);
      expect(clickMock).toHaveBeenCalled();
    });

    it('faz fallback para window.open quando fetch falha', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      const openMock = vi.fn();

      vi.stubGlobal('window', {
        open: openMock,
      });

      const res = await shareOrDownloadImage('https://exemplo.com/foto.jpg', 'Bolsa');

      expect(openMock).toHaveBeenCalledWith('https://exemplo.com/foto.jpg', '_blank');
      expect(res).toBe('downloaded');
    });
  });

  describe('buildWhatsAppStoreShareLink', () => {
    it('monta link com mensagem amigável sem nome de loja', () => {
      const url = 'https://stokfacil.com/loja-carol';
      const link = buildWhatsAppStoreShareLink('', url);

      expect(link.startsWith('https://api.whatsapp.com/send?text=')).toBe(true);
      const text = decodeURIComponent(link.replace('https://api.whatsapp.com/send?text=', ''));
      expect(text).toBe('Conheça a nossa vitrine online! Veja todas as novidades e peças disponíveis no link: https://stokfacil.com/loja-carol');
    });

    it('monta link com mensagem personalizada com nome da loja', () => {
      const url = 'https://stokfacil.com/boutique-luxo';
      const link = buildWhatsAppStoreShareLink('Boutique Luxo', url);

      const text = decodeURIComponent(link.replace('https://api.whatsapp.com/send?text=', ''));
      expect(text).toBe('Conheça a vitrine online da Boutique Luxo! Veja todas as novidades e peças disponíveis no link: https://stokfacil.com/boutique-luxo');
    });

    it('remove espaços em excesso das bordas', () => {
      const link = buildWhatsAppStoreShareLink('  Minha Loja  ', '  https://stokfacil.com/minha-loja  ');
      const text = decodeURIComponent(link.replace('https://api.whatsapp.com/send?text=', ''));
      expect(text).toBe('Conheça a vitrine online da Minha Loja! Veja todas as novidades e peças disponíveis no link: https://stokfacil.com/minha-loja');
    });
  });

  describe('buildWhatsAppProductShareLink', () => {
    it('monta link do item com título, preço em PT-BR em negrito e link da vitrine', () => {
      const item = {
        title: 'Vestido Midi Floral',
        price: 129.9,
      };
      const storeUrl = 'https://stokfacil.com/loja-carol';
      const link = buildWhatsAppProductShareLink(item, storeUrl);

      expect(link.startsWith('https://api.whatsapp.com/send?text=')).toBe(true);
      const text = decodeURIComponent(link.replace('https://api.whatsapp.com/send?text=', ''));
      expect(text).toContain('Olha essa novidade: *Vestido Midi Floral* por apenas *R$ 129,90*!');
      expect(text).toContain('Confira todos os detalhes e fotos na nossa vitrine: https://stokfacil.com/loja-carol');
    });

    it('trata preço zero adequadamente com R$ 0,00', () => {
      const item = {
        title: 'Amostra Grátis',
        price: 0,
      };
      const link = buildWhatsAppProductShareLink(item, 'https://stokfacil.com/loja');
      const text = decodeURIComponent(link.replace('https://api.whatsapp.com/send?text=', ''));
      expect(text).toContain('*Amostra Grátis* por apenas *R$ 0,00*!');
    });

    it('limpa espaços do título e da url', () => {
      const item = {
        title: '  Bolsa Couro Legítimo  ',
        price: 180,
      };
      const link = buildWhatsAppProductShareLink(item, '  https://stokfacil.com/bolsas  ');
      const text = decodeURIComponent(link.replace('https://api.whatsapp.com/send?text=', ''));
      expect(text).toContain('*Bolsa Couro Legítimo* por apenas *R$ 180,00*!');
      expect(text).toContain('Confira todos os detalhes e fotos na nossa vitrine: https://stokfacil.com/bolsas');
    });
  });

  describe('shareUrlOrWhatsApp', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    it('retorna sem erro quando executado fora do navegador (SSR)', async () => {
      vi.stubGlobal('window', undefined);
      await expect(
        shareUrlOrWhatsApp({
          title: 'Loja Carol',
          text: 'Confira nossos produtos',
          url: 'https://stokfacil.com/loja-carol',
        })
      ).resolves.toBeUndefined();
    });

    it('usa navigator.share nativo quando disponível e bem-sucedido', async () => {
      const shareMock = vi.fn().mockResolvedValue(undefined);

      vi.stubGlobal('window', {});
      vi.stubGlobal('navigator', {
        share: shareMock,
      });

      await shareUrlOrWhatsApp({
        title: 'Vestido Floral',
        text: 'Olha esse vestido lindo',
        url: 'https://stokfacil.com/loja/vestido',
      });

      expect(shareMock).toHaveBeenCalledWith({
        title: 'Vestido Floral',
        text: 'Olha esse vestido lindo',
        url: 'https://stokfacil.com/loja/vestido',
      });
    });

    it('não dispara fallback de WhatsApp quando o usuário cancela com AbortError', async () => {
      const abortError = new Error('Canceled by user');
      abortError.name = 'AbortError';
      const shareMock = vi.fn().mockRejectedValue(abortError);
      const openMock = vi.fn();

      vi.stubGlobal('window', {
        open: openMock,
      });
      vi.stubGlobal('navigator', {
        share: shareMock,
      });

      await shareUrlOrWhatsApp({
        title: 'Vestido Floral',
        text: 'Olha esse vestido',
        url: 'https://stokfacil.com/loja/vestido',
      });

      expect(shareMock).toHaveBeenCalled();
      expect(openMock).not.toHaveBeenCalled();
    });

    it('aciona fallback para window.open com WhatsApp quando navigator.share não existe', async () => {
      const openMock = vi.fn().mockReturnValue({});

      vi.stubGlobal('window', {
        open: openMock,
      });
      vi.stubGlobal('navigator', {});

      await shareUrlOrWhatsApp({
        title: 'Vestido Floral',
        text: 'Olha esse vestido lindo',
        url: 'https://stokfacil.com/loja/vestido',
      });

      expect(openMock).toHaveBeenCalled();
      const calledUrl = openMock.mock.calls[0][0];
      expect(calledUrl.startsWith('https://api.whatsapp.com/send?text=')).toBe(true);
      const decoded = decodeURIComponent(calledUrl.replace('https://api.whatsapp.com/send?text=', ''));
      expect(decoded).toContain('Olha esse vestido lindo');
      expect(decoded).toContain('https://stokfacil.com/loja/vestido');
    });

    it('aciona fallback para window.open com WhatsApp quando navigator.share falha com NotAllowedError', async () => {
      const notAllowedError = new Error('Permission denied');
      notAllowedError.name = 'NotAllowedError';
      const shareMock = vi.fn().mockRejectedValue(notAllowedError);
      const openMock = vi.fn().mockReturnValue({});

      vi.stubGlobal('window', {
        open: openMock,
      });
      vi.stubGlobal('navigator', {
        share: shareMock,
      });

      await shareUrlOrWhatsApp({
        title: 'Vestido Floral',
        text: 'Olha esse vestido',
        url: 'https://stokfacil.com/loja/vestido',
      });

      expect(shareMock).toHaveBeenCalled();
      expect(openMock).toHaveBeenCalled();
    });

    it('faz fallback para copiar para clipboard se window.open retornar nulo ou lançar erro', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);

      vi.stubGlobal('window', {
        open: vi.fn().mockReturnValue(null),
      });
      vi.stubGlobal('navigator', {
        clipboard: { writeText: writeTextMock },
      });

      await shareUrlOrWhatsApp({
        title: 'Loja',
        text: 'Visite nossa loja',
        url: 'https://stokfacil.com/loja',
      });

      expect(writeTextMock).toHaveBeenCalled();
    });
  });
});
