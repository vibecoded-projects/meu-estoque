#!/usr/bin/env node
/**
 * StokFácil — Script do Operador: Ativar loja a partir de um lead (T13)
 *
 * Uso:
 *   npx tsx scripts/activate-lead.ts <slug> [--dry-run]
 *   npm run ops:activate -- <slug> [--dry-run]
 *   npm run ops:activate -- --slug <slug> [--dry-run]
 */

import fs from 'node:fs';
import path from 'node:path';
import { loadEnvConfig } from '@next/env';

// 1. Carrega variáveis de ambiente (.env.local, .env, etc.)
try {
  loadEnvConfig(process.cwd());
} catch {
  // Ignora erro se @next/env falhar em algum ambiente específico
}

// Fallback de leitura de .env.local caso o ambiente não o tenha povoado
function loadEnvLocalFallback(): void {
  const envLocalPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envLocalPath)) {
    const content = fs.readFileSync(envLocalPath, 'utf8');
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eqIdx = line.indexOf('=');
      if (eqIdx > 0) {
        const key = line.slice(0, eqIdx).trim();
        let val = line.slice(eqIdx + 1).trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}
loadEnvLocalFallback();

// 2. Importa dependências da aplicação após o carregamento das env vars
import { parseCliArgs, activateLead } from '../src/lib/activate-lead';

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

function printHelp(): void {
  console.log(`
${BOLD}${CYAN}StokFácil — Ativação de Loja a partir de Lead${RESET}

${BOLD}Uso:${RESET}
  npx tsx scripts/activate-lead.ts <slug> [--dry-run]
  npm run ops:activate -- <slug> [--dry-run]
  npm run ops:activate -- --slug <slug> [--dry-run]

${BOLD}Opções:${RESET}
  <slug>         Slug solicitado pelo lead (ex: brecho-da-carol)
  --slug <slug>  Slug informado explicitamente por flag
  --dry-run, -d  Simula a ativação sem gravar nada no banco de dados
  --help, -h     Exibe esta mensagem de ajuda
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  const { slug, dryRun } = parseCliArgs(args);

  if (!slug) {
    console.error(
      `${RED}❌ Erro: O slug do lead é obrigatório.${RESET}\n` +
      `Uso: npm run ops:activate -- <slug> [--dry-run]\n` +
      `Exemplo: npm run ops:activate -- brecho-da-carol --dry-run`
    );
    process.exit(1);
  }

  const result = await activateLead({ slug, dryRun });

  if (!result.success) {
    console.error(`${RED}❌ Erro: ${result.error}${RESET}`);
    process.exit(1);
  }

  const lineSeparator = '─'.repeat(64);

  if (result.isDryRun) {
    console.log(`
${YELLOW}${BOLD}[DRY-RUN] Simulação de ativação de lead concluída!${RESET}
${YELLOW}Nenhuma alteração foi gravada no banco de dados.${RESET}

${BOLD}📋 Detalhes do Lead:${RESET}
  • Loja: ${result.storeName}
  • Contato: ${result.lead.contact_name}
  • WhatsApp: ${result.whatsapp}
  • Slug: ${result.slug}

${BOLD}🔐 Acesso Gerado (Simulação):${RESET}
  • PIN: ${BOLD}${result.pin}${RESET}
  • Vitrine: ${result.storeUrl}
  • Magic Link: ${result.magicLink}

${BOLD}📱 Mensagem pronta para enviar no WhatsApp:${RESET}
${CYAN}${lineSeparator}${RESET}
${result.whatsappMessage}
${CYAN}${lineSeparator}${RESET}
`);
  } else {
    console.log(`
${GREEN}${BOLD}🎉 Loja ativada com sucesso!${RESET}

${BOLD}📋 Dados gravados:${RESET}
  • ID da Loja: ${result.namespaceId}
  • Loja: ${result.storeName} (${result.slug})
  • WhatsApp: ${result.whatsapp}
  • Status: active
  • Plano: trial (14 dias até ${result.trialExpiresAt.toISOString()})
  • Lead: marcado como 'converted'

${BOLD}🔐 Acesso do Lojista:${RESET}
  • PIN: ${BOLD}${result.pin}${RESET}
  • Vitrine: ${result.storeUrl}
  • Magic Link: ${result.magicLink}

${BOLD}📱 Copie e envie a mensagem abaixo no WhatsApp do lojista:${RESET}
${GREEN}${lineSeparator}${RESET}
${result.whatsappMessage}
${GREEN}${lineSeparator}${RESET}
`);
  }

  process.exit(0);
}

// Execução segura da CLI
main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`${RED}❌ Erro inesperado ao ativar lead: ${message}${RESET}`);
  process.exit(1);
});
