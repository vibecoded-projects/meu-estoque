import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * StokFácil — Gestão de Sessões Assinadas (Decisão D1)
 *
 * Módulo seguro executado exclusivamente no lado do servidor (Node.js).
 * Utiliza HMAC-SHA256 para autenticação criptográfica de tokens stateless (sem consulta ao banco por request).
 *
 * NÃO adicione 'use server' neste arquivo — ele não é uma Server Action pública.
 * NÃO importe este arquivo a partir de Client Components.
 */

export type TokenPurpose = 'session' | 'magic';

export interface SessionTokenPayload {
  slug: string;
  purpose: TokenPurpose;
  exp: number; // segundos epoch
}

export interface ExpectedTokenParams {
  slug: string;
  purpose: TokenPurpose;
}

/** Validade padrão de uma sessão autenticada: 7 dias (em segundos) */
export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 604800s

const DEV_FALLBACK_SECRET = 'stokfacil-dev-fallback-secret-minimum-32-chars-long';
let fallbackWarningEmitted = false;

/**
 * Obtém o segredo para assinatura HMAC a partir de process.env.SESSION_SECRET.
 *
 * Comportamento:
 * - Em produção (NODE_ENV === 'production'): lança erro caso SESSION_SECRET esteja ausente.
 * - Em desenvolvimento e testes: utiliza um segredo fixo de fallback e emite aviso único no console.
 */
export function getSessionSecret(): string {
  const envSecret = process.env.SESSION_SECRET?.trim();
  if (envSecret && envSecret.length > 0) {
    return envSecret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'SESSION_SECRET não configurado. Defina a variável de ambiente SESSION_SECRET no ambiente de produção.'
    );
  }

  if (!fallbackWarningEmitted) {
    console.warn(
      '[StokFácil] AVISO: SESSION_SECRET não configurado no ambiente de dev/test. Utilizando segredo fixo de fallback. Defina SESSION_SECRET antes de ir para produção!'
    );
    fallbackWarningEmitted = true;
  }

  return DEV_FALLBACK_SECRET;
}

/**
 * Helper para testes unitários resetarem o flag do aviso de segredo.
 */
export function resetSecretWarningForTests(): void {
  fallbackWarningEmitted = false;
}

/**
 * Assina um payload gerando um token com o formato:
 * `base64url(JSON payload).base64url(HMAC-SHA256(payloadB64, SESSION_SECRET))`
 *
 * @param payload Dados da sessão: slug, purpose ('session' | 'magic') e exp (epoch em segundos).
 * @param secretOverride Segredo opcional para testes unitários.
 */
export function signToken(
  payload: { slug: string; purpose: TokenPurpose; exp: number },
  secretOverride?: string
): string {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Payload inválido para signToken.');
  }

  if (!payload.slug || typeof payload.slug !== 'string') {
    throw new Error('Slug inválido no payload do token.');
  }

  if (payload.purpose !== 'session' && payload.purpose !== 'magic') {
    throw new Error("Purpose inválido no payload do token. Deve ser 'session' ou 'magic'.");
  }

  if (typeof payload.exp !== 'number' || !Number.isFinite(payload.exp)) {
    throw new Error('Expiração (exp) inválida no payload do token. Deve ser epoch em segundos.');
  }

  const secret = secretOverride ?? getSessionSecret();
  const payloadJson = JSON.stringify({
    slug: payload.slug,
    purpose: payload.purpose,
    exp: Math.floor(payload.exp),
  });

  const payloadB64 = Buffer.from(payloadJson, 'utf8').toString('base64url');
  const signatureB64 = createHmac('sha256', secret)
    .update(payloadB64)
    .digest('base64url');

  return `${payloadB64}.${signatureB64}`;
}

/**
 * Decodifica o payload de um token sem validar a assinatura.
 * Retorna o payload estruturado se o formato for válido, ou null caso contrário.
 */
export function decodeTokenPayload(token: string): SessionTokenPayload | null {
  if (!token || typeof token !== 'string') {
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return null;
  }

  try {
    const payloadJson = Buffer.from(parts[0], 'base64url').toString('utf8');
    const parsed = JSON.parse(payloadJson);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }

    const { slug, purpose, exp } = parsed as Record<string, unknown>;
    if (
      typeof slug !== 'string' ||
      (purpose !== 'session' && purpose !== 'magic') ||
      typeof exp !== 'number' ||
      !Number.isFinite(exp)
    ) {
      return null;
    }

    return { slug, purpose, exp };
  } catch {
    return null;
  }
}

