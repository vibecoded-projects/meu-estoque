"use client";

import React, { useState } from "react";
import {
  MessageCircle,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Globe,
  AlertCircle,
  Loader2,
  Store,
  User,
  Phone,
  Layers,
} from "lucide-react";
import { submitLead } from "@/app/leads/actions";
import { INVENTORY_METHODS, type SubmitLeadResult } from "@/lib/leads";
import { formatBrazilianPhone } from "@/lib/phone";
import { sanitizeSlug, isValidSlug } from "@/lib/slug";

export function LeadCaptureForm() {
  const [contactName, setContactName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [whatsapp, setWhatsapp] = useState("");
  const [inventoryMethod, setInventoryMethod] = useState("");
  const [honeypot, setHoneypot] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successResult, setSuccessResult] = useState<SubmitLeadResult | null>(null);

  // Sugere automaticamente o slug a partir do nome da loja caso o lojista ainda não tenha editado manualmente
  const handleStoreNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setStoreName(val);
    if (!slugTouched) {
      setSlug(sanitizeSlug(val));
    }
    if (fieldErrors.store_name) {
      setFieldErrors((prev) => ({ ...prev, store_name: "" }));
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlugTouched(true);
    // Higieniza caracteres enquanto o lojista digita
    const sanitized = sanitizeSlug(e.target.value);
    setSlug(sanitized);
    if (fieldErrors.slug) {
      setFieldErrors((prev) => ({ ...prev, slug: "" }));
    }
  };

  const handleWhatsappChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatBrazilianPhone(e.target.value);
    setWhatsapp(formatted);
    if (fieldErrors.whatsapp) {
      setFieldErrors((prev) => ({ ...prev, whatsapp: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setGeneralError(null);
    setFieldErrors({});

    // Validação preliminar client-side amigável
    const errors: Record<string, string> = {};
    if (!contactName.trim()) {
      errors.contact_name = "Informe seu nome.";
    }
    if (!storeName.trim()) {
      errors.store_name = "Informe o nome da sua loja.";
    }
    const finalSlug = sanitizeSlug(slug);
    if (!finalSlug || !isValidSlug(finalSlug)) {
      errors.slug =
        "Link inválido. Escolha entre 3 e 40 letras, números ou hífens (sem nomes reservados).";
    }
    if (!whatsapp.trim()) {
      errors.whatsapp = "Informe seu WhatsApp com DDD.";
    }
    if (!inventoryMethod) {
      errors.current_inventory_method = "Selecione como você controla seu estoque hoje.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setGeneralError("Por favor, preencha todos os campos destacados.");
      return;
    }

    setIsLoading(true);

    try {
      const fd = new FormData();
      fd.append("contact_name", contactName.trim());
      fd.append("store_name", storeName.trim());
      fd.append("slug", finalSlug);
      fd.append("whatsapp", whatsapp.trim());
      fd.append("current_inventory_method", inventoryMethod);
      if (honeypot) {
        fd.append("website", honeypot);
      }

      const res = await submitLead(fd);

      if (res.success) {
        setSuccessResult(res);
      } else {
        setGeneralError(res.error || "Não foi possível enviar seu pedido. Verifique os campos.");
        if (res.fieldErrors) {
          setFieldErrors(res.fieldErrors);
        }
      }
    } catch (err) {
      console.error("[LeadCaptureForm] Erro na submissão:", err);
      setGeneralError("Falha de conexão. Por favor, tente novamente em instantes.");
    } finally {
      setIsLoading(false);
    }
  };

  // Preview dinâmico do slug pretendido
  const previewSlug = sanitizeSlug(slug) || "sua-loja";

  // Se o envio foi bem-sucedido, exibe a tela de confirmação (RF04)
  if (successResult) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-10 shadow-sm max-w-xl mx-auto text-center animate-in fade-in zoom-in-95 duration-300">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 mb-6 shadow-xs">
          <CheckCircle2 size={36} />
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold mb-3">
          <Sparkles size={14} className="text-emerald-600" />
          <span>Solicitação Confirmada</span>
        </div>

        <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-3">
          Pedido recebido com sucesso!
        </h3>

        {/* Mensagem exata exigida pelo requisito RF04 */}
        <p className="text-base sm:text-lg text-slate-700 leading-relaxed font-medium mb-6">
          {successResult.message ||
            "Seu pedido foi recebido! Em instantes você receberá seu link e PIN no WhatsApp."}
        </p>

        {/* Detalhes do cadastro */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 mb-8 text-left space-y-2 text-sm text-slate-700">
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
            <span className="text-slate-500 font-medium">Loja solicitada:</span>
            <span className="font-bold text-slate-900">{storeName}</span>
          </div>
          <div className="flex items-center justify-between border-b border-slate-200/60 py-2">
            <span className="text-slate-500 font-medium">Link da vitrine:</span>
            <span className="font-mono font-semibold text-indigo-700">stokfacil.com/{previewSlug}</span>
          </div>
          <div className="flex items-center justify-between pt-2">
            <span className="text-slate-500 font-medium">WhatsApp:</span>
            <span className="font-semibold text-slate-900">{whatsapp}</span>
          </div>
        </div>

        {/* Botão Acelerar Ativação via WhatsApp (RF04 / D8) */}
        {successResult.whatsappAdminUrl && (
          <div className="space-y-3">
            <a
              href={successResult.whatsappAdminUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2.5 w-full px-6 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow-sm hover:shadow transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              <MessageCircle size={20} className="fill-current" />
              <span>Acelerar ativação via WhatsApp</span>
            </a>
            <p className="text-xs text-slate-700">
              Clique para falar diretamente com nosso atendimento e ter sua loja liberada em minutos.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-10 shadow-sm max-w-xl mx-auto text-left">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs sm:text-sm font-semibold mb-3">
          <Sparkles size={16} className="text-emerald-600" />
          <span>Teste Grátis por 14 Dias</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
          Peça seu acesso à vitrine
        </h2>
        <p className="text-sm sm:text-base text-slate-600">
          Preencha os dados abaixo e ativamos sua loja personalizada sem compromisso.
        </p>
      </div>

      {generalError && (
        <div
          role="alert"
          className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3"
        >
          <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block mb-0.5">Atenção</span>
            <span>{generalError}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {/* Campo Honeypot anti-spam (invisível para humanos) */}
        <div
          className="opacity-0 absolute -z-50 pointer-events-none h-0 w-0 overflow-hidden"
          aria-hidden="true"
        >
          <label htmlFor="website">Website (deixe em branco se for humano)</label>
          <input
            type="text"
            id="website"
            name="website"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        {/* 1. Nome do Responsável */}
        <div>
          <label
            htmlFor="contact_name"
            className="block text-sm font-semibold text-slate-900 mb-1.5"
          >
            Seu Nome <span className="text-rose-600">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <User size={18} />
            </div>
            <input
              type="text"
              id="contact_name"
              name="contact_name"
              value={contactName}
              onChange={(e) => {
                setContactName(e.target.value);
                if (fieldErrors.contact_name) {
                  setFieldErrors((prev) => ({ ...prev, contact_name: "" }));
                }
              }}
              placeholder="Ex: Ana Silva"
              required
              className={`w-full pl-10 pr-4 py-3 bg-white border ${
                fieldErrors.contact_name
                  ? "border-rose-400 focus:ring-rose-500"
                  : "border-slate-300 focus:ring-indigo-600"
              } rounded-xl text-slate-900 placeholder:text-slate-400 text-base sm:text-sm focus:outline-none focus:ring-2 transition-colors`}
            />
          </div>
          {fieldErrors.contact_name && (
            <p className="mt-1.5 text-xs text-rose-700 font-medium">
              {fieldErrors.contact_name}
            </p>
          )}
        </div>

        {/* 2. Nome da Loja */}
        <div>
          <label
            htmlFor="store_name"
            className="block text-sm font-semibold text-slate-900 mb-1.5"
          >
            Nome da Loja <span className="text-rose-600">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Store size={18} />
            </div>
            <input
              type="text"
              id="store_name"
              name="store_name"
              value={storeName}
              onChange={handleStoreNameChange}
              placeholder="Ex: Brechó da Ana"
              required
              className={`w-full pl-10 pr-4 py-3 bg-white border ${
                fieldErrors.store_name
                  ? "border-rose-400 focus:ring-rose-500"
                  : "border-slate-300 focus:ring-indigo-600"
              } rounded-xl text-slate-900 placeholder:text-slate-400 text-base sm:text-sm focus:outline-none focus:ring-2 transition-colors`}
            />
          </div>
          {fieldErrors.store_name && (
            <p className="mt-1.5 text-xs text-rose-700 font-medium">
              {fieldErrors.store_name}
            </p>
          )}
        </div>

        {/* 3. Link pretendido para vitrine (Slug com prévia) */}
        <div>
          <label
            htmlFor="slug"
            className="block text-sm font-semibold text-slate-900 mb-1.5"
          >
            Link pretendido para sua vitrine <span className="text-rose-600">*</span>
          </label>
          <div className="flex rounded-xl shadow-2xs">
            <span className="inline-flex items-center px-3.5 rounded-l-xl border border-r-0 border-slate-300 bg-slate-100 text-slate-600 font-mono text-xs sm:text-sm font-semibold select-none">
              stokfacil.com/
            </span>
            <input
              type="text"
              id="slug"
              name="slug"
              value={slug}
              onChange={handleSlugChange}
              placeholder="sua-loja"
              required
              className={`w-full px-3.5 py-3 bg-white border ${
                fieldErrors.slug
                  ? "border-rose-400 focus:ring-rose-500"
                  : "border-slate-300 focus:ring-indigo-600"
              } rounded-r-xl font-mono text-slate-900 placeholder:text-slate-400 text-base sm:text-sm focus:outline-none focus:ring-2 transition-colors`}
            />
          </div>

          {/* Prévia do link em tempo real */}
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-700 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-lg">
            <Globe size={13} className="text-indigo-600 shrink-0" />
            <span>Sua vitrine será:</span>
            <span className="font-mono font-bold text-indigo-700">
              stokfacil.com/{previewSlug}
            </span>
          </div>

          {fieldErrors.slug && (
            <p className="mt-1.5 text-xs text-rose-700 font-medium">
              {fieldErrors.slug}
            </p>
          )}
        </div>

        {/* 4. WhatsApp com DDD */}
        <div>
          <label
            htmlFor="whatsapp"
            className="block text-sm font-semibold text-slate-900 mb-1.5"
          >
            WhatsApp Comercial (com DDD) <span className="text-rose-600">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Phone size={18} />
            </div>
            <input
              type="tel"
              id="whatsapp"
              name="whatsapp"
              value={whatsapp}
              onChange={handleWhatsappChange}
              placeholder="(11) 99999-9999"
              required
              className={`w-full pl-10 pr-4 py-3 bg-white border ${
                fieldErrors.whatsapp
                  ? "border-rose-400 focus:ring-rose-500"
                  : "border-slate-300 focus:ring-indigo-600"
              } rounded-xl text-slate-900 placeholder:text-slate-400 text-base sm:text-sm focus:outline-none focus:ring-2 transition-colors`}
            />
          </div>
          {fieldErrors.whatsapp && (
            <p className="mt-1.5 text-xs text-rose-700 font-medium">
              {fieldErrors.whatsapp}
            </p>
          )}
        </div>

        {/* 5. Formato Atual do Estoque */}
        <div>
          <label
            htmlFor="current_inventory_method"
            className="block text-sm font-semibold text-slate-900 mb-1.5"
          >
            Como você controla seu estoque hoje? <span className="text-rose-600">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Layers size={18} />
            </div>
            <select
              id="current_inventory_method"
              name="current_inventory_method"
              value={inventoryMethod}
              onChange={(e) => {
                setInventoryMethod(e.target.value);
                if (fieldErrors.current_inventory_method) {
                  setFieldErrors((prev) => ({ ...prev, current_inventory_method: "" }));
                }
              }}
              required
              className={`w-full pl-10 pr-4 py-3 bg-white border ${
                fieldErrors.current_inventory_method
                  ? "border-rose-400 focus:ring-rose-500"
                  : "border-slate-300 focus:ring-indigo-600"
              } rounded-xl text-slate-900 text-base sm:text-sm focus:outline-none focus:ring-2 transition-colors`}
            >
              <option value="" disabled>
                Selecione uma opção...
              </option>
              {INVENTORY_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </div>
          {fieldErrors.current_inventory_method && (
            <p className="mt-1.5 text-xs text-rose-700 font-medium">
              {fieldErrors.current_inventory_method}
            </p>
          )}
        </div>

        {/* Botão de Envio */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-base shadow-sm hover:shadow transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 cursor-pointer disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>Enviando seu pedido...</span>
              </>
            ) : (
              <>
                <span>Começar 14 dias grátis</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
          <p className="text-center text-xs text-slate-700 mt-3">
            Sem cartão de crédito · Ativação rápida · Suporte no WhatsApp
          </p>
        </div>
      </form>
    </div>
  );
}
