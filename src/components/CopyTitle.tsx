'use client';

import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

export function CopyTitle({ title }: { title: string }) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(title);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2">
      <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
      <button 
        onClick={handleCopy}
        className="text-gray-400 hover:text-indigo-600 transition-colors p-1.5 rounded-lg hover:bg-indigo-50"
        title="Copiar título"
      >
        {isCopied ? <Check size={22} className="text-emerald-500" /> : <Copy size={22} />}
      </button>
    </div>
  );
}
