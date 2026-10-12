import Link from 'next/link';

interface StoreFooterProps {
  isWhiteLabel?: boolean;
}

export function StoreFooter({ isWhiteLabel = false }: StoreFooterProps) {
  if (isWhiteLabel) {
    return null;
  }

  return (
    <footer className="mt-12 py-8 text-center border-t border-slate-200">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-indigo-600 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded px-2 py-1"
      >
        <span>Criado com</span>
        <strong className="font-semibold text-slate-800 hover:text-indigo-600">StokFácil</strong>
        <span>— Crie sua vitrine grátis</span>
      </Link>
    </footer>
  );
}
