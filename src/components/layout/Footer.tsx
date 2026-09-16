import { Mail, MapPin, Instagram, Facebook } from "lucide-react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/brand/Logo";
import { useT } from "@/i18n/LanguageProvider";

export function Footer() {
  const year = new Date().getFullYear();
  const { t } = useT();

  const linkCls =
    "text-primary-foreground/70 hover:text-primary-foreground transition-colors duration-300";
  const headCls =
    "text-[0.68rem] uppercase tracking-[0.24em] text-primary-foreground/50 font-semibold mb-5";

  return (
    <footer id="contacto" className="bg-forest text-primary-foreground">
      <div className="container py-16 md:py-24">
        <div className="grid grid-cols-2 md:grid-cols-12 gap-x-8 gap-y-12">
          <div className="col-span-2 md:col-span-5 md:pr-10">
            <Logo size="lg" variant="light" to="/" />
            <p className="mt-8 max-w-md font-display text-3xl font-normal leading-tight text-primary-foreground/90 md:text-4xl">
              São Tomé e Príncipe, pensado como uma viagem inteira.
            </p>
            <div className="flex flex-col gap-2.5 text-[0.9rem] font-light text-primary-foreground/70">
              <a href="mailto:info@rotasdoeden.com" className="flex items-center gap-3 hover:text-primary-foreground transition-colors">
                <Mail size={15} strokeWidth={1.5} /> info@rotasdoeden.com
              </a>
              <div className="flex items-center gap-3"><MapPin size={15} strokeWidth={1.5} /> São Tomé, STP</div>
            </div>
            <div className="flex items-center gap-3 mt-7">
              <a
                href="https://www.instagram.com/rotasdoeden?igsh=MXkxZ3VlMDhuYWdocg%3D%3D&utm_source=qr"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-10 h-10 rounded-full border border-primary-foreground/25 hover:bg-primary-foreground hover:text-eden-ink text-primary-foreground flex items-center justify-center transition-colors duration-500"
              >
                <Instagram size={16} strokeWidth={1.5} />
              </a>
              <a
                href="https://www.facebook.com/share/18VczajHfs/?mibextid=wwXIfr"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-10 h-10 rounded-full border border-primary-foreground/25 hover:bg-primary-foreground hover:text-eden-ink text-primary-foreground flex items-center justify-center transition-colors duration-500"
              >
                <Facebook size={16} strokeWidth={1.5} />
              </a>
            </div>
          </div>

          <div className="md:col-span-2 md:col-start-7">
            <h4 className={headCls}>Viajar</h4>
            <ul className="space-y-3 text-[0.9rem] font-light">
              <li><Link to="/pacotes/rotas-essencial" className={linkCls}>Pacotes</Link></li>
              <li><Link to="/guides" className={linkCls}>{t("footer.findGuides")}</Link></li>
              <li><Link to="/experiences" className={linkCls}>{t("nav.experiences")}</Link></li>
              <li><Link to="/sobre-sao-tome" className={linkCls}>{t("nav.destino")}</Link></li>
              <li><a href="/#como-funciona" className={linkCls}>{t("nav.how")}</a></li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <h4 className={headCls}>{t("footer.legal")}</h4>
            <ul className="space-y-3 text-[0.9rem] font-light">
              <li><Link to="/legal/termos" className={linkCls}>{t("footer.terms")}</Link></li>
              <li><Link to="/legal/privacidade" className={linkCls}>{t("footer.privacy")}</Link></li>
              <li><Link to="/legal/privacidade#cookies" className={linkCls}>{t("footer.cookies")}</Link></li>
              <li><Link to="/legal/reservas#cancelamentos" className={linkCls}>{t("footer.cancellations")}</Link></li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <h4 className={headCls}>{t("footer.trust")}</h4>
            <ul className="space-y-3 text-[0.9rem] font-light">
              <li><Link to="/legal/antifraude" className={linkCls}>{t("footer.antifraud")}</Link></li>
              <li><Link to="/legal/comunidade#proteccao-cliente" className={linkCls}>{t("footer.clientProtection")}</Link></li>
              <li><Link to="/legal/reservas#disputas" className={linkCls}>{t("footer.disputes")}</Link></li>
              <li><Link to="/seja-parceiro" className={linkCls}>{t("footer.partner")}</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-16 max-w-3xl border-t border-primary-foreground/15 pt-8 text-[0.8rem] font-light leading-relaxed text-primary-foreground/60">
          {t("footer.bottom")}
        </div>

        <div className="mt-8 flex flex-col md:flex-row gap-4 md:items-center md:justify-between text-[0.78rem] font-light text-primary-foreground/55">
          <p>© {year} Rotas do Éden. {t("footer.rights")}</p>
          <div className="flex gap-6">
            <Link to="/legal/termos" className={linkCls}>{t("footer.terms")}</Link>
            <Link to="/legal/privacidade" className={linkCls}>{t("footer.privacy")}</Link>
            <Link to="/legal/parcerias" className={linkCls}>{t("footer.ip")}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
