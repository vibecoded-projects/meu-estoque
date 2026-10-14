import type { Metadata } from "next";
import Link from "next/link";
import {
  Store,
  Sparkles,
  ArrowRight,
  ExternalLink,
  MessageCircle,
  CheckCircle2,
  Tag,
  ArrowLeft,
  ShoppingBag,
  Zap,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Explorar Vitrines Modelo",
  description:
    "Descubra exemplos reais de vitrines digitais StokFácil em Moda, Cosméticos e Acessórios. Veja como pequenos lojistas organizam o estoque e vendem pelo WhatsApp.",
  openGraph: {
    title: "Explorar Vitrines Modelo | StokFácil",
    description:
      "Descubra exemplos reais de vitrines digitais StokFácil em Moda, Cosméticos e Acessórios. Veja como pequenos lojistas organizam o estoque e vendem pelo WhatsApp.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Explorar Vitrines Modelo | StokFácil",
    description:
      "Descubra exemplos reais de vitrines digitais StokFácil em Moda, Cosméticos e Acessórios. Veja como pequenos lojistas organizam o estoque e vendem pelo WhatsApp.",
  },
};

interface ModelStore {
  name: string;
  niche: string;
  badge: string;
  badgeColor: string;
  headline: string;
  description: string;
  sampleItems: Array<{ title: string; price: string }>;
  features: string[];
  liveUrl?: string;
  ctaText: string;
  ctaHref: string;
  isLive?: boolean;
}

const MODEL_STORES: ModelStore[] = [
  {
    name: "Carol Brechó & Desapegos",
    niche: "Moda & Brechó Circular",
    badge: "Vitrine Interativa ao Vivo",
    badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-200",
    headline: "Peça única, fotos rápidas e marcação de 'Vendido' em 1 clique",
    description:
      "No nicho de brechós e moda circular, a velocidade é essencial: cada peça é única e quem chama primeiro no WhatsApp garante a compra. A Carol fotografa vestidos, casacos e acessórios direto pelo celular, compartilha os links nas redes sociais e marca o item como vendido assim que o pagamento é confirmado.",
    sampleItems: [
      { title: "Vestido Vintage Floral", price: "R$ 89,00" },
      { title: "Jaqueta Jeans Oversized", price: "R$ 139,00" },
      { title: "Bolsa Estruturada em Couro", price: "R$ 75,00" },
    ],
    features: [
      "Catálogo leve que abre instantâneo no link da bio",
      "Marcação de esgotado com 1 toque para evitar vendas duplicadas",
      "Pedidos chegam no WhatsApp já com foto e valor da peça",
    ],
    liveUrl: "/loja-carol",
    ctaText: "Acessar vitrine ao vivo",
    ctaHref: "/loja-carol",
    isLive: true,
  },
  {
    name: "Glow Cosméticos & Make",
    niche: "Beleza, Perfumaria & Autocuidado",
    badge: "Modelo para Consultoras & Revendedoras",
    badgeColor: "bg-purple-50 text-purple-800 border-purple-200",
    headline: "Pronta entrega, combos sazonais e pedidos organizados sem PDFs pesados",
    description:
      "Consultoras de beleza e revendedoras autônomas sofrem enviando PDFs pesados que lotam a memória do celular dos clientes. Com o StokFácil, a Glow organiza produtos de pronta entrega, kits de presentes para datas especiais e batons em alta, permitindo que a cliente escolha e envie a lista montada direto no WhatsApp.",
    sampleItems: [
      { title: "Batom Matte Hidratante Nude", price: "R$ 39,90" },
      { title: "Kit Sérum Facial + Hidratante", price: "R$ 119,00" },
      { title: "Body Splash Perfumado 200ml", price: "R$ 54,90" },
    ],
    features: [
      "Vitrine sempre atualizada para clientes fiéis",
      "Kits e combos para Dia das Mães, Namorados e Natal",
      "Cliente não precisa baixar app nem criar login para pedir",
    ],
    ctaText: "Criar vitrine de Cosméticos",
    ctaHref: "/#pedir-acesso",
    isLive: false,
  },
  {
    name: "Aura Acessórios & Joias",
    niche: "Semijoias, Bijuterias & Artesanato",
    badge: "Modelo para Criadores & Joalherias",
    badgeColor: "bg-sky-50 text-sky-800 border-sky-200",
    headline: "Fotos com zoom nítido, combinações de look e zero taxas sobre vendas",
    description:
      "Para quem cria semijoias, brincos e peças artesanais, a foto com detalhes de acabamento é a chave da decisão. Com o StokFácil, a Aura expõe coleções completas em alta definição. As clientes navegam pelas peças, montam combinações e enviam o pedido consolidado para o WhatsApp com total praticidade.",
    sampleItems: [
      { title: "Colar Choker Banhado a Ouro", price: "R$ 79,00" },
      { title: "Trio de Argolas Zircônia", price: "R$ 54,00" },
      { title: "Anel Solitário Regulável", price: "R$ 45,00" },
    ],
    features: [
      "Imagens nítidas que destacam brilho, textura e banho",
      "100% do valor da venda fica com a artesã via Pix",
      "Compartilhamento fácil em grupos VIP do WhatsApp",
    ],
    ctaText: "Criar vitrine de Acessórios",
    ctaHref: "/#pedir-acesso",
    isLive: false,
  },
];

