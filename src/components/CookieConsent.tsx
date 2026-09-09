import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Cookie, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { persistAttributionOnConsent } from "@/lib/attribution";

const STORAGE_KEY = "rde_cookie_consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      const t = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  const decide = (choice: "accepted" | "rejected") => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ choice, at: new Date().toISOString() }),
    );
    if (choice === "accepted") persistAttributionOnConsent();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Consentimento de cookies"
      className="fixed inset-x-0 bottom-0 z-[100] p-3 sm:p-4 animate-in slide-in-from-bottom-4 duration-500"
    >
      <div className="container max-w-4xl">
        <div className="relative rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-lg p-4 sm:p-5">
          <button
            onClick={() => decide("rejected")}
            aria-label="Fechar"
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors md:hidden"
          >
            <X size={18} />
          </button>

          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="w-10 h-10 rounded-full bg-secondary/30 flex items-center justify-center shrink-0">
                <Cookie size={20} className="text-secondary-foreground" />
              </div>
              <div className="text-sm text-foreground/90 leading-relaxed">
                <p className="font-display font-semibold text-foreground mb-1">
                  Usamos cookies
                </p>
                <p className="text-muted-foreground">
                  Utilizamos cookies essenciais para o funcionamento do site e cookies opcionais para melhorar a tua experiência.{" "}
                  <Link
                    to="/legal/privacidade#cookies"
                    className="text-primary font-medium hover:underline"
                  >
                    Saber mais
                  </Link>
                  .
                </p>
              </div>
            </div>

            <div className="flex gap-2 md:shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 md:flex-none"
                onClick={() => decide("rejected")}
              >
                Rejeitar
              </Button>
              <Button
                variant="hero"
                size="sm"
                className="flex-1 md:flex-none"
                onClick={() => decide("accepted")}
              >
                Aceitar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
