import { Leaf, Mail, Phone, MapPin } from "lucide-react";

export function Footer() {
  return (
    <footer id="contacto" className="bg-foreground text-primary-foreground">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
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
              <li>Encontrar Guias</li>
              <li>Como Funciona</li>
              <li>Termos de Uso</li>
              <li>Política de Privacidade</li>
            </ul>
          </div>
          <div>
            <h4 className="font-display font-semibold mb-3">Para Guias</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/60">
              <li>Registar como Guia</li>
              <li>Central de Ajuda</li>
              <li>Comissões</li>
              <li>Requisitos</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-primary-foreground/10 mt-8 pt-6 text-center text-xs text-primary-foreground/40">
          © 2024 Rotas do Éden. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
