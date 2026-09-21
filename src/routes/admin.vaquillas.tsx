import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { Search, Plus, Loader2, Edit3, Trash2, Venus } from "lucide-react";
import { useBovinos } from "@/hooks/useBovinos";
import { apiRequest } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/admin/vaquillas")({
  component: Vaquillas,
});

const defaultForm = {
  bovinoId: "",
  tat: "",
  fechaNacimiento: "",
  padreId: "",
  madreId: "",
  color: "BC",
  numeroLote: "",
  observaciones: "",
  estado: "E",
};

const colores = [
  { value: "BC", label: "Blanco Colorado" },
  { value: "CL", label: "Colorado" },
  { value: "CO", label: "Overo" },
  { value: "OV", label: "Overo Negro" },
  { value: "NE", label: "Negro" },
  { value: "BR", label: "Bragado" },
  { value: "OT", label: "Otro" },
];

const estadoVaquilla = [
  { value: "E", label: "Emprendida/Preñada" },
  { value: "S", label: "Servida" },
  { value: "R", label: "Repetidora" },
  { value: "D", label: "Descartada" },
  { value: "N", label: "No preñada" },
];

function Vaquillas() {
  const [q, setQ] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest("/api/vaquillas").then((res) => {
      if (res.success && Array.isArray(res.data)) {
        setList(res.data);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const { data: bovinosData } = useBovinos(1, 200);
  const allBovinos = useMemo(() => {
    if (!bovinosData?.data || !Array.isArray(bovinosData.data)) return [];
    return bovinosData.data;
  }, [bovinosData]);

  const hembras = useMemo(() => allBovinos.filter((b: any) => b.sexo === "Hembra"), [allBovinos]);
  const machos = useMemo(() => allBovinos.filter((b: any) => b.sexo === "Macho"), [allBovinos]);

  const filtrados = useMemo(() => {
    if (!q) return list;
    return list.filter((e: any) =>
      `${e.nombreBovino || ""} ${e.chipBovino || ""} ${e.tat || ""} ${e.estado || ""}`
        .toLowerCase().includes(q.toLowerCase()),
    );
  }, [list, q]);

  const openCreate = () => {
    setForm(defaultForm);
    setEditId(null);
    setModal("create");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModal(null);
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Vaquillas 2025</h1>
          <p className="text-muted-foreground text-sm">
            Registro de vaquillas: TAT, padres, color, estado reproductivo
          </p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-primary-foreground text-sm hover:bg-primary/90 cursor-pointer">
          <Plus className="size-4" /> Registrar vaquilla
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por TAT, nombre, chip..."
            className="w-full rounded-full border border-input bg-card pl-10 pr-4 py-2.5 text-sm outline-none focus:border-accent"
          />
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-12 flex items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">TAT</th>
                <th className="text-left px-4 py-3">Nombre</th>
                <th className="text-left px-4 py-3">Fecha nac.</th>
                <th className="text-left px-4 py-3">Padre</th>
                <th className="text-left px-4 py-3">Madre</th>
                <th className="text-left px-4 py-3">Color</th>
                <th className="text-left px-4 py-3">Lote</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="text-right px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtrados.map((v: any) => (
                <tr key={v.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono font-medium">{v.tat || "—"}</td>
                  <td className="px-4 py-3">{v.nombreBovino || v.chipBovino || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{v.fechaNacimiento ? new Date(v.fechaNacimiento).toLocaleDateString("es-BO") : "—"}</td>
                  <td className="px-4 py-3">{v.padre || "—"}</td>
                  <td className="px-4 py-3">{v.madre || "—"}</td>
                  <td className="px-4 py-3">{colores.find((c) => c.value === v.color)?.label || v.color || "—"}</td>
                  <td className="px-4 py-3">{v.numeroLote || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs ${
                      v.estado === "E" ? "bg-emerald-500/10 text-emerald-600" :
                      v.estado === "S" ? "bg-blue-500/10 text-blue-600" :
                      v.estado === "R" ? "bg-amber-500/10 text-amber-600" :
                      v.estado === "D" ? "bg-red-500/10 text-red-600" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {estadoVaquilla.find((e) => e.value === v.estado)?.label || v.estado || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="grid size-7 place-items-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer">
                      <Edit3 className="size-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground text-sm">
                    {list.length === 0 ? "Cargue vaquillas usando el formulario." : "Sin resultados."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      <Dialog open={modal !== null} onOpenChange={(open) => { if (!open) setModal(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar vaquilla</DialogTitle>
            <DialogDescription>Ingrese los datos de la vaquilla según el cuaderno de campo.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label>Bovino *</Label>
                <Select value={form.bovinoId} onValueChange={(v) => setForm({ ...form, bovinoId: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar hembra..." /></SelectTrigger>
                  <SelectContent>
                    {hembras.map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>{b.nombre || b.chip}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>TAT (tattoo)</Label>
                <Input value={form.tat} onChange={(e) => setForm({ ...form, tat: e.target.value })} placeholder="Ej: 2096" />
              </div>
              <div className="space-y-1.5">
                <Label>Fecha nacimiento</Label>
                <Input type="date" value={form.fechaNacimiento} onChange={(e) => setForm({ ...form, fechaNacimiento: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Padre</Label>
                <Select value={form.padreId} onValueChange={(v) => setForm({ ...form, padreId: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar padre..." /></SelectTrigger>
                  <SelectContent>
                    {machos.map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>{b.nombre || b.chip}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Madre</Label>
                <Select value={form.madreId} onValueChange={(v) => setForm({ ...form, madreId: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar madre..." /></SelectTrigger>
                  <SelectContent>
                    {hembras.map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>{b.nombre || b.chip}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Color</Label>
                <Select value={form.color} onValueChange={(v) => setForm({ ...form, color: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {colores.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>N° Lote</Label>
                <Input type="number" value={form.numeroLote} onChange={(e) => setForm({ ...form, numeroLote: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Estado</Label>
                <Select value={form.estado} onValueChange={(v) => setForm({ ...form, estado: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {estadoVaquilla.map((e) => (
                      <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Observaciones</Label>
                <textarea
                  value={form.observaciones}
                  onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
                  className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-accent min-h-[60px] resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)} className="rounded-full border border-input px-5 py-2 text-sm hover:bg-muted cursor-pointer">Cancelar</button>
              <button type="submit" className="rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground hover:bg-primary/90 cursor-pointer">Registrar</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
