import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  verifyMagicToken,
  signToken,
  SESSION_DURATION_SECONDS,
} from '@/lib/session';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ slug: string }>;
}

/**
 * Route Handler para autenticação via Magic Link (T12 / D2).
 *
 * Endpoint: GET /[slug]/entrar?token=... (ou ?auth_token=...)
 *
 * Fluxo:
 * 1. Extrai o token do query parameter (?token ou ?auth_token).
 * 2. Valida criptograficamente o token via HMAC-SHA256 (purpose 'magic', slug correspondente e não expirado).
 * 3. Se válido:
 *    - Emite novo token de sessão de 7 dias (purpose 'session').
 *    - Grava o cookie auth_<slug> (httpOnly, sameSite lax, secure em prod, maxAge 7 dias, path '/').
 *    - Redireciona via HTTP 303 (See Other) para /[slug].
 * 4. Se inválido ou ausente:
 *    - Redireciona via HTTP 303 para /[slug]?erro=link-invalido.
 */
export async function GET(
  request: Request,
  context: RouteContext
): Promise<NextResponse> {
  const resolvedParams = await Promise.resolve(context?.params);
  const slug = resolvedParams?.slug;

  // Se o slug for inválido ou ausente, redireciona para a raiz com parâmetro de erro
  if (!slug || typeof slug !== 'string' || slug.trim().length === 0) {
    const fallbackUrl = new URL('/?erro=link-invalido', request.url);
    return NextResponse.redirect(fallbackUrl, 303);
  }

  const cleanSlug = slug.trim();
  const url = new URL(request.url);
  const rawToken = url.searchParams.get('token') || url.searchParams.get('auth_token');
  const token = rawToken?.trim();

  // Token ausente ou vazio
  if (!token) {
    const errorUrl = new URL(`/${cleanSlug}?erro=link-invalido`, request.url);
    return NextResponse.redirect(errorUrl, 303);
  }

  // Validação criptográfica do Magic Link
  const isValid = verifyMagicToken(token, cleanSlug);
  if (!isValid) {
    const errorUrl = new URL(`/${cleanSlug}?erro=link-invalido`, request.url);
    return NextResponse.redirect(errorUrl, 303);
  }

  // Gera novo token de sessão de 7 dias com purpose 'session'
  const now = Math.floor(Date.now() / 1000);
  const sessionToken = signToken({
    slug: cleanSlug,
    purpose: 'session',
    exp: now + SESSION_DURATION_SECONDS,
  });

  const cookieName = `auth_${cleanSlug}`;
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: SESSION_DURATION_SECONDS,
    path: '/',
  };

  // Atualiza o cookieStore do Next.js se executado em contexto de request compatível
  try {
    const cookieStore = await cookies();
    cookieStore.set(cookieName, sessionToken, cookieOptions);
  } catch {
    // Permite execução fora de contexto de request do Next (ex.: testes unitários isolados)
  }

  // Cria a resposta com redirecionamento HTTP 303 e adiciona o cabeçalho Set-Cookie
  const destinationUrl = new URL(`/${cleanSlug}`, request.url);
  const response = NextResponse.redirect(destinationUrl, 303);
  response.cookies.set(cookieName, sessionToken, cookieOptions);

  return response;
}
