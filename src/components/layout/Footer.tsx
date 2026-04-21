import { Leaf, Mail, Phone, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer id="contacto" className="bg-foreground text-primary-foreground">
      <div className="container py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <Leaf size={18} className="text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-xl">Rotas do Éden</span>
            </div>
            <p className="text-primary-foreground/70 text-sm max-w-sm mb-4">
              Descobre São Tomé e Príncipe com guias turísticos licenciados e verificados. A tua aventura começa aqui.
            </p>
            <div className="flex flex-col gap-2 text-sm text-primary-foreground/60">
              <div className="flex items-center gap-2"><Mail size={14} /> info@rotasdoeden.st</div>
              <div className="flex items-center gap-2"><Phone size={14} /> +239 222 0000</div>
              <div className="flex items-center gap-2"><MapPin size={14} /> São Tomé, STP</div>
            </div>
          </div>

          <div>
            <h4 className="font-display font-semibold mb-3">Plataforma</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/60">
              <li><Link to="/guides" className="hover:text-primary-foreground transition-colors">Encontrar Guias</Link></li>
              <li><a href="/#como-funciona" className="hover:text-primary-foreground transition-colors">Como Funciona</a></li>
              <li><a href="/#contacto" className="hover:text-primary-foreground transition-colors">Contacto</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold mb-3">Legal</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/60">
              <li><Link to="/legal/termos" className="hover:text-primary-foreground transition-colors">Termos de Serviço</Link></li>
              <li><Link to="/legal/privacidade" className="hover:text-primary-foreground transition-colors">Privacidade</Link></li>
              <li><Link to="/legal/privacidade#cookies" className="hover:text-primary-foreground transition-colors">Cookies</Link></li>
              <li><Link to="/legal/reservas#cancelamentos" className="hover:text-primary-foreground transition-colors">Cancelamentos</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold mb-3">Confiança</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/60">
              <li><Link to="/legal/antifraude" className="hover:text-primary-foreground transition-colors">Protecção Antifraude</Link></li>
              <li><Link to="/legal/comunidade#proteccao-cliente" className="hover:text-primary-foreground transition-colors">Protecção do Cliente</Link></li>
              <li><Link to="/legal/reservas#disputas" className="hover:text-primary-foreground transition-colors">Disputas</Link></li>
              <li><Link to="/legal/guias" className="hover:text-primary-foreground transition-colors">Seja Parceiro</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/10 mt-10 pt-6 flex flex-col md:flex-row gap-3 md:items-center md:justify-between text-xs text-primary-foreground/50">
          <p>© {year} Rotas do Éden. Todos os direitos reservados. Marketplace independente de experiências turísticas em São Tomé e Príncipe.</p>
          <div className="flex gap-4">
            <Link to="/legal/termos" className="hover:text-primary-foreground transition-colors">Termos</Link>
            <Link to="/legal/privacidade" className="hover:text-primary-foreground transition-colors">Privacidade</Link>
            <Link to="/legal/parcerias" className="hover:text-primary-foreground transition-colors">Propriedade Intelectual</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
