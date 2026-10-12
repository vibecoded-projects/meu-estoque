import { MessageCircle, Share2, CheckCircle2 } from "lucide-react";

export function FeaturesSection() {
  const features = [
    {
      title: "Vitrine no WhatsApp",
      description:
        "Seus clientes escolhem as peças e clicam em 'Pedir no WhatsApp'. A mensagem já chega pronta com foto, título e valor, sem comissão por venda.",
      icon: MessageCircle,
      badge: "Vendas Diretas",
      iconColor: "text-emerald-600",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200",
    },
    {
      title: "Catálogo 1-clique",
      description:
        "Link limpo e profissional para colocar na Bio do Instagram. Botões de compartilhamento rápido com fotos e legendas prontas com emojis.",
      icon: Share2,
      badge: "Pronto para o Instagram",
      iconColor: "text-indigo-600",
      bgColor: "bg-indigo-50",
      borderColor: "border-indigo-200",
    },
    {
      title: "Controle no bolso",
      description:
        "Adeus cadernos e planilhas confusas. Alterne entre 'Disponível' e 'Vendido' com um único toque direto no celular, de onde você estiver.",
      icon: CheckCircle2,
      badge: "Simplicidade Total",
      iconColor: "text-sky-600",
      bgColor: "bg-sky-50",
      borderColor: "border-sky-200",
    },
  ];

  return (
    <section className="w-full py-16 md:py-20 bg-slate-50 border-y border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            Tudo o que você precisa para vender todos os dias
          </h2>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            Desenvolvido sob medida para a rotina rápida de brechós, autônomos e lojistas que vendem pelas redes sociais.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs hover:shadow-md transition-shadow flex flex-col"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className={`p-3 rounded-xl ${feature.bgColor} ${feature.iconColor}`}>
                    <Icon size={26} />
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${feature.bgColor} ${feature.borderColor} text-slate-700`}>
                    {feature.badge}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-slate-600 text-sm sm:text-base leading-relaxed mt-auto">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
