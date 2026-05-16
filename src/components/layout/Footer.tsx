import { Mail, Phone, MapPin, Instagram, Facebook } from "lucide-react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/brand/Logo";
import { useT } from "@/i18n/LanguageProvider";

export function Footer() {
  const year = new Date().getFullYear();
  const { t } = useT();
  return (
    <footer id="contacto" className="bg-foreground text-primary-foreground">
      <div className="container py-14">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2">
            <Logo size="md" variant="light" to="/" />
            <p className="text-primary-foreground/90 text-sm max-w-sm mb-4 mt-4 leading-relaxed">
              {t("footer.tagline")}
            </p>
            <div className="flex flex-col gap-2 text-sm text-primary-foreground/85">
              <div className="flex items-center gap-2"><Mail size={14} /> info@rotasdoeden.com</div>
              <div className="flex items-center gap-2"><MapPin size={14} /> São Tomé, STP</div>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <a
                href="https://www.instagram.com/rotasdoeden?igsh=MXkxZ3VlMDhuYWdocg%3D%3D&utm_source=qr"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-9 h-9 rounded-full bg-primary-foreground/10 hover:bg-secondary hover:text-foreground text-primary-foreground flex items-center justify-center transition-colors"
              >
                <Instagram size={16} />
              </a>
              <a
                href="https://www.facebook.com/share/18VczajHfs/?mibextid=wwXIfr"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-9 h-9 rounded-full bg-primary-foreground/10 hover:bg-secondary hover:text-foreground text-primary-foreground flex items-center justify-center transition-colors"
              >
                <Facebook size={16} />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-display font-semibold mb-3">{t("footer.platform")}</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/85">
              <li><Link to="/guides" className="hover:text-primary-foreground transition-colors">{t("footer.findGuides")}</Link></li>
              <li><a href="/#como-funciona" className="hover:text-primary-foreground transition-colors">{t("nav.how")}</a></li>
              <li><a href="/#contacto" className="hover:text-primary-foreground transition-colors">{t("nav.contact")}</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold mb-3">{t("footer.legal")}</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/85">
              <li><Link to="/legal/termos" className="hover:text-primary-foreground transition-colors">{t("footer.terms")}</Link></li>
              <li><Link to="/legal/privacidade" className="hover:text-primary-foreground transition-colors">{t("footer.privacy")}</Link></li>
              <li><Link to="/legal/privacidade#cookies" className="hover:text-primary-foreground transition-colors">{t("footer.cookies")}</Link></li>
              <li><Link to="/legal/reservas#cancelamentos" className="hover:text-primary-foreground transition-colors">{t("footer.cancellations")}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold mb-3">{t("footer.trust")}</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/85">
              <li><Link to="/legal/antifraude" className="hover:text-primary-foreground transition-colors">{t("footer.antifraud")}</Link></li>
              <li><Link to="/legal/comunidade#proteccao-cliente" className="hover:text-primary-foreground transition-colors">{t("footer.clientProtection")}</Link></li>
              <li><Link to="/legal/reservas#disputas" className="hover:text-primary-foreground transition-colors">{t("footer.disputes")}</Link></li>
              <li><Link to="/seja-parceiro" className="hover:text-primary-foreground transition-colors">{t("footer.partner")}</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/10 mt-10 pt-6 text-xs text-primary-foreground/85 text-center md:text-left">
          {t("footer.bottom")}
        </div>

        <div className="border-t border-primary-foreground/10 mt-6 pt-6 flex flex-col md:flex-row gap-3 md:items-center md:justify-between text-xs text-primary-foreground/80">
          <p>© {year} Rotas do Éden. {t("footer.rights")}</p>
          <div className="flex gap-4">
            <Link to="/legal/termos" className="hover:text-primary-foreground transition-colors">{t("footer.terms")}</Link>
            <Link to="/legal/privacidade" className="hover:text-primary-foreground transition-colors">{t("footer.privacy")}</Link>
            <Link to="/legal/parcerias" className="hover:text-primary-foreground transition-colors">{t("footer.ip")}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
