import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Reads/writes the authoritative backend setting used by the checkout function.
export function CommerceSettingsCard() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["commerce_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commerce_settings")
        .select("sales_enabled, payment_mode, updated_at")
        .eq("id", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async (v: { sales_enabled: boolean; payment_mode: "test" | "live" }) => {
      const { error } = await supabase.rpc("admin_set_commerce_settings", {
        _sales_enabled: v.sales_enabled,
        _payment_mode: v.payment_mode,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commerce_settings"] });
      toast.success("Configuração de vendas atualizada");
    },
    onError: (e: any) => toast.error(e?.message || "Não foi possível atualizar"),
  });

  if (isLoading) return null;
  if (error || !data) {
    return <div className="mb-4 rounded-md border border-destructive/40 p-3 text-sm text-destructive">Não foi possível ler a configuração de vendas. Os pagamentos ficam bloqueados.</div>;
  }

  const live = data.sales_enabled && data.payment_mode === "live";
  const setVal = (sales_enabled: boolean, payment_mode: "test" | "live") => {
    if (sales_enabled && payment_mode === "live" &&
        !window.confirm("Ativar vendas reais? Os clientes passam a ser cobrados com dinheiro real.")) return;
    save.mutate({ sales_enabled, payment_mode });
  };

  return (
    <div className="mb-4 rounded-md border p-4 flex flex-wrap items-center gap-3">
      <span className="text-sm font-medium">Vendas e pagamentos</span>
      <Badge variant={data.sales_enabled ? "destructive" : "secondary"}>
        Vendas reais: {data.sales_enabled ? "ligadas" : "desligadas"}
      </Badge>
      <Badge variant="outline">Modo: {data.payment_mode === "live" ? "real" : "teste"}</Badge>
      <span className="text-xs text-muted-foreground">
        {live ? "Os pagamentos cobram dinheiro real." : data.payment_mode === "live" ? "Modo real escolhido, mas bloqueado enquanto as vendas estiverem desligadas." : "Só pagamentos de teste; nenhuma cobrança real."}
      </span>
      <div className="ml-auto flex gap-2">
        <Button size="sm" variant="outline" disabled={save.isPending}
          onClick={() => setVal(!data.sales_enabled, data.payment_mode as "test" | "live")}>
          {data.sales_enabled ? "Desligar vendas" : "Ligar vendas"}
        </Button>
        <Button size="sm" variant="outline" disabled={save.isPending}
          onClick={() => setVal(data.sales_enabled, data.payment_mode === "live" ? "test" : "live")}>
          {data.payment_mode === "live" ? "Mudar para teste" : "Mudar para real"}
        </Button>
      </div>
    </div>
  );
}
