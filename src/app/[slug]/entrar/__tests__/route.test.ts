import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GET } from '../route';
import {
  createMagicToken,
  signToken,
  verifyToken,
  SESSION_DURATION_SECONDS,
  resetSecretWarningForTests,
} from '@/lib/session';

const mockCookieStoreSet = vi.fn();

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    set: mockCookieStoreSet,
  })),
}));

describe('src/app/[slug]/entrar/route.ts — Magic Link Route Handler (T12 / D2)', () => {
  const originalEnv = process.env;
  const testSecret = 'chave-de-teste-muito-segura-e-longa-32-bytes!';

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.SESSION_SECRET = testSecret;
    resetSecretWarningForTests();
    mockCookieStoreSet.mockClear();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllEnvs();
  });

  it('(1) magic link válido com ?token: autentica, emite cookie e redireciona (303) para /[slug]', async () => {
    const slug = 'loja-carol';
    const magicToken = createMagicToken(slug);

    const request = new Request(`http://localhost:3000/${slug}/entrar?token=${magicToken}`);
    const context = { params: Promise.resolve({ slug }) };

    const response = await GET(request, context);

    // Status 303 See Other
    expect(response.status).toBe(303);

    // Redireciona exatamente para /[slug] sem query params residuais
    expect(response.headers.get('location')).toBe(`http://localhost:3000/${slug}`);

    // Cookie auth_<slug> gravado no NextResponse
    const authCookie = response.cookies.get(`auth_${slug}`);
    expect(authCookie).toBeDefined();
    expect(authCookie?.name).toBe(`auth_${slug}`);
    expect(typeof authCookie?.value).toBe('string');
    expect(authCookie?.httpOnly).toBe(true);
    expect(authCookie?.sameSite).toBe('lax');
    expect(authCookie?.path).toBe('/');
    expect(authCookie?.maxAge).toBe(SESSION_DURATION_SECONDS);

    // O valor do cookie é um token de sessão (purpose: 'session') válido para o slug
    const isSessionTokenValid = verifyToken(authCookie!.value, {
      slug,
      purpose: 'session',
    });
    expect(isSessionTokenValid).toBe(true);

    // Verifica que o cookieStore do next/headers também foi acionado
    expect(mockCookieStoreSet).toHaveBeenCalledTimes(1);
    expect(mockCookieStoreSet).toHaveBeenCalledWith(
      `auth_${slug}`,
      authCookie!.value,
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        maxAge: SESSION_DURATION_SECONDS,
        path: '/',
      })
    );
  });

  it('(2) magic link válido com ?auth_token: suporta o parâmetro alternativo do blueprint 3.1', async () => {
    const slug = 'loja-carol';
    const magicToken = createMagicToken(slug);

    const request = new Request(`http://localhost:3000/${slug}/entrar?auth_token=${magicToken}`);
    const context = { params: Promise.resolve({ slug }) };

    const response = await GET(request, context);

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe(`http://localhost:3000/${slug}`);

    const authCookie = response.cookies.get(`auth_${slug}`);
    expect(authCookie).toBeDefined();
    expect(
      verifyToken(authCookie!.value, { slug, purpose: 'session' })
    ).toBe(true);
  });

  it('(3) token ausente: redireciona (303) para /[slug]?erro=link-invalido sem emitir cookie', async () => {
    const slug = 'loja-carol';
    const request = new Request(`http://localhost:3000/${slug}/entrar`);
    const context = { params: Promise.resolve({ slug }) };

    const response = await GET(request, context);

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe(`http://localhost:3000/${slug}?erro=link-invalido`);
    expect(response.cookies.get(`auth_${slug}`)).toBeUndefined();
    expect(mockCookieStoreSet).not.toHaveBeenCalled();
  });

  it('(4) token vazio ou com apenas espaços: redireciona para /[slug]?erro=link-invalido', async () => {
    const slug = 'loja-carol';
    const request = new Request(`http://localhost:3000/${slug}/entrar?token=%20%20`);
    const context = { params: Promise.resolve({ slug }) };

    const response = await GET(request, context);

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe(`http://localhost:3000/${slug}?erro=link-invalido`);
    expect(response.cookies.get(`auth_${slug}`)).toBeUndefined();
    expect(mockCookieStoreSet).not.toHaveBeenCalled();
  });

  it('(5) token malformado ou string arbitrária: redireciona para /[slug]?erro=link-invalido', async () => {
    const slug = 'loja-carol';
    const request = new Request(`http://localhost:3000/${slug}/entrar?token=token-invalido-xyz`);
    const context = { params: Promise.resolve({ slug }) };

    const response = await GET(request, context);

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe(`http://localhost:3000/${slug}?erro=link-invalido`);
    expect(response.cookies.get(`auth_${slug}`)).toBeUndefined();
    expect(mockCookieStoreSet).not.toHaveBeenCalled();
  });

  it('(6) token adulterado: assinatura violada redireciona para /[slug]?erro=link-invalido', async () => {
    const slug = 'loja-carol';
    const token = createMagicToken(slug);
    const [payloadB64, sigB64] = token.split('.');
    const tamperedSig = (sigB64[0] === 'a' ? 'b' : 'a') + sigB64.slice(1);
    const tamperedToken = `${payloadB64}.${tamperedSig}`;

    const request = new Request(`http://localhost:3000/${slug}/entrar?token=${tamperedToken}`);
    const context = { params: Promise.resolve({ slug }) };

    const response = await GET(request, context);

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe(`http://localhost:3000/${slug}?erro=link-invalido`);
    expect(response.cookies.get(`auth_${slug}`)).toBeUndefined();
    expect(mockCookieStoreSet).not.toHaveBeenCalled();
  });

  it('(7) token expirado: rejeita e redireciona para /[slug]?erro=link-invalido', async () => {
    const slug = 'loja-carol';
    // Gera token expirado (exp no passado)
    const now = Math.floor(Date.now() / 1000);
    const expiredToken = signToken({
      slug,
      purpose: 'magic',
      exp: now - 100,
    });

    const request = new Request(`http://localhost:3000/${slug}/entrar?token=${expiredToken}`);
    const context = { params: Promise.resolve({ slug }) };

    const response = await GET(request, context);

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe(`http://localhost:3000/${slug}?erro=link-invalido`);
    expect(response.cookies.get(`auth_${slug}`)).toBeUndefined();
    expect(mockCookieStoreSet).not.toHaveBeenCalled();
  });

  it('(8) token de outro slug: magic token de "loja-joao" usado em "loja-carol" é rejeitado', async () => {
    const tokenOutroSlug = createMagicToken('loja-joao');

    const request = new Request(`http://localhost:3000/loja-carol/entrar?token=${tokenOutroSlug}`);
    const context = { params: Promise.resolve({ slug: 'loja-carol' }) };

    const response = await GET(request, context);

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('http://localhost:3000/loja-carol?erro=link-invalido');
    expect(response.cookies.get('auth_loja-carol')).toBeUndefined();
    expect(response.cookies.get('auth_loja-joao')).toBeUndefined();
    expect(mockCookieStoreSet).not.toHaveBeenCalled();
  });

  it('(9) purpose incompatível: token de sessão fornecido como magic link é rejeitado', async () => {
    const slug = 'loja-carol';
    const now = Math.floor(Date.now() / 1000);
    const sessionToken = signToken({
      slug,
      purpose: 'session',
      exp: now + 3600,
    });

    const request = new Request(`http://localhost:3000/${slug}/entrar?token=${sessionToken}`);
    const context = { params: Promise.resolve({ slug }) };

    const response = await GET(request, context);

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe(`http://localhost:3000/${slug}?erro=link-invalido`);
    expect(response.cookies.get(`auth_${slug}`)).toBeUndefined();
    expect(mockCookieStoreSet).not.toHaveBeenCalled();
  });

  it('(10) slug ausente ou vazio no contexto: redireciona para a raiz com erro', async () => {
    const request = new Request('http://localhost:3000/entrar?token=qualquer');
    const context = { params: Promise.resolve({ slug: '' }) };

    const response = await GET(request, context);

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('http://localhost:3000/?erro=link-invalido');
    expect(mockCookieStoreSet).not.toHaveBeenCalled();
  });

  it('(11) atributo secure do cookie: true em produção, false fora de produção', async () => {
    const slug = 'loja-carol';
    const magicToken = createMagicToken(slug);

    // Em produção
    vi.stubEnv('NODE_ENV', 'production');
    const requestProd = new Request(`http://localhost:3000/${slug}/entrar?token=${magicToken}`);
    const responseProd = await GET(requestProd, { params: Promise.resolve({ slug }) });
    const cookieProd = responseProd.cookies.get(`auth_${slug}`);
    expect(cookieProd?.secure).toBe(true);

    // Fora de produção (development)
    vi.stubEnv('NODE_ENV', 'development');
    const requestDev = new Request(`http://localhost:3000/${slug}/entrar?token=${magicToken}`);
    const responseDev = await GET(requestDev, { params: Promise.resolve({ slug }) });
    const cookieDev = responseDev.cookies.get(`auth_${slug}`);
    expect(cookieDev?.secure).toBe(false);
  });
});
