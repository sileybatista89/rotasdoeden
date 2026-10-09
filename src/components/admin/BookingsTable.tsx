import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type BookingStatus = "pending_payment" | "confirmed" | "completed" | "cancelled" | "refunded";

interface Row {
  id: string;
  guide_id: string;
  tourist_id: string;
  service_title: string;
  date: string;
  num_people: number;
  total_price: number;
  currency: string;
  status: BookingStatus;
  payment_status: string | null;
}

interface PostTrip {
  booking_id: string;
  status: string;
  sent_at: string | null;
}

const statusLabels: Record<BookingStatus, string> = {
  pending_payment: "Aguarda pagamento",
  confirmed: "Confirmada",
  completed: "Concluída",
  cancelled: "Cancelada",
  refunded: "Reembolsada",
};

const statusStyles: Record<BookingStatus, string> = {
  pending_payment: "bg-secondary/20 text-secondary-foreground border-secondary/30",
  confirmed: "bg-primary/15 text-primary border-primary/30",
  completed: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
  refunded: "bg-muted text-muted-foreground border-border",
};

const filters: (BookingStatus | "all")[] = ["all", "pending_payment", "confirmed", "completed", "cancelled", "refunded"];

export function BookingsTable() {
  const [filter, setFilter] = useState<BookingStatus | "all">("all");
  const [rows, setRows] = useState<Row[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [postTrip, setPostTrip] = useState<Record<string, PostTrip>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  const run = async (action: "complete" | "test", b: Row) => {
    if (action === "complete" && !window.confirm(`Marcar "${b.service_title}" como concluída e enviar o email pós-viagem ao cliente?`)) return;
    setBusy(b.id + action);
    const { data, error } = await supabase.functions.invoke("booking-complete", { body: { action, booking_id: b.id } });
    setBusy(null);
    if (error || data?.error) return toast.error(data?.error ?? "Não foi possível concluir a ação.");
    if (action === "test") toast.success(data.sent ? "Email de teste enviado para o seu endereço." : "O seu endereço está bloqueado para envios.");
    else if (data.alreadySent) toast.info("O email pós-viagem já tinha sido enviado para esta reserva.");
    else toast.success(data.sent ? "Reserva concluída e email pós-viagem enviado." : "Reserva concluída, mas o email não foi enviado.");
    setReload((n) => n + 1);
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("bookings")
        .select("id, guide_id, tourist_id, service_title, date, num_people, total_price, currency, status, payment_status")
        .order("created_at", { ascending: false })
        .limit(200);
      const list = (data ?? []) as Row[];
      setRows(list);
      const ids = Array.from(new Set(list.flatMap((b) => [b.guide_id, b.tourist_id])));
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
        setNames(Object.fromEntries((profs ?? []).map((p) => [p.id, p.full_name ?? "n/d"])));
      }
      if (list.length) {
        const { data: pt } = await supabase
          .from("post_trip_emails")
          .select("booking_id, status, sent_at")
          .eq("is_test", false)
          .in("booking_id", list.map((b) => b.id));
        setPostTrip(Object.fromEntries((pt ?? []).map((p) => [p.booking_id, p as PostTrip])));
      }
      setLoading(false);
    })();
  }, [reload]);

  const filtered = filter === "all" ? rows : rows.filter((b) => b.status === filter);

  if (loading) return <Skeleton className="h-64 rounded-2xl" />;

  if (rows.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-10 text-center">
        <h3 className="font-display font-semibold text-foreground mb-1">Ainda sem reservas</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          As reservas feitas pelos viajantes aparecem aqui, com o guia, o valor e o estado do pagamento.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
            {f === "all" ? "Todas" : statusLabels[f]}
          </Button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Guia</TableHead>
              <TableHead className="hidden md:table-cell">Serviço</TableHead>
              <TableHead className="hidden sm:table-cell">Viajante</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Pós-viagem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium text-foreground">{names[b.guide_id] ?? "n/d"}</TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{b.service_title}</TableCell>
                <TableCell className="hidden sm:table-cell text-sm">
                  {names[b.tourist_id] ?? "n/d"}
                  <span className="block text-xs text-muted-foreground">{b.num_people} pessoa(s)</span>
                </TableCell>
                <TableCell className="text-sm">{new Date(b.date).toLocaleDateString("pt-PT")}</TableCell>
                <TableCell className="text-right font-semibold">
                  {b.currency === "EUR" ? "€" : ""}{Number(b.total_price).toFixed(0)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("text-xs", statusStyles[b.status])}>
                    {statusLabels[b.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">
                  {(() => {
                    const pt = postTrip[b.id];
                    const eligible = b.payment_status === "paid" && (b.status === "confirmed" || b.status === "completed");
                    if (pt?.status === "sent") return <span className="text-primary">Enviado {pt.sent_at ? new Date(pt.sent_at).toLocaleString("pt-PT") : ""}</span>;
                    if (pt?.status === "suppressed") return <span className="text-muted-foreground">Bloqueado pelo destinatário</span>;
                    if (!eligible) return <span className="text-muted-foreground">Não elegível</span>;
                    return (
                      <div className="flex flex-col gap-1">
                        {pt?.status === "failed" && <span className="text-destructive">Falhou, pode tentar de novo</span>}
                        <div className="flex gap-1">
                          <Button size="sm" disabled={!!busy} onClick={() => run("complete", b)}>
                            {b.status === "completed" ? "Enviar pós-viagem" : "Concluir e enviar"}
                          </Button>
                          <Button size="sm" variant="outline" disabled={!!busy} onClick={() => run("test", b)}>Teste</Button>
                        </div>
                      </div>
                    );
                  })()}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                  Sem reservas neste estado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
