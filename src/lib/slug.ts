/**
 * StokFácil — Utilitários de higienização e validação de slug
 *
 * Slugs identificam lojas na plataforma (ex.: stokfacil.com/sua-loja).
 * Devem ser amigáveis para URL, sem acentos, sem caracteres especiais e
 * não colidir com rotas reservadas do sistema.
 */

export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  'admin',
  'ajuda',
  'api',
  'app',
  'auth',
  'checkout',
  'configuracoes',
  'contato',
  'dashboard',
  'entrar',
  'favicon',
  'home',
  'leads',
  'login',
  'lojas',
  'manifest',
  'pedidos',
  'privacidade',
  'public',
  'robots',
  'sitemap',
  'static',
  'stokfacil',
  'suporte',
  'termos',
  '_next',
]);

/**
 * Converte qualquer texto para um slug válido:
 * - Converte para minúsculas
 * - Remove acentos diacríticos
 * - Converte espaços e underlines para hífens
 * - Remove quaisquer caracteres inválidos (mantendo apenas [a-z0-9-])
 * - Reduz múltiplos hífens para hífen único
 * - Remove hífens das extremidades
 * - Limita tamanho máximo em 40 caracteres
 */
export function sanitizeSlug(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  const sanitized = input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacríticos/acentos
    .replace(/[\s_]+/g, '-') // converte espaços e underlines em hífen
    .replace(/[^a-z0-9-]/g, '') // mantém apenas letras, números e hífen
    .replace(/-+/g, '-') // unifica hífens consecutivos
    .replace(/^-+|-+$/g, ''); // remove hífens das extremidades

  // Limita a no máximo 40 caracteres
  if (sanitized.length > 40) {
    return sanitized.slice(0, 40).replace(/-+$/, '');
  }

  return sanitized;
}

/**
 * Valida se um slug cumpre todos os critérios técnicos da plataforma:
 * - Tamanho entre 3 e 40 caracteres
 * - Composto unicamente por [a-z0-9] separados por hífens únicos (sem hífens nas pontas)
 * - Não consta na lista de slugs reservados do sistema
 */
export function isValidSlug(slug: string): boolean {
  if (!slug || typeof slug !== 'string') {
    return false;
  }

  if (slug.length < 3 || slug.length > 40) {
    return false;
  }

  // Permite apenas letras minúsculas e números, opcionalmente separados por hífens únicos
  // Rejeita hífens no início, no fim ou repetidos (--), assim como caracteres inválidos ou maiúsculas
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  if (!slugRegex.test(slug)) {
    return false;
  }

  if (RESERVED_SLUGS.has(slug)) {
    return false;
  }

  return true;
}
