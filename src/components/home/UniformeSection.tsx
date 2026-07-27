import { ShieldCheck, BadgeCheck, QrCode } from "lucide-react";
import { useT } from "@/i18n/LanguageProvider";
import { Reveal } from "@/components/ui/reveal";

export function UniformeSection() {
  const { t } = useT();
  const items = [
    { Icon: ShieldCheck, title: t("uniforme.item1.title"), text: t("uniforme.item1.text") },
    { Icon: BadgeCheck, title: t("uniforme.item2.title"), text: t("uniforme.item2.text") },
    { Icon: QrCode, title: t("uniforme.item3.title"), text: t("uniforme.item3.text") },
  ];

  return (
    <section className="py-20 md:py-28 bg-background">
      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
          <Reveal className="lg:col-span-5">
            <span className="eyebrow mb-6">{t("uniforme.eyebrow")}</span>
            <h2 className="display-md text-foreground mt-5 mb-5">{t("uniforme.title")}</h2>
            <p className="body-copy">{t("uniforme.lead")}</p>
          </Reveal>

          <div className="lg:col-span-6 lg:col-start-7">
            <ul>
              {items.map(({ Icon, title, text }, i) => (
                <Reveal
                  as="li"
                  key={title}
                  delay={i * 100}
                  className="flex gap-5 py-6 border-t border-border last:border-b"
                >
                  <Icon size={20} className="text-primary shrink-0 mt-1" strokeWidth={1.5} />
                  <div>
                    <p className="font-display text-xl text-foreground leading-snug mb-1.5">{title}</p>
                    <p className="text-[0.93rem] text-muted-foreground leading-[1.8] font-light">{text}</p>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
