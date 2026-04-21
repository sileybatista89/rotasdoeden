import { ShieldAlert } from "lucide-react";

export function AntiFraudBanner() {
  return (
    <div className="bg-secondary/15 border border-secondary/30 rounded-lg p-3 flex gap-3 items-start">
      <ShieldAlert size={18} className="text-secondary-foreground flex-shrink-0 mt-0.5" />
      <div className="text-xs text-secondary-foreground">
        <strong className="font-semibold">Política anti-fraude:</strong> toda a comunicação e pagamentos devem ocorrer
        dentro da plataforma. Contactos externos (telefone, email, redes sociais) e métodos de pagamento externos serão
        automaticamente filtrados e podem levar à suspensão da conta.
      </div>
    </div>
  );
}
