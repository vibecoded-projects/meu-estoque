import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  signToken,
  verifyToken,
  decodeTokenPayload,
  getSessionSecret,
  resetSecretWarningForTests,
  SESSION_DURATION_SECONDS,
} from '@/lib/session';

describe('src/lib/session.ts — Gestão de Sessões Assinadas (T02 / D1)', () => {
  const originalEnv = process.env;
  const testSecret = 'chave-de-teste-muito-segura-e-longa-32-bytes!';

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.SESSION_SECRET = testSecret;
    resetSecretWarningForTests();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllEnvs();
  });

  describe('signToken e verifyToken', () => {
    it('(1) assinatura válida: gera token com dois segmentos e valida com sucesso', () => {
      const now = 1700000000;
      const token = signToken({
        slug: 'loja-carol',
        purpose: 'session',
        exp: now + 3600,
      });

      expect(typeof token).toBe('string');
      const parts = token.split('.');
      expect(parts).toHaveLength(2);
      expect(parts[0].length).toBeGreaterThan(0);
      expect(parts[1].length).toBeGreaterThan(0);

      const isValid = verifyToken(
        token,
        { slug: 'loja-carol', purpose: 'session' },
        now
      );
      expect(isValid).toBe(true);
    });

    it('(2) payload adulterado: alteração no payload invalida a assinatura', () => {
      const now = 1700000000;
      const token = signToken({
        slug: 'loja-carol',
        purpose: 'session',
        exp: now + 3600,
      });

      const [payloadB64, sigB64] = token.split('.');

      // Decodifica, altera slug e re-encoda para base64url sem re-assinar
      const decodedJson = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
      decodedJson.slug = 'loja-hacker';
      const tamperedPayloadB64 = Buffer.from(JSON.stringify(decodedJson)).toString('base64url');
      const tamperedToken = `${tamperedPayloadB64}.${sigB64}`;

      expect(
        verifyToken(tamperedToken, { slug: 'loja-hacker', purpose: 'session' }, now)
      ).toBe(false);
      expect(
        verifyToken(tamperedToken, { slug: 'loja-carol', purpose: 'session' }, now)
      ).toBe(false);
    });

    it('(3) assinatura adulterada: troca de caractere na assinatura invalida o token', () => {
      const now = 1700000000;
      const token = signToken({
        slug: 'loja-carol',
        purpose: 'session',
        exp: now + 3600,
      });

      const [payloadB64, sigB64] = token.split('.');
      // Altera o primeiro caractere da assinatura
      const alteredChar = sigB64[0] === 'a' ? 'b' : 'a';
      const tamperedSig = alteredChar + sigB64.slice(1);
      const tamperedToken = `${payloadB64}.${tamperedSig}`;

      const isValid = verifyToken(
        tamperedToken,
        { slug: 'loja-carol', purpose: 'session' },
        now
      );
      expect(isValid).toBe(false);
    });

    it('(4) expirado: token com exp no passado ou no instante atual é rejeitado', () => {
      const now = 1700000000;

      // Token que expirou há 1 segundo
      const expiredToken = signToken({
        slug: 'loja-carol',
        purpose: 'session',
        exp: now - 1,
      });

      expect(
        verifyToken(expiredToken, { slug: 'loja-carol', purpose: 'session' }, now)
      ).toBe(false);

      // Token no limite exato da expiração (exp === now)
      const exactExpiredToken = signToken({
        slug: 'loja-carol',
        purpose: 'session',
        exp: now,
      });

      expect(
        verifyToken(exactExpiredToken, { slug: 'loja-carol', purpose: 'session' }, now)
      ).toBe(false);

      // Token válido no futuro (exp === now + 1)
      const validFutureToken = signToken({
        slug: 'loja-carol',
        purpose: 'session',
        exp: now + 1,
      });

      expect(
        verifyToken(validFutureToken, { slug: 'loja-carol', purpose: 'session' }, now)
      ).toBe(true);
    });

    it('(5) slug diferente: token válido para uma loja é rejeitado para outra', () => {
      const now = 1700000000;
      const tokenLojaCarol = signToken({
        slug: 'loja-carol',
        purpose: 'session',
        exp: now + 3600,
      });

      expect(
        verifyToken(tokenLojaCarol, { slug: 'loja-joao', purpose: 'session' }, now)
      ).toBe(false);
    });

    it('(6) purpose diferente: token de purpose "magic" não é aceito como "session" e vice-versa', () => {
      const now = 1700000000;
      const magicToken = signToken({
        slug: 'loja-carol',
        purpose: 'magic',
        exp: now + 3600,
      });

      expect(
        verifyToken(magicToken, { slug: 'loja-carol', purpose: 'session' }, now)
      ).toBe(false);

      expect(
        verifyToken(magicToken, { slug: 'loja-carol', purpose: 'magic' }, now)
      ).toBe(true);

      const sessionToken = signToken({
        slug: 'loja-carol',
        purpose: 'session',
        exp: now + 3600,
      });

      expect(
        verifyToken(sessionToken, { slug: 'loja-carol', purpose: 'magic' }, now)
      ).toBe(false);
    });

    it('(7) token malformado/vazio: rejeita com segurança sem estourar erros não tratados', () => {
      const expected = { slug: 'loja-carol', purpose: 'session' as const };

      expect(verifyToken('', expected)).toBe(false);
      expect(verifyToken('   ', expected)).toBe(false);
      expect(verifyToken('token-sem-ponto', expected)).toBe(false);
      expect(verifyToken('a.b.c', expected)).toBe(false);
      expect(verifyToken('payload.', expected)).toBe(false);
      expect(verifyToken('.signature', expected)).toBe(false);
      expect(verifyToken('invalid-base64.signature', expected)).toBe(false);

      // Payload base64url que não é JSON
      const notJsonB64 = Buffer.from('isto não é um json', 'utf8').toString('base64url');
      expect(verifyToken(`${notJsonB64}.qualquer-sig`, expected)).toBe(false);

      // Payload JSON mas sem propriedades necessárias
      const incompleteJsonB64 = Buffer.from(JSON.stringify({ algo: 123 }), 'utf8').toString('base64url');
      expect(verifyToken(`${incompleteJsonB64}.qualquer-sig`, expected)).toBe(false);

      // Assinatura com comprimento incorreto não estoura erro de timingSafeEqual
      const validPayloadB64 = Buffer.from(
        JSON.stringify({ slug: 'loja-carol', purpose: 'session', exp: 2000000000 })
      ).toString('base64url');
      expect(verifyToken(`${validPayloadB64}.curto`, expected)).toBe(false);
      expect(verifyToken(`${validPayloadB64}.assina_muito_longa_que_excede_32_bytes_de_forma_gigante`, expected)).toBe(false);
    });

    it('(8) secret diferente: assinado com uma chave e verificado com outra é rejeitado', () => {
      const now = 1700000000;
      const tokenComSecretA = signToken(
        { slug: 'loja-carol', purpose: 'session', exp: now + 3600 },
        'secret-chave-A'
      );

      const isValidComSecretB = verifyToken(
        tokenComSecretA,
        { slug: 'loja-carol', purpose: 'session' },
        now,
        'secret-chave-B'
      );
      expect(isValidComSecretB).toBe(false);

      // Via process.env.SESSION_SECRET
      process.env.SESSION_SECRET = 'secret-original-123';
      const token = signToken({ slug: 'loja-carol', purpose: 'session', exp: now + 3600 });

      process.env.SESSION_SECRET = 'secret-trocado-456';
      expect(verifyToken(token, { slug: 'loja-carol', purpose: 'session' }, now)).toBe(false);
    });
  });

  describe('Tratamento de Segredo de Ambiente (SESSION_SECRET)', () => {
    it('lança erro claro em produção se SESSION_SECRET estiver ausente', () => {
      delete process.env.SESSION_SECRET;
      vi.stubEnv('NODE_ENV', 'production');

      expect(() => getSessionSecret()).toThrowError(/SESSION_SECRET não configurado/);

      expect(() =>
        signToken({ slug: 'loja-carol', purpose: 'session', exp: 1700000000 })
      ).toThrowError(/SESSION_SECRET não configurado/);
    });

    it('em dev/test usa chave de fallback e emite aviso no console apenas uma vez', () => {
      delete process.env.SESSION_SECRET;
      vi.stubEnv('NODE_ENV', 'development');

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const secret1 = getSessionSecret();
      const secret2 = getSessionSecret();

      expect(secret1).toBe(secret2);
      expect(secret1.length).toBeGreaterThanOrEqual(32);
      expect(warnSpy).toHaveBeenCalledTimes(1);

      warnSpy.mockRestore();
    });
  });

  describe('decodeTokenPayload helper', () => {
    it('decodifica payload estruturado sem precisar validar HMAC', () => {
      const token = signToken({
        slug: 'loja-carol',
        purpose: 'magic',
        exp: 1750000000,
      });

      const decoded = decodeTokenPayload(token);
      expect(decoded).toEqual({
        slug: 'loja-carol',
        purpose: 'magic',
        exp: 1750000000,
      });
    });

    it('retorna null para tokens inválidos', () => {
      expect(decodeTokenPayload('')).toBeNull();
      expect(decodeTokenPayload('sem-ponto')).toBeNull();
      expect(decodeTokenPayload('invalid.signature')).toBeNull();
    });
  });

  describe('Constantes de sessão', () => {
    it('SESSION_DURATION_SECONDS equivale a exatamente 7 dias', () => {
      expect(SESSION_DURATION_SECONDS).toBe(60 * 60 * 24 * 7);
      expect(SESSION_DURATION_SECONDS).toBe(604800);
    });
  });
});