const SELLING_STEPS = [
  {
    step: "1",
    title: "Fotografe e cadastre em segundos",
    description:
      "Sem cadastros demorados ou burocracia. Tire a foto pelo celular, coloque o título e o valor. Seu produto já está pronto na vitrine.",
    icon: Tag,
  },
  {
    step: "2",
    title: "Compartilhe o link onde seus clientes estão",
    description:
      "Coloque o link na bio do Instagram, poste nos stories ou mande no status do WhatsApp. O link abre rápido em qualquer aparelho.",
    icon: ShoppingBag,
  },
  {
    step: "3",
    title: "Receba pedidos prontos no WhatsApp",
    description:
      "O cliente escolhe o que deseja e clica em 'Pedir no WhatsApp'. A mensagem chega formatada com foto, nome e preço para você combinar a entrega.",
    icon: MessageCircle,
  },
];

export default function ExplorarPage() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Navigation */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-slate-900 hover:text-indigo-600 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-lg py-1 px-1.5"
            aria-label="Ir para a página inicial do StokFácil"
          >
            <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
              <Store size={18} />
            </div>
            <span className="font-bold text-base tracking-tight">StokFácil</span>
          </Link>

          <nav className="flex items-center gap-3 sm:gap-6">
            <Link
              href="/"
              className="text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors hidden sm:inline-flex items-center gap-1.5"
            >
              <ArrowLeft size={15} />
              <span>Início</span>
            </Link>
            <Link
              href="/#planos"
              className="text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors hidden md:inline-block"
            >
              Planos
            </Link>
            <Link
              href="/#pedir-acesso"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 sm:px-4 sm:py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold transition-colors shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
            >
              <span>Pedir acesso grátis</span>
              <ArrowRight size={14} />
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="w-full pt-12 pb-12 md:pt-16 md:pb-16 bg-white border-b border-slate-200/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs sm:text-sm font-medium mb-5 shadow-2xs">
            <Sparkles size={14} className="text-indigo-600" />
            <span>Vitrines Modelo & Inspiração</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15] mb-5">
            Vitrines modelo pensadas para o seu segmento
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed mb-8">
            Veja na prática como diferentes pequenos lojistas, consultores e autônomos usam o StokFácil para organizar seus estoques e transformar mensagens em vendas no WhatsApp.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm text-slate-700">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 font-medium">
              <CheckCircle2 size={14} className="text-emerald-600" />
              Sem taxa por venda
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 font-medium">
              <CheckCircle2 size={14} className="text-emerald-600" />
              Direto no celular
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 font-medium">
              <CheckCircle2 size={14} className="text-emerald-600" />
              14 dias grátis
            </span>
          </div>
        </div>
      </section>

      {/* Main Content: Showcase Grid */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 w-full">
        <div className="mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Exemplos reais de vitrines por nicho
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mt-2">
            Escolha um segmento abaixo e conheça o fluxo de vendas simplificado pelo WhatsApp.
          </p>
        </div>

        {/* Store Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          {MODEL_STORES.map((store) => (
            <article
              key={store.name}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow flex flex-col overflow-hidden"
            >
              {/* Card Header */}
              <div className="p-6 sm:p-7 border-b border-slate-100 flex-1 flex flex-col">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${store.badgeColor}`}
                  >
                    {store.badge}
                  </span>
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    {store.niche}
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-2">
                  {store.name}
                </h3>

                <p className="text-sm font-semibold text-indigo-700 mb-3">
                  {store.headline}
                </p>

                <p className="text-sm text-slate-600 leading-relaxed mb-6">
                  {store.description}
                </p>

                {/* Sample Items Preview */}
                <div className="mt-auto bg-slate-50 rounded-xl p-4 border border-slate-200/80 mb-6">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2.5">
                    Exemplos de produtos no catálogo:
                  </span>
                  <ul className="space-y-1.5 text-xs sm:text-sm">
                    {store.sampleItems.map((item) => (
                      <li
                        key={item.title}
                        className="flex items-center justify-between text-slate-800"
                      >
                        <span className="truncate pr-2 font-medium">{item.title}</span>
                        <span className="font-semibold text-emerald-700 shrink-0">
                          {item.price}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Features List */}
                <div className="space-y-2 mb-4">
                  {store.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-slate-700">
                      <CheckCircle2
                        size={16}
                        className="text-emerald-600 shrink-0 mt-0.5"
                      />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col gap-2.5">
                {store.isLive && store.liveUrl ? (
                  <>
                    <Link
                      href={store.liveUrl}
                      className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
                    >
                      <span>Acessar vitrine interativa ({store.liveUrl})</span>
                      <ExternalLink size={16} />
                    </Link>
                    <Link
                      href="/#pedir-acesso"
                      className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-medium text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300"
                    >
                      <span>Criar vitrine de brechó</span>
                      <ArrowRight size={13} />
                    </Link>
                  </>
                ) : (
                  <Link
                    href={store.ctaHref}
                    className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-colors shadow-2xs focus:outline-none focus:ring-2 focus:ring-slate-800 focus:ring-offset-1"
                  >
                    <span>{store.ctaText}</span>
                    <ArrowRight size={16} />
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>

        {/* How It Works Section */}
        <section className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 mb-16 shadow-xs">
          <div className="max-w-3xl mx-auto text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-semibold mb-3">
              <Zap size={13} className="text-emerald-600" />
              <span>Simplicidade de ponta a ponta</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-3">
              Como o StokFácil ajuda você a vender mais pelo WhatsApp
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Elimine a fricção entre ver o produto nas redes sociais e fechar o pagamento na conversa do WhatsApp.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {SELLING_STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.step}
                  className="bg-slate-50 rounded-2xl p-6 border border-slate-200/80 flex flex-col items-start"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-base mb-4 shadow-2xs">
                    {step.step}
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={18} className="text-indigo-600 shrink-0" />
                    <h3 className="text-base font-bold text-slate-900">
                      {step.title}
                    </h3>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Final Conversion CTA */}
        <section className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 rounded-3xl p-8 sm:p-12 text-white text-center shadow-lg">
          <div className="max-w-2xl mx-auto">
            <span className="inline-block px-3 py-1 rounded-full bg-indigo-800/80 border border-indigo-700 text-indigo-200 text-xs font-semibold mb-4">
              Experimente Grátis
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
              Pronto para ter seu catálogo no celular e vender mais?
            </h2>
            <p className="text-indigo-200 text-sm sm:text-base leading-relaxed mb-8">
              Crie a vitrine digital para o seu negócio em poucos minutos. Sem mensalidade inicial, sem necessidade de cartão de crédito e com 14 dias grátis de teste.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <Link
                href="/#pedir-acesso"
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-7 py-3.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-semibold text-base transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <span>Começar 14 dias grátis</span>
                <ArrowRight size={18} />
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-base transition-colors border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/40"
              >
                <span>Voltar ao início</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto py-10 border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-slate-600">
          <p className="text-center sm:text-left">
            &copy; {currentYear} StokFácil — Vitrines modelo & catálogo digital para WhatsApp
          </p>
          <div className="flex items-center gap-6">
            <Link href="/" className="hover:text-slate-900 transition-colors">
              Início
            </Link>
            <Link href="/#planos" className="hover:text-slate-900 transition-colors">
              Planos
            </Link>
            <Link href="/#pedir-acesso" className="hover:text-slate-900 transition-colors">
              Pedir Acesso
            </Link>
            <Link href="/loja-carol" className="hover:text-slate-900 transition-colors">
              Vitrine Carol (/loja-carol)
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