/**
 * Valida a autenticidade, integridade, correspondência de escopo e expiração de um token assinado.
 *
 * Retorna `true` se o token for estritamente válido ou `false` se qualquer verificação falhar.
 * Decisão de API: escolhemos retornar `boolean` para integração direta e sem overhead com
 * `requireStore` e `checkAuth`, mantendo a assinatura solicitada no backlog.
 *
 * Medidas de segurança:
 * 1. HMAC-SHA256 verificado com `timingSafeEqual` para prevenir ataques de temporização (timing attacks).
 * 2. Buffers de tamanhos diferentes são tratados de forma segura retornando `false` sem lançar exceção.
 * 3. Validação estrita da representação canônica em base64url para impedir maleabilidade de padding.
 * 4. Validação de expiração contra o tempo epoch atual (ou parâmetro `now` para testes determinísticos).
 *
 * @param token String no formato `payloadB64.signatureB64`.
 * @param expected Escopo esperado: { slug, purpose }.
 * @param now Epoch em segundos atual (opcional, padrão: Math.floor(Date.now() / 1000)).
 * @param secretOverride Segredo opcional para testes unitários.
 */
export function verifyToken(
  token: string,
  expected: ExpectedTokenParams,
  now?: number,
  secretOverride?: string
): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return false;
  }

  const [payloadB64, signatureB64] = parts;
  if (!payloadB64 || !signatureB64) {
    return false;
  }

  let secret: string;
  try {
    secret = secretOverride ?? getSessionSecret();
  } catch {
    // Se getSessionSecret falhar (ex.: ausência em produção), rejeita com segurança
    return false;
  }

  // 1. Validação de assinatura criptográfica com timingSafeEqual
  try {
    const expectedSigBuffer = createHmac('sha256', secret)
      .update(payloadB64)
      .digest();

    const actualSigBuffer = Buffer.from(signatureB64, 'base64url');

    // timingSafeEqual exige buffers de mesmo tamanho. Tamanhos divergentes indicam assinatura inválida.
    if (expectedSigBuffer.length !== actualSigBuffer.length) {
      return false;
    }

    if (!timingSafeEqual(expectedSigBuffer, actualSigBuffer)) {
      return false;
    }

    // Previne variações de padding de base64url comparando com a forma canônica
    if (signatureB64 !== expectedSigBuffer.toString('base64url')) {
      return false;
    }
  } catch {
    return false;
  }

  // 2. Decodificação e validação de claims do payload
  let payload: unknown;
  try {
    const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf8');
    payload = JSON.parse(payloadJson);
  } catch {
    return false;
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return false;
  }

  const { slug, purpose, exp } = payload as Record<string, unknown>;

  if (
    typeof slug !== 'string' ||
    typeof purpose !== 'string' ||
    typeof exp !== 'number' ||
    !Number.isFinite(exp)
  ) {
    return false;
  }

  if (slug !== expected.slug) {
    return false;
  }

  if (purpose !== expected.purpose) {
    return false;
  }

  const currentTime =
    typeof now === 'number' && Number.isFinite(now)
      ? now
      : Math.floor(Date.now() / 1000);

  // Rejeita tokens com expiração no passado ou presente (exp <= currentTime)
  if (exp <= currentTime) {
    return false;
  }

  return true;
}

/**
 * Cria um token de Magic Link assinado para a loja identificada por slug (Decisão D2).
 *
 * O token tem purpose 'magic' e validade padrão de 7 dias (SESSION_DURATION_SECONDS).
 * Reutilizável até sua expiração natural.
 *
 * @param slug Identificador único da loja.
 * @param expiresInSeconds Duração da validade em segundos (padrão: 7 dias = 604800s).
 * @param secretOverride Segredo opcional para testes unitários.
 */
export function createMagicToken(
  slug: string,
  expiresInSeconds: number = SESSION_DURATION_SECONDS,
  secretOverride?: string
): string {
  if (!slug || typeof slug !== 'string' || slug.trim().length === 0) {
    throw new Error('Slug inválido para createMagicToken.');
  }

  if (
    typeof expiresInSeconds !== 'number' ||
    !Number.isFinite(expiresInSeconds) ||
    expiresInSeconds <= 0
  ) {
    throw new Error('Duração de validade (expiresInSeconds) inválida para createMagicToken.');
  }

  const now = Math.floor(Date.now() / 1000);
  return signToken(
    {
      slug: slug.trim(),
      purpose: 'magic',
      exp: now + expiresInSeconds,
    },
    secretOverride
  );
}

/**
 * Valida a autenticidade, integridade, escopo e validade temporal de um token de Magic Link (Decisão D2).
 *
 * Retorna `true` se o token for válido e corresponder estritamente ao slug e ao propósito 'magic',
 * ou `false` se qualquer verificação falhar (sem lançar exceções).
 *
 * @param token String no formato `payloadB64.signatureB64`.
 * @param slug Identificador único da loja esperado.
 * @param now Epoch em segundos atual (opcional, para testes determinísticos).
 * @param secretOverride Segredo opcional para testes unitários.
 */
export function verifyMagicToken(
  token: string,
  slug: string,
  now?: number,
  secretOverride?: string
): boolean {
  if (!token || typeof token !== 'string' || !slug || typeof slug !== 'string') {
    return false;
  }

  return verifyToken(
    token,
    {
      slug: slug.trim(),
      purpose: 'magic',
    },
    now,
    secretOverride
  );
}

