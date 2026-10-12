import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isHeicFile,
  calculateTargetDimensions,
  getCompressedFileName,
  compressImage,
} from '../imageCompression';

describe('imageCompression — Compressão e otimização de imagens', () => {
  describe('isHeicFile', () => {
    it('identifica extensões .heic e .heif em strings (case-insensitive)', () => {
      expect(isHeicFile('foto.heic')).toBe(true);
      expect(isHeicFile('FOTO_IPHONE.HEIC')).toBe(true);
      expect(isHeicFile('imagem.heif')).toBe(true);
      expect(isHeicFile('DOC.HEIF')).toBe(true);
      expect(isHeicFile('/caminho/para/arquivo.heic')).toBe(true);
    });

    it('identifica MIME types de HEIC em strings', () => {
      expect(isHeicFile('image/heic')).toBe(true);
      expect(isHeicFile('image/heif')).toBe(true);
    });

    it('identifica arquivos File com extensão ou tipo HEIC/HEIF', () => {
      const fileHeicExt = new File(['test'], 'foto.heic', { type: 'application/octet-stream' });
      expect(isHeicFile(fileHeicExt)).toBe(true);

      const fileHeicType = new File(['test'], 'foto.bin', { type: 'image/heic' });
      expect(isHeicFile(fileHeicType)).toBe(true);

      const fileHeifType = new File(['test'], 'foto.bin', { type: 'image/heif' });
      expect(isHeicFile(fileHeifType)).toBe(true);

      const fileHeicUpper = new File(['test'], 'IMG_1234.HEIC', { type: '' });
      expect(isHeicFile(fileHeicUpper)).toBe(true);

      const fileHeicSequence = new File(['test'], 'live_photo.bin', { type: 'image/heic-sequence' });
      expect(isHeicFile(fileHeicSequence)).toBe(true);
    });

    it('retorna false para formatos web tradicionais', () => {
      expect(isHeicFile('foto.jpg')).toBe(false);
      expect(isHeicFile('foto.jpeg')).toBe(false);
      expect(isHeicFile('foto.png')).toBe(false);
      expect(isHeicFile('foto.webp')).toBe(false);
      expect(isHeicFile('foto.gif')).toBe(false);

      const fileJpg = new File(['test'], 'produto.jpg', { type: 'image/jpeg' });
      expect(isHeicFile(fileJpg)).toBe(false);

      const filePng = new File(['test'], 'produto.png', { type: 'image/png' });
      expect(isHeicFile(filePng)).toBe(false);

      const fileWebp = new File(['test'], 'produto.webp', { type: 'image/webp' });
      expect(isHeicFile(fileWebp)).toBe(false);
    });

    it('retorna false para valores nulos, vazios ou inválidos', () => {
      expect(isHeicFile('')).toBe(false);
      // @ts-expect-error teste com valor nulo proposital
      expect(isHeicFile(null)).toBe(false);
      // @ts-expect-error teste com valor indefinido proposital
      expect(isHeicFile(undefined)).toBe(false);
    });
  });

  describe('calculateTargetDimensions', () => {
    it('mantém as dimensões de imagens que já são menores que o máximo', () => {
      const res = calculateTargetDimensions(800, 600, 1280, 1280);
      expect(res).toEqual({ width: 800, height: 600 });

      const portrait = calculateTargetDimensions(600, 800, 1280, 1280);
      expect(portrait).toEqual({ width: 600, height: 800 });

      const tiny = calculateTargetDimensions(100, 100, 1280, 1280);
      expect(tiny).toEqual({ width: 100, height: 100 });
    });

    it('mantém as dimensões quando a imagem possui exatamente o tamanho limite', () => {
      const res = calculateTargetDimensions(1280, 1280, 1280, 1280);
      expect(res).toEqual({ width: 1280, height: 1280 });

      const resW = calculateTargetDimensions(1280, 720, 1280, 1280);
      expect(resW).toEqual({ width: 1280, height: 720 });
    });

    it('reduz imagens largas (ex.: 4000x3000) para max 1280 mantendo aspect ratio 4:3', () => {
      const res = calculateTargetDimensions(4000, 3000, 1280, 1280);
      expect(res.width).toBe(1280);
      expect(res.height).toBe(960);
      expect(res.width / res.height).toBeCloseTo(4000 / 3000, 2);
    });

    it('reduz imagens verticais de celular (ex.: 3000x4000) para max 1280 mantendo aspect ratio 3:4', () => {
      const res = calculateTargetDimensions(3000, 4000, 1280, 1280);
      expect(res.width).toBe(960);
      expect(res.height).toBe(1280);
      expect(res.width / res.height).toBeCloseTo(3000 / 4000, 2);
    });

    it('reduz imagens quadradas grandes (ex.: 2000x2000) para 1280x1280', () => {
      const res = calculateTargetDimensions(2000, 2000, 1280, 1280);
      expect(res).toEqual({ width: 1280, height: 1280 });
    });

    it('suporta limites customizados de largura e altura', () => {
      const res = calculateTargetDimensions(1920, 1080, 800, 600);
      // ratio: min(800/1920, 600/1080) = min(0.41666, 0.55555) = 0.41666...
      expect(res.width).toBe(800);
      expect(res.height).toBe(450);
    });

    it('trata valores extremos ou inválidos sem quebrar', () => {
      expect(calculateTargetDimensions(0, 0, 1280, 1280)).toEqual({ width: 0, height: 0 });
      expect(calculateTargetDimensions(-10, 200, 1280, 1280)).toEqual({ width: 0, height: 200 });
      expect(calculateTargetDimensions(100, 100, 0, 1280)).toEqual({ width: 100, height: 100 });
    });
  });

  describe('getCompressedFileName', () => {
    it('substitui a extensão original pela extensão do targetMimeType', () => {
      expect(getCompressedFileName('foto.jpg', 'image/webp')).toBe('foto.webp');
      expect(getCompressedFileName('FOTO.HEIC', 'image/webp')).toBe('FOTO.webp');
      expect(getCompressedFileName('produto.png', 'image/jpeg')).toBe('produto.jpg');
      expect(getCompressedFileName('vestido.jpeg', 'image/jpeg')).toBe('vestido.jpg');
      expect(getCompressedFileName('arquivo_sem_extensao', 'image/webp')).toBe('arquivo_sem_extensao.webp');
    });
  });

  describe('compressImage', () => {
    it('retorna o arquivo original se o arquivo for inválido ou tiver tamanho 0', async () => {
      const emptyFile = new File([], 'vazio.jpg', { type: 'image/jpeg' });
      const result = await compressImage(emptyFile);
      expect(result).toBe(emptyFile);
    });

    it('faz fallback para o arquivo original se decodificadores não estiverem disponíveis', async () => {
      const file = new File(['conteudo fake'], 'foto.jpg', { type: 'image/jpeg' });
      const result = await compressImage(file);
      // No ambiente Node sem canvas/createImageBitmap, o fallback é acionado e devolve o arquivo original
      expect(result).toBe(file);
    });

    it('faz fallback para o arquivo original se for HEIC e heic2any não estiver presente', async () => {
      const heicFile = new File(['dados heic fake'], 'foto.heic', { type: 'image/heic' });
      const result = await compressImage(heicFile);
      expect(result).toBe(heicFile);
    });

    describe('com mocks de decodificação e canvas', () => {
      const originalCreateImageBitmap = globalThis.createImageBitmap;
      const originalDocument = globalThis.document;

      beforeEach(() => {
        vi.restoreAllMocks();
      });

      afterEach(() => {
        globalThis.createImageBitmap = originalCreateImageBitmap;
        globalThis.document = originalDocument;
      });

      it('preserva arquivo original se já for pequeno (< 200KB) e em dimensões corretas', async () => {
        // Mock de imagem com 800x600
        const fakeBitmap = {
          width: 800,
          height: 600,
          close: vi.fn(),
        };

        globalThis.createImageBitmap = vi.fn().mockResolvedValue(fakeBitmap) as unknown as typeof createImageBitmap;

        // Arquivo de 50KB (< 200KB)
        const smallFile = new File([new Uint8Array(50 * 1024)], 'foto_pequena.jpg', {
          type: 'image/jpeg',
        });

        const result = await compressImage(smallFile, { maxWidth: 1280, maxHeight: 1280 });
        expect(result).toBe(smallFile);
        expect(fakeBitmap.close).toHaveBeenCalled();
      });

      it('redimensiona e comprime imagem grande (ex.: 4000x3000) gerando novo File webp', async () => {
        const fakeBitmap = {
          width: 4000,
          height: 3000,
          close: vi.fn(),
        };

        globalThis.createImageBitmap = vi.fn().mockResolvedValue(fakeBitmap) as unknown as typeof createImageBitmap;

        const drawImageMock = vi.fn();
        const fakeCanvas = {
          width: 0,
          height: 0,
          getContext: vi.fn().mockReturnValue({
            drawImage: drawImageMock,
            imageSmoothingEnabled: false,
            imageSmoothingQuality: 'low',
          }),
          toBlob: vi.fn().mockImplementation((callback: (b: Blob | null) => void, mime: string) => {
            const blob = new Blob(['imagem_otimizada_bytes'], { type: mime });
            callback(blob);
          }),
        };

        // Mock document.createElement('canvas')
        const fakeDocument = {
          createElement: vi.fn().mockReturnValue(fakeCanvas),
        };
        globalThis.document = fakeDocument as unknown as Document;

        const largeFile = new File([new Uint8Array(2 * 1024 * 1024)], 'foto_grande.jpg', {
          type: 'image/jpeg',
        });

        const result = await compressImage(largeFile, {
          maxWidth: 1280,
          maxHeight: 1280,
          quality: 0.82,
          targetMimeType: 'image/webp',
        });

        expect(result).not.toBe(largeFile);
        expect(result.name).toBe('foto_grande.webp');
        expect(result.type).toBe('image/webp');
        expect(fakeCanvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/webp', 0.82);
        expect(fakeBitmap.close).toHaveBeenCalled();
      });

      it('chama heic2any quando arquivo é HEIC e comprime o blob resultante', async () => {
        // Mock de heic2any via vi.doMock
        const convertedJpegBlob = new Blob(['jpeg_convertido'], { type: 'image/jpeg' });
        vi.doMock('heic2any', () => ({
          default: vi.fn().mockResolvedValue(convertedJpegBlob),
        }));

        const fakeBitmap = {
          width: 3000,
          height: 4000,
          close: vi.fn(),
        };

        globalThis.createImageBitmap = vi.fn().mockResolvedValue(fakeBitmap) as unknown as typeof createImageBitmap;

        const fakeCanvas = {
          width: 0,
          height: 0,
          getContext: vi.fn().mockReturnValue({
            drawImage: vi.fn(),
            imageSmoothingEnabled: false,
            imageSmoothingQuality: 'low',
          }),
          toBlob: vi.fn().mockImplementation((callback: (b: Blob | null) => void, mime: string) => {
            const blob = new Blob(['imagem_comprimida_webp'], { type: mime });
            callback(blob);
          }),
        };

        const fakeDocument = {
          createElement: vi.fn().mockReturnValue(fakeCanvas),
        };
        globalThis.document = fakeDocument as unknown as Document;

        const heicFile = new File(['heic_raw_bytes'], 'iphone_camera.HEIC', {
          type: 'image/heic',
        });

        const result = await compressImage(heicFile);
        expect(result.name).toBe('iphone_camera.webp');
        expect(result.type).toBe('image/webp');
      });
    });
  });
});
