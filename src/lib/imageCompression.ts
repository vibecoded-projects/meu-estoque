/**
 * Utilitário client-side de compressão e otimização de imagens de celular
 * com suporte a HEIC/HEIF, orientação EXIF e step-down resizing.
 */

export interface CompressionOptions {
  /** Largura máxima permitida em pixels (padrão: 1280) */
  maxWidth?: number;
  /** Altura máxima permitida em pixels (padrão: 1280) */
  maxHeight?: number;
  /** Qualidade de compressão entre 0 e 1 (padrão: 0.82) */
  quality?: number;
  /** Tipo MIME de destino (padrão: 'image/webp') */
  targetMimeType?: string;
}

/**
 * Verifica se um arquivo ou caminho de arquivo é do formato HEIC ou HEIF
 * a partir de sua extensão ou MIME type.
 */
export function isHeicFile(file: File | string): boolean {
  if (typeof file === 'string') {
    const trimmed = file.trim().toLowerCase();
    return (
      trimmed.endsWith('.heic') ||
      trimmed.endsWith('.heif') ||
      trimmed.includes('image/heic') ||
      trimmed.includes('image/heif')
    );
  }

  if (file && typeof file === 'object') {
    const name = typeof file.name === 'string' ? file.name.toLowerCase() : '';
    const type = typeof file.type === 'string' ? file.type.toLowerCase() : '';

    return (
      name.endsWith('.heic') ||
      name.endsWith('.heif') ||
      type === 'image/heic' ||
      type === 'image/heif' ||
      type === 'image/heic-sequence' ||
      type === 'image/heif-sequence'
    );
  }

  return false;
}

/**
 * Calcula dimensões mantendo a proporção de aspecto (aspect ratio)
 * sem exceder maxWidth ou maxHeight.
 */
export function calculateTargetDimensions(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  if (width <= 0 || height <= 0 || maxWidth <= 0 || maxHeight <= 0) {
    return {
      width: Math.max(0, Math.round(width)),
      height: Math.max(0, Math.round(height)),
    };
  }

  if (width <= maxWidth && height <= maxHeight) {
    return {
      width: Math.round(width),
      height: Math.round(height),
    };
  }

  const ratio = Math.min(maxWidth / width, maxHeight / height);
  const targetWidth = Math.max(1, Math.round(width * ratio));
  const targetHeight = Math.max(1, Math.round(height * ratio));

  return {
    width: targetWidth,
    height: targetHeight,
  };
}

/**
 * Verifica se o MIME type é um formato web padrão e seguro.
 */
function isWebSafeMimeType(mimeType: string): boolean {
  const safe = ['image/jpeg', 'image/jpg', 'image/webp', 'image/png'];
  return safe.includes(mimeType.toLowerCase());
}

/**
 * Gera um novo nome de arquivo com a extensão apropriada para o formato alvo.
 */
export function getCompressedFileName(originalName: string, targetMimeType: string): string {
  const extensionMap: Record<string, string> = {
    'image/webp': 'webp',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
  };

  const newExt = extensionMap[targetMimeType.toLowerCase()] || 'webp';
  const lastDotIndex = originalName.lastIndexOf('.');
  const baseName = lastDotIndex > 0 ? originalName.substring(0, lastDotIndex) : originalName;

  return `${baseName}.${newExt}`;
}

/**
 * Tenta converter um arquivo HEIC para Blob compatível utilizando heic2any
 * importado dinamicamente para não inflar o bundle inicial.
 */
async function tryConvertHeic(
  file: File | Blob,
  targetMimeType: string,
  quality: number
): Promise<Blob | null> {
  try {
    const moduleName = 'heic2any';
    const heic2anyModule = await import(/* webpackIgnore: true */ moduleName);
    const heic2any = heic2anyModule.default ?? heic2anyModule;

    // heic2any converte para image/jpeg ou image/png
    const toType = targetMimeType === 'image/webp' ? 'image/jpeg' : targetMimeType;

    const result = await heic2any({
      blob: file,
      toType,
      quality,
    });

    if (Array.isArray(result)) {
      return result[0] ?? null;
    }
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(
      `[imageCompression] heic2any não disponível ou falhou na conversão do arquivo HEIC: ${message}. Prosseguindo com fallback.`
    );
    return null;
  }
}

interface LoadedImageSource {
  source: CanvasImageSource;
  width: number;
  height: number;
  close?: () => void;
}

/**
 * Carrega a fonte da imagem respeitando orientação EXIF quando disponível.
 */
async function loadImageSource(blob: Blob): Promise<LoadedImageSource> {
  // 1. Tentar createImageBitmap com orientação EXIF
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close(),
      };
    } catch {
      // Fallback sem options se o navegador não suportar imageOrientation
      try {
        const bitmap = await createImageBitmap(blob);
        return {
          source: bitmap,
          width: bitmap.width,
          height: bitmap.height,
          close: () => bitmap.close(),
        };
      } catch {
        // Prossegue para fallback via Image
      }
    }
  }

  // 2. Fallback via elemento Image
  if (typeof Image !== 'undefined' && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(blob);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve({
          source: img,
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
        });
      };

      img.onerror = (err) => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error(`Falha ao decodificar imagem via elemento Image: ${String(err)}`));
      };

      img.src = objectUrl;
    });
  }

  throw new Error('Nenhum decodificador de imagem disponível no ambiente atual.');
}

/**
 * Executa redimensionamento step-down (gradual em etapas de ~50%) em canvas 2D
 * para evitar artefatos de amostragem e estouro de memória (OOM) no Safari/mobile.
 */
