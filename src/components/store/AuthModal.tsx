'use client';

import { useState } from 'react';
import { Unlock } from 'lucide-react';
import { authenticateNamespace } from '@/app/actions';

interface AuthModalProps {
  isOpen: boolean;
  slug: string;
  onSuccess: () => void;
  onClose: () => void;
}

export function AuthModal({ isOpen, slug, onSuccess, onClose }: AuthModalProps) {
  const [authCode, setAuthCode] = useState('');
  const [authError, setAuthError] = useState('');

  if (!isOpen) return null;

  const handleClose = () => {
    setAuthCode('');
    setAuthError('');
    onClose();
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const res = await authenticateNamespace(slug, authCode);
    if (res.success) {
      setAuthCode('');
      onSuccess();
    } else {
      setAuthError(res.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-6 mx-auto">
          <Unlock size={24} className="text-slate-700" />
        </div>
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">Editar Itens</h2>
        <p className="text-center text-slate-500 mb-6 text-sm">Insira o PIN da loja para editar os itens.</p>

        <form onSubmit={handleAuth}>
          <div className="mb-6">
            <input
              type="password"
              maxLength={4}
              required
              autoFocus
              value={authCode}
              onChange={(e) => setAuthCode(e.target.value)}
              className="w-full p-4 border border-slate-200 rounded-xl text-center text-3xl tracking-[1em] focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-mono text-slate-900"
              placeholder="••••"
            />
            {authError && <p className="text-rose-500 text-sm mt-2 text-center font-medium">{authError}</p>}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-3 px-4 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-3 px-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium transition-colors shadow-sm"
            >
              Entrar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
