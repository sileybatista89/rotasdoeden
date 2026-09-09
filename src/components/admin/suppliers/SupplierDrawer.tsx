import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  ACCOMMODATION_TYPE_LABEL, ROOM_TYPE_LABEL, SUPPLIER_TYPE_LABEL,
  SUPPLY_STATUS_LABEL, canTransitionSupply, type SupplyStatus,
} from "@/lib/supply";
import {
  useAccommodations, useRooms, useSaveAccommodation, useSaveRoom, useSetSupplyStatus,
  type Supplier,
} from "@/hooks/useSupply";

interface Props {
  supplier: Supplier | null;
  onClose: () => void;
}

const NEXT_STATUSES: SupplyStatus[] = ["draft", "under_review", "approved", "inactive", "archived"];

export function SupplierDrawer({ supplier, onClose }: Props) {
  const accommodations = useAccommodations(supplier?.id ?? null);
  const [roomsFor, setRoomsFor] = useState<string | null>(null);
  const rooms = useRooms(roomsFor);
  const saveAccommodation = useSaveAccommodation();
  const saveRoom = useSaveRoom();
  const setStatus = useSetSupplyStatus();

  const [accForm, setAccForm] = useState({ name: "", accommodation_type: "hotel", address: "", website: "", star_rating: "", rating_source: "" });
  const [roomForm, setRoomForm] = useState({ room_name: "", room_type: "standard", max_adults: "", max_children: "", max_guests: "", capacity_source: "", bed_configuration: "" });

  if (!supplier) return null;

  const changeStatus = async (status: SupplyStatus) => {
    if (!canTransitionSupply(supplier.status, status)) {
      toast({ title: "Transição não permitida", variant: "destructive" });
      return;
    }
    const note = status === "archived" ? (window.prompt("Motivo do arquivo:") ?? "") : undefined;
    if (status === "archived" && !note?.trim()) {
      toast({ title: "É preciso indicar um motivo", variant: "destructive" });
      return;
    }
    try {
      await setStatus.mutateAsync({ entity: "supplier", id: supplier.id, status, note });
      toast({ title: `Estado atualizado para ${SUPPLY_STATUS_LABEL[status]}` });
    } catch (e) {
      toast({ title: "Não foi possível alterar", description: (e as Error).message, variant: "destructive" });
    }
  };

  const addAccommodation = async () => {
    if (!accForm.name.trim()) return toast({ title: "Indica o nome do alojamento", variant: "destructive" });
    if (accForm.star_rating.trim() && !accForm.rating_source.trim()) {
      return toast({ title: "A classificação exige indicar a fonte", variant: "destructive" });
    }
    try {
      await saveAccommodation.mutateAsync({
        supplier_id: supplier.id,
        name: accForm.name.trim(),
        accommodation_type: accForm.accommodation_type,
        address: accForm.address.trim() || null,
        website: accForm.website.trim() || null,
        star_rating: accForm.star_rating.trim() || null,
        rating_source: accForm.rating_source.trim() || null,
      });
      setAccForm({ name: "", accommodation_type: "hotel", address: "", website: "", star_rating: "", rating_source: "" });
      toast({ title: "Alojamento registado em rascunho" });
    } catch (e) {
      toast({ title: "Não foi possível guardar", description: (e as Error).message, variant: "destructive" });
    }
  };

  const addRoom = async () => {
    if (!roomsFor) return;
    if (!roomForm.room_name.trim()) return toast({ title: "Indica o nome do quarto", variant: "destructive" });
    const hasCapacity = roomForm.max_adults || roomForm.max_children || roomForm.max_guests;
    if (hasCapacity && !roomForm.capacity_source.trim()) {
      return toast({ title: "A capacidade só pode ser guardada com fonte", variant: "destructive" });
    }
    try {
      await saveRoom.mutateAsync({
        accommodation_id: roomsFor,
        room_name: roomForm.room_name.trim(),
        room_type: roomForm.room_type,
        max_adults: roomForm.max_adults || null,
        max_children: roomForm.max_children || null,
        max_guests: roomForm.max_guests || null,
        bed_configuration: roomForm.bed_configuration.trim() || null,
        capacity_source: roomForm.capacity_source.trim() || null,
      });
      setRoomForm({ room_name: "", room_type: "standard", max_adults: "", max_children: "", max_guests: "", capacity_source: "", bed_configuration: "" });
      toast({ title: "Quarto registado" });
    } catch (e) {
      toast({ title: "Não foi possível guardar", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <Sheet open={!!supplier} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display">{supplier.trading_name || supplier.legal_name}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-6">
          <div className="flex flex-wrap gap-2 items-center">
            <Badge variant="outline">{SUPPLIER_TYPE_LABEL[supplier.supplier_type]}</Badge>
            <Badge variant="outline">{SUPPLY_STATUS_LABEL[supplier.status]}</Badge>
            {supplier.website && <span className="text-xs text-muted-foreground">{supplier.website}</span>}
          </div>

          <div className="flex flex-wrap gap-2">
            {NEXT_STATUSES.filter((s) => canTransitionSupply(supplier.status, s)).map((s) => (
              <Button key={s} size="sm" variant="outline" onClick={() => changeStatus(s)}>
                {SUPPLY_STATUS_LABEL[s]}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Registar um fornecedor não o aprova para venda. Só um fornecedor aprovado poderá ser usado comercialmente.
          </p>

          <div className="space-y-3">
            <h3 className="font-display font-semibold text-foreground">Alojamentos</h3>
            {(accommodations.data ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">Sem alojamentos registados.</p>
            )}
            {(accommodations.data ?? []).map((a) => (
              <Card key={a.id} className="p-3 space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className="font-medium text-foreground">{a.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {ACCOMMODATION_TYPE_LABEL[a.accommodation_type]}
                      {a.star_rating !== null ? ` · ${a.star_rating}★ (${a.rating_source})` : " · sem classificação verificada"}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setRoomsFor(roomsFor === a.id ? null : a.id)}>
                    {roomsFor === a.id ? "Fechar quartos" : "Quartos"}
                  </Button>
                </div>

                {roomsFor === a.id && (
                  <div className="border-t border-border pt-3 space-y-3">
                    {(rooms.data ?? []).map((r) => (
                      <div key={r.id} className="text-sm">
                        <span className="text-foreground">{r.room_name}</span>{" "}
                        <span className="text-xs text-muted-foreground">
                          {ROOM_TYPE_LABEL[r.room_type]}
                          {r.max_guests ? ` · até ${r.max_guests} hóspedes (${r.capacity_source})` : " · capacidade não confirmada"}
                        </span>
                      </div>
                    ))}
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Nome do quarto" value={roomForm.room_name} onChange={(e) => setRoomForm({ ...roomForm, room_name: e.target.value })} />
                      <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={roomForm.room_type} onChange={(e) => setRoomForm({ ...roomForm, room_type: e.target.value })}>
                        {Object.entries(ROOM_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                      <Input placeholder="Máx. adultos" inputMode="numeric" value={roomForm.max_adults} onChange={(e) => setRoomForm({ ...roomForm, max_adults: e.target.value })} />
                      <Input placeholder="Máx. hóspedes" inputMode="numeric" value={roomForm.max_guests} onChange={(e) => setRoomForm({ ...roomForm, max_guests: e.target.value })} />
                      <Input className="col-span-2" placeholder="Fonte da capacidade (obrigatória se indicares capacidade)" value={roomForm.capacity_source} onChange={(e) => setRoomForm({ ...roomForm, capacity_source: e.target.value })} />
                    </div>
                    <Button size="sm" onClick={addRoom} disabled={saveRoom.isPending}>Adicionar quarto</Button>
                  </div>
                )}
              </Card>
            ))}

            <Card className="p-3 space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Novo alojamento</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Nome" value={accForm.name} onChange={(e) => setAccForm({ ...accForm, name: e.target.value })} />
                <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={accForm.accommodation_type} onChange={(e) => setAccForm({ ...accForm, accommodation_type: e.target.value })}>
                  {Object.entries(ACCOMMODATION_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <Input placeholder="Morada" value={accForm.address} onChange={(e) => setAccForm({ ...accForm, address: e.target.value })} />
                <Input placeholder="Website" value={accForm.website} onChange={(e) => setAccForm({ ...accForm, website: e.target.value })} />
                <Input placeholder="Classificação (opcional)" value={accForm.star_rating} onChange={(e) => setAccForm({ ...accForm, star_rating: e.target.value })} />
                <Input placeholder="Fonte da classificação" value={accForm.rating_source} onChange={(e) => setAccForm({ ...accForm, rating_source: e.target.value })} />
              </div>
              <Button size="sm" onClick={addAccommodation} disabled={saveAccommodation.isPending}>Adicionar alojamento</Button>
            </Card>
          </div>

          {supplier.notes && (
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Notas</Label>
              <Textarea readOnly value={supplier.notes} rows={3} />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
