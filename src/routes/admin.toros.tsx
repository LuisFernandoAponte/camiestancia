import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Search, Plus, Loader2, Edit3, Trash2, FlaskConical, Swords, AlertTriangle, Eye, FileText } from "lucide-react";
import { useToros, useCreateToro, useUpdateToro, useDeleteToro } from "@/hooks/useToros";
import { useBovinos } from "@/hooks/useBovinos";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/admin/toros")({
  component: Toros,
});

const defaultForm = {
  bovinoId: "",
  nombre: "",
  codigo: "",
  raza: "",
  calidadSeminal: "E",
  categoria: "",
  pesoEvaluacion: "",
  circunferenciaEscrotal: "",
  fechaEvaluacion: new Date().toISOString().split("T")[0],
  activo: true,
  descartado: false,
  motivoDescarte: "",
  observaciones: "",
};

const calidadOptions = [
  { value: "A", label: "A - Excelente", color: "bg-emerald-500" },
  { value: "S", label: "S - Superior", color: "bg-blue-500" },
  { value: "E", label: "E - Estándar", color: "bg-amber-500" },
  { value: "B", label: "B - Inferior", color: "bg-red-500" },
];

function Toros() {
  const [q, setQ] = useState("");
  const [filterActivo, setFilterActivo] = useState<string>("todos");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewDetail, setViewDetail] = useState<any>(null);

  const queryClient = useQueryClient();
  const { data: apiData, isLoading } = useToros(1, 200, {
    ...(filterActivo !== "todos" ? { activo: filterActivo === "activo" ? "true" : "false" } : {}),
  });
  const { data: bovinosData } = useBovinos(1, 200);
  const createMutation = useCreateToro();
  const updateMutation = useUpdateToro();
  const deleteMutation = useDeleteToro();

  const sourceData: any[] = apiData?.data && Array.isArray(apiData.data) ? apiData.data : [];
  const allBovinos = useMemo(() => {
    if (!bovinosData?.data || !Array.isArray(bovinosData.data)) return [];
    return bovinosData.data;
  }, [bovinosData]);

  const machos = useMemo(() => allBovinos.filter((b: any) => b.sexo === "Macho"), [allBovinos]);

  const filtrados = useMemo(() => sourceData.filter((e: any) => {
    if (q) {
      const str = `${e.nombre || ""} ${e.codigo || ""} ${e.raza || ""} ${e.chipBovino || ""}`;
      if (!str.toLowerCase().includes(q.toLowerCase())) return false;
    }
    return true;
  }), [sourceData, q]);

  const stats = useMemo(() => {
    const total = sourceData.length;
    const activos = sourceData.filter((t: any) => t.activo && !t.descartado).length;
    const descartados = sourceData.filter((t: any) => t.descartado).length;
    const calidadA = sourceData.filter((t: any) => t.calidadSeminal === "A").length;
    const calidadS = sourceData.filter((t: any) => t.calidadSeminal === "S").length;
    return { total, activos, descartados, calidadA, calidadS };
  }, [sourceData]);

  const openCreate = () => {
    setForm(defaultForm);
    setEditId(null);
    setModal("create");
  };

  const openEdit = (e: any) => {
    setForm({
      bovinoId: e.bovinoId || "",
      nombre: e.nombre || "",
      codigo: e.codigo || "",
      raza: e.raza || "",
      calidadSeminal: e.calidadSeminal || "E",
      categoria: e.categoria || "",
      pesoEvaluacion: e.pesoEvaluacion?.toString() || "",
      circunferenciaEscrotal: e.circunferenciaEscrotal?.toString() || "",
      fechaEvaluacion: e.fechaEvaluacion ? String(e.fechaEvaluacion).split("T")[0] : new Date().toISOString().split("T")[0],
      activo: e.activo ?? true,
      descartado: e.descartado ?? false,
      motivoDescarte: e.motivoDescarte || "",
      observaciones: e.observaciones || "",
    });
    setEditId(e.id);
    setModal("edit");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        ...form,
        pesoEvaluacion: form.pesoEvaluacion ? parseFloat(form.pesoEvaluacion) : undefined,
        circunferenciaEscrotal: form.circunferenciaEscrotal ? parseFloat(form.circunferenciaEscrotal) : undefined,
      };
      if (editId) {
        await updateMutation.mutateAsync({ id: editId, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      setModal(null);
      queryClient.invalidateQueries({ queryKey: ["toros"] });
    } catch (err) {
      console.error("Error guardando toro:", err);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ["toros"] });
    } catch (err) {
      console.error("Error eliminando toro:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 space-y-6">
        <div className="animate-pulse rounded-lg bg-muted/40 h-8 w-48" />
        <div className="grid gap-3 grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="animate-pulse rounded-2xl bg-muted/40 h-24" />)}
        </div>
        <div className="animate-pulse rounded-2xl bg-muted/40 h-80" />
      </div>
    );
  }

  const modalBusy = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Toros</h1>
          <p className="text-muted-foreground text-sm">
            Evaluación seminal, categorización y desempeño reproductivo
          </p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-primary-foreground text-sm hover:bg-primary/90 cursor-pointer">
          <Plus className="size-4" /> Registrar toro
        </button>
      </div>

      <div className="grid gap-3 grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Swords className="size-3.5" /> Total toros
          </div>
          <div className="font-display text-2xl">{stats.total}</div>
          <div className="text-xs text-muted-foreground/70 mt-1">{stats.activos} activos</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <FlaskConical className="size-3.5 text-emerald-500" /> Calidad A/S
          </div>
          <div className="font-display text-2xl">{stats.calidadA + stats.calidadS}</div>
          <div className="text-xs text-muted-foreground/70 mt-1">A: {stats.calidadA} · S: {stats.calidadS}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <AlertTriangle className="size-3.5 text-red-500" /> Descartados
          </div>
          <div className="font-display text-2xl">{stats.descartados}</div>
          <div className="text-xs text-muted-foreground/70 mt-1">No aptos para servicio</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Swords className="size-3.5 text-accent" /> Servicios totales
          </div>
          <div className="font-display text-2xl">{sourceData.reduce((s, t) => s + (t.totalServicios || 0), 0)}</div>
          <div className="text-xs text-muted-foreground/70 mt-1">En todo el hato</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, código, raza..."
            className="w-full rounded-full border border-input bg-card pl-10 pr-4 py-2.5 text-sm outline-none focus:border-accent"
          />
        </div>
        <select value={filterActivo} onChange={(e) => setFilterActivo(e.target.value)} className="rounded-full border border-input bg-card px-4 py-2.5 text-sm">
          <option value="todos">Todos</option>
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos/Descartados</option>
        </select>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Nombre / Código</th>
                <th className="text-left px-4 py-3">Raza</th>
                <th className="text-left px-4 py-3">Calidad seminal</th>
                <th className="text-left px-4 py-3">Circ. escrotal</th>
                <th className="text-left px-4 py-3">Peso eval.</th>
                <th className="text-left px-4 py-3">Servicios</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="text-right px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtrados.map((t: any) => {
                const cal = calidadOptions.find((c) => c.value === t.calidadSeminal);
                return (
                  <tr key={t.id} className="hover:bg-muted/30 transition">
                    <td className="px-4 py-3">
                      <div className="font-medium">{t.nombre}</div>
                      {t.codigo && <div className="text-[11px] text-muted-foreground">{t.codigo}</div>}
                      {t.observaciones && (
                        <div
                          onClick={() => setViewDetail(t)}
                          className="mt-1 flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md cursor-pointer hover:bg-amber-500/20 transition max-w-[200px] truncate"
                          title={`Notas: ${t.observaciones}`}
                        >
                          <FileText className="size-3 shrink-0 text-amber-600" />
                          <span className="truncate">{t.observaciones}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{t.raza || "—"}</td>
                    <td className="px-4 py-3">
                      {t.calidadSeminal ? (
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${cal?.color || "bg-gray-500"} text-white`}>
                          {t.calidadSeminal}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">{t.circunferenciaEscrotal ? `${t.circunferenciaEscrotal} cm` : "—"}</td>
                    <td className="px-4 py-3">{t.pesoEvaluacion ? `${t.pesoEvaluacion} kg` : "—"}</td>
                    <td className="px-4 py-3">{t.totalServicios ?? 0}</td>
                    <td className="px-4 py-3">
                      {t.descartado ? (
                        <span className="rounded-full px-2.5 py-1 text-xs bg-red-500/10 text-red-600">Descartado</span>
                      ) : t.activo ? (
                        <span className="rounded-full px-2.5 py-1 text-xs bg-emerald-500/10 text-emerald-600">Activo</span>
                      ) : (
                        <span className="rounded-full px-2.5 py-1 text-xs bg-muted text-muted-foreground">Inactivo</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setViewDetail(t)} className="grid size-7 place-items-center rounded-md hover:bg-emerald-500/10 text-emerald-600 cursor-pointer" title="Ver Ficha y Notas completas">
                          <Eye className="size-3.5" />
                        </button>
                        <button onClick={() => openEdit(t)} className="grid size-7 place-items-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer" title="Editar">
                          <Edit3 className="size-3.5" />
                        </button>
                        <button onClick={() => setDeleteId(t.id)} className="grid size-7 place-items-center rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive cursor-pointer" title="Eliminar">
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground text-sm">
                    No se encontraron toros registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={modal !== null} onOpenChange={(open) => { if (!open) setModal(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar toro" : "Registrar toro"}</DialogTitle>
            <DialogDescription>
              {editId ? "Actualizá los datos de evaluación del toro." : "Registrá un nuevo toro con sus datos de evaluación seminal."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {!editId && (
                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="bovinoId">Seleccionar bovino *</Label>
                  <Select value={form.bovinoId} onValueChange={(v) => setForm({ ...form, bovinoId: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar macho..." /></SelectTrigger>
                    <SelectContent>
                      {machos.map((b: any) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.nombre || b.id?.slice(0, 8)} ({b.chip})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Nombre *</Label>
                <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>Código</Label>
                <Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Raza</Label>
                <Input value={form.raza} onChange={(e) => setForm({ ...form, raza: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Calidad seminal</Label>
                <Select value={form.calidadSeminal} onValueChange={(v) => setForm({ ...form, calidadSeminal: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {calidadOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Categoría</Label>
                <Input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} placeholder="A, S, E..." />
              </div>
              <div className="space-y-1.5">
                <Label>Peso evaluación (kg)</Label>
                <Input type="number" step="0.1" value={form.pesoEvaluacion} onChange={(e) => setForm({ ...form, pesoEvaluacion: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Circ. escrotal (cm)</Label>
                <Input type="number" step="0.1" value={form.circunferenciaEscrotal} onChange={(e) => setForm({ ...form, circunferenciaEscrotal: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Fecha evaluación</Label>
                <Input type="date" value={form.fechaEvaluacion} onChange={(e) => setForm({ ...form, fechaEvaluacion: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Estado</Label>
                <Select value={form.activo ? "activo" : form.descartado ? "descartado" : "inactivo"} onValueChange={(v) => {
                  setForm({ ...form, activo: v === "activo", descartado: v === "descartado" });
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="inactivo">Inactivo</SelectItem>
                    <SelectItem value="descartado">Descartado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.descartado && (
                <div className="space-y-1.5 col-span-2">
                  <Label>Motivo de descarte</Label>
                  <Input value={form.motivoDescarte} onChange={(e) => setForm({ ...form, motivoDescarte: e.target.value })} placeholder="Baja calidad seminal, edad, lesión..." />
                </div>
              )}
              <div className="space-y-1.5 col-span-2">
                <Label>Observaciones</Label>
                <textarea
                  value={form.observaciones}
                  onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
                  className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-accent min-h-[80px] resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)} className="rounded-full border border-input px-5 py-2 text-sm hover:bg-muted cursor-pointer">Cancelar</button>
              <button type="submit" disabled={modalBusy} className="rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 cursor-pointer">
                {modalBusy && <Loader2 className="size-4 animate-spin" />}
                {editId ? "Guardar cambios" : "Registrar toro"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar toro</DialogTitle>
            <DialogDescription>¿Estás seguro de eliminar este toro? Esta acción no se puede deshacer.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setDeleteId(null)} className="rounded-full border border-input px-5 py-2 text-sm hover:bg-muted cursor-pointer">Cancelar</button>
            <button onClick={handleDelete} disabled={deleteMutation.isPending} className="rounded-full bg-destructive px-5 py-2 text-sm text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 flex items-center gap-2 cursor-pointer">
              {deleteMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Eliminar
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Ficha Completa y Notas del Toro */}
      <Dialog open={viewDetail !== null} onOpenChange={(open) => !open && setViewDetail(null)}>
        <DialogContent className="sm:max-w-lg font-sans">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
              <Swords className="size-5 text-accent" />
              {viewDetail?.nombre}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Código: {viewDetail?.codigo || "Sin código"} · Raza: {viewDetail?.raza || "Sin raza"} · Chip: {viewDetail?.chipBovino || "—"}
            </DialogDescription>
          </DialogHeader>

          {viewDetail && (
            <div className="space-y-4 pt-2 text-sm">
              {/* SECCIÓN DESTACADA DE NOTAS / OBSERVACIONES */}
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
                  <FileText className="size-4 text-amber-600" />
                  <span>Notas y Observaciones del Toro</span>
                </div>
                {viewDetail.observaciones ? (
                  <p className="text-xs text-amber-900 dark:text-amber-100 whitespace-pre-wrap leading-relaxed">
                    {viewDetail.observaciones}
                  </p>
                ) : (
                  <p className="text-xs text-amber-800/70 italic">
                    No se han registrado observaciones adicionales para este toro.
                  </p>
                )}
              </div>

              {/* MOTIVO DE DESCARTE SI APLICA */}
              {viewDetail.descartado && (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700">
                    <AlertTriangle className="size-4" />
                    <span>Toro Descartado (No apto para servicio)</span>
                  </div>
                  <p className="text-xs text-rose-800 dark:text-rose-200">
                    <strong>Motivo:</strong> {viewDetail.motivoDescarte || "Sin especificar"}
                  </p>
                </div>
              )}

              {/* DATOS DE EVALUACIÓN ANDROLÓGICA */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Evaluación Andrológica y Física
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-muted/30 p-3.5 rounded-2xl border border-border text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Calidad Seminal</span>
                    <span className="font-semibold text-foreground">
                      {viewDetail.calidadSeminal
                        ? `${viewDetail.calidadSeminal} - ${calidadOptions.find((c) => c.value === viewDetail.calidadSeminal)?.label.split(" - ")[1] || ""}`
                        : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Circunferencia Escrotal</span>
                    <span className="font-semibold text-foreground">
                      {viewDetail.circunferenciaEscrotal ? `${viewDetail.circunferenciaEscrotal} cm` : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Peso Evaluación</span>
                    <span className="font-semibold text-foreground">
                      {viewDetail.pesoEvaluacion ? `${viewDetail.pesoEvaluacion} kg` : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Categoría</span>
                    <span className="font-semibold text-foreground">{viewDetail.categoria || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Servicios Totales</span>
                    <span className="font-semibold text-emerald-600">{viewDetail.totalServicios ?? 0}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Fecha Evaluación</span>
                    <span className="font-semibold text-foreground">
                      {viewDetail.fechaEvaluacion
                        ? new Date(viewDetail.fechaEvaluacion).toLocaleDateString("es-BO")
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
