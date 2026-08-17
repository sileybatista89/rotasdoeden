import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props { children: ReactNode }
interface State { hasError: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(): State { return { hasError: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("Erro de interface recuperável", error, info); }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-5">
        <section className="w-full max-w-md text-center" aria-labelledby="recovery-title">
          <AlertTriangle className="mx-auto mb-5 text-primary" size={38} aria-hidden="true" />
          <h1 id="recovery-title" className="font-display text-3xl font-bold text-foreground mb-3">Não foi possível abrir esta página</h1>
          <p className="text-muted-foreground mb-6">A ligação pode ter sido interrompida. Atualiza a página para continuar em segurança.</p>
          <Button variant="hero" onClick={() => window.location.reload()}><RefreshCw size={16} className="mr-2" /> Atualizar página</Button>
        </section>
      </main>
    );
  }
}