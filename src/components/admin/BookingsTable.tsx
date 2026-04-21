import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mockBookings, type BookingStatus } from "@/data/mockBookings";
import { cn } from "@/lib/utils";

const statusLabels: Record<BookingStatus, string> = {
  pending: "Pendente",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
  completed: "Concluída",
};

const statusStyles: Record<BookingStatus, string> = {
  pending: "bg-secondary/20 text-secondary-foreground border-secondary/30",
  confirmed: "bg-primary/15 text-primary border-primary/30",
  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
  completed: "bg-muted text-muted-foreground border-border",
};

const filters: (BookingStatus | "all")[] = ["all", "pending", "confirmed", "cancelled", "completed"];

export function BookingsTable() {
  const [filter, setFilter] = useState<BookingStatus | "all">("all");
  const filtered = filter === "all" ? mockBookings : mockBookings.filter((b) => b.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "Todas" : statusLabels[f]}
          </Button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Guia</TableHead>
              <TableHead className="hidden md:table-cell">Serviço</TableHead>
              <TableHead className="hidden sm:table-cell">Turista</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">{b.id}</TableCell>
                <TableCell className="font-medium text-foreground">{b.guide_name}</TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{b.service_title}</TableCell>
                <TableCell className="hidden sm:table-cell text-sm">
                  {b.tourist_name}
                  <span className="block text-xs text-muted-foreground">{b.tourist_country}</span>
                </TableCell>
                <TableCell className="text-sm">{b.date}</TableCell>
                <TableCell className="text-right font-semibold">€{b.total}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("text-xs", statusStyles[b.status])}>
                    {statusLabels[b.status]}
                  </Badge>
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