function renderStepDownToCanvas(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number
): HTMLCanvasElement {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
    throw new Error('Ambiente sem suporte a manipulação de DOM/Canvas.');
  }

  // Se a redução for menor ou igual a 2x em ambas as dimensões, desenha diretamente
  if (sourceWidth <= targetWidth * 2 && sourceHeight <= targetHeight * 2) {
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Não foi possível obter o contexto 2D do canvas.');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, targetWidth, targetHeight);
    return canvas;
  }

  // Redução progressiva pela metade até aproximar do tamanho alvo
  let currentWidth = sourceWidth;
  let currentHeight = sourceHeight;
  let currentSource: CanvasImageSource = source;

  while (currentWidth / 2 >= targetWidth && currentHeight / 2 >= targetHeight) {
    const stepWidth = Math.round(currentWidth / 2);
    const stepHeight = Math.round(currentHeight / 2);

    const stepCanvas = document.createElement('canvas');
    stepCanvas.width = stepWidth;
    stepCanvas.height = stepHeight;
    const stepCtx = stepCanvas.getContext('2d');
    if (!stepCtx) break;

    stepCtx.imageSmoothingEnabled = true;
    stepCtx.imageSmoothingQuality = 'high';
    stepCtx.drawImage(currentSource, 0, 0, stepWidth, stepHeight);

    currentWidth = stepWidth;
    currentHeight = stepHeight;
    currentSource = stepCanvas;
  }

  // Passo final nas dimensões exatas pretendidas
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = targetWidth;
  finalCanvas.height = targetHeight;
  const finalCtx = finalCanvas.getContext('2d');
  if (!finalCtx) throw new Error('Não foi possível obter o contexto 2D final do canvas.');

  finalCtx.imageSmoothingEnabled = true;
  finalCtx.imageSmoothingQuality = 'high';
  finalCtx.drawImage(currentSource, 0, 0, targetWidth, targetHeight);

  return finalCanvas;
}

/**
 * Otimiza e comprime uma foto do produto no client-side:
 * - Converte arquivos HEIC/HEIF via heic2any quando disponível.
 * - Corrige rotação automática de câmeras de celular (EXIF).
 * - Redimensiona suavemente via step-down mantendo a proporção de aspecto (máximo 1280px).
 * - Preserva o arquivo original se já for pequeno (< 200KB) e em formato web seguro.
 * - Fallback: devolve o arquivo original se qualquer etapa de compressão falhar.
 */
export async function compressImage(
  file: File,
  options?: CompressionOptions
): Promise<File> {
  const maxWidth = options?.maxWidth ?? 1280;
  const maxHeight = options?.maxHeight ?? 1280;
  const quality = options?.quality ?? 0.82;
  const targetMimeType = options?.targetMimeType ?? 'image/webp';

  // Arquivos inválidos ou vazios são preservados
  if (!file || typeof file.size !== 'number' || file.size === 0) {
    return file;
  }

  const isHeic = isHeicFile(file);

  try {
    let workingBlob: Blob = file;

    // Se for HEIC/HEIF, tenta converter dinamicamente
    if (isHeic) {
      const convertedBlob = await tryConvertHeic(file, targetMimeType, quality);
      if (!convertedBlob) {
        // Biblioteca não instalada ou falha na conversão -> fallback amigável devolve original
        return file;
      }
      workingBlob = convertedBlob;
    }

    // Carregar fonte da imagem
    let imageInfo: LoadedImageSource;
    try {
      imageInfo = await loadImageSource(workingBlob);
    } catch {
      // Se a imagem não puder ser decodificada no ambiente, retorna original
      return file;
    }

    const { source, width, height, close } = imageInfo;

    try {
      // Se a imagem não for HEIC, já tiver tamanho pequeno (< 200KB), dimensões dentro do limite
      // e formato web seguro, preserva o arquivo original sem recomprimir
      const isAlreadySmall = file.size < 200 * 1024;
      const isWithinBounds = width <= maxWidth && height <= maxHeight;
      const isWebSafeFormat = isWebSafeMimeType(file.type);
      const isSameFormatOrSafe = !options?.targetMimeType || file.type === targetMimeType || isWebSafeFormat;

      if (!isHeic && isAlreadySmall && isWithinBounds && isSameFormatOrSafe) {
        return file;
      }

      // Calcular dimensões mantendo aspect ratio
      const targetDims = calculateTargetDimensions(width, height, maxWidth, maxHeight);

      // Redimensionamento step-down
      const canvas = renderStepDownToCanvas(
        source,
        width,
        height,
        targetDims.width,
        targetDims.height
      );

      // Exportação do canvas para Blob com targetMimeType e quality
      const outputBlob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (b) => {
            if (b) resolve(b);
            else reject(new Error('Canvas retornou blob nulo'));
          },
          targetMimeType,
          quality
        );
      });

      // Se por ventura a imagem original não-HEIC já for menor do que o output e em formato seguro,
      // preservamos o original para não aumentar o tamanho do arquivo
      if (!isHeic && outputBlob.size >= file.size && isWebSafeMimeType(file.type)) {
        return file;
      }

      const newFileName = getCompressedFileName(file.name, targetMimeType);

      return new File([outputBlob], newFileName, {
        type: outputBlob.type || targetMimeType,
        lastModified: Date.now(),
      });
    } finally {
      if (close) {
        close();
      }
    }
  } catch (error) {
    console.warn(
      '[imageCompression] Falha durante compressão. Devolvendo arquivo original:',
      error
    );
    return file;
  }
}
