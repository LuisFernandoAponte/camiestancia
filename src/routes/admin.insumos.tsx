import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Plus,
  Loader2,
  Edit3,
  Trash2,
  X,
  AlertTriangle,
  CheckCircle2,
  Package,
  AlertCircle,
  Clock,
  RotateCw,
  Search,
  Check,
  XCircle,
  Calendar,
  Eye,
  Image as ImageIcon,
} from "lucide-react";
import { ImageUploader } from "@/components/ui/ImageUploader";
import {
  useInsumos,
  useAlertasInsumos,
  useCreateInsumo,
  useUpdateInsumo,
  useDeleteInsumo,
  tiposInsumo,
} from "@/hooks/useInsumos";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/admin/insumos")({
  component: Insumos,
});

const defaultForm = {
  nombre: "",
  tipo: "vacuna",
  presentacion: "",
  stockActual: "",
  stockMinimo: "",
  unidad: "unidad",
  lote: "",
  fechaCompra: "",
  fechaVencimiento: "",
  proveedor: "",
  costoUnitario: "",
  notas: "",
  imagenUrl: "",
};

function formatUSD(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

function Insumos() {
  const [q, setQ] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  const filters: Record<string, string> = {};
  if (filtroTipo) filters.tipo = filtroTipo;
  if (q) filters.q = q;

  const { data, isLoading, isError, refetch } = useInsumos(1, 200, filters);
  const { data: alertas } = useAlertasInsumos();
  const createInsumo = useCreateInsumo();
  const updateInsumo = useUpdateInsumo();
  const deleteInsumo = useDeleteInsumo();

  const insumos = data?.data || [];
  const totalCriticos = alertas?.criticos?.length || 0;
  const totalVencidos = alertas?.vencidos?.length || 0;
  const totalPorVencer = alertas?.porVencer?.length || 0;

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const showToast = (type: "success" | "error", msg: string) =>
    setToast({ type, msg });

  const openCreate = () => {
    setForm(defaultForm);
    setEditId(null);
    setModal("create");
  };

  const openEdit = (item: any) => {
    setForm({
      nombre: item.nombre || "",
      tipo: item.tipo || "vacuna",
      presentacion: item.presentacion || "",
      stockActual: item.stockActual?.toString() || "0",
      stockMinimo: item.stockMinimo?.toString() || "0",
      unidad: item.unidad || "unidad",
      lote: item.lote || "",
      fechaCompra: item.fechaCompra ? item.fechaCompra.split("T")[0] : "",
      fechaVencimiento: item.fechaVencimiento
        ? item.fechaVencimiento.split("T")[0]
        : "",
      proveedor: item.proveedor || "",
      costoUnitario: item.costoUnitario?.toString() || "0",
      notas: item.notas || "",
      imagenUrl: item.imagenUrl || "",
    });
    setEditId(item.id);
    setModal("edit");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      nombre: form.nombre,
      tipo: form.tipo,
      presentacion: form.presentacion || undefined,
      stockActual: parseFloat(form.stockActual) || 0,
      stockMinimo: parseFloat(form.stockMinimo) || 0,
      unidad: form.unidad,
      lote: form.lote || undefined,
      fechaCompra: form.fechaCompra || undefined,
      fechaVencimiento: form.fechaVencimiento || undefined,
      proveedor: form.proveedor || undefined,
      costoUnitario: parseFloat(form.costoUnitario) || 0,
      notas: form.notas || undefined,
      imagenUrl: form.imagenUrl || undefined,
    };
    if (!payload.nombre.trim()) {
      showToast("error", "El nombre es requerido");
      return;
    }
    try {
      if (editId)
        await updateInsumo.mutateAsync({ id: editId, data: payload });
      else await createInsumo.mutateAsync(payload);
      setModal(null);
      showToast(
        "success",
        editId ? "Insumo actualizado" : "Insumo registrado"
      );
    } catch (err: any) {
      showToast("error", err?.message || "Error al guardar");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteInsumo.mutateAsync(deleteId);
      setDeleteId(null);
      showToast("success", "Insumo eliminado");
    } catch {
      showToast("error", "Error al eliminar");
    }
  };

  const set =
    (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const getTipoMeta = (tipo: string) =>
    tiposInsumo.find((t) => t.value === tipo);

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-8 space-y-6 max-w-7xl mx-auto font-sans text-slate-900 antialiased">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-xs font-semibold ${
            toast.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-rose-600 text-white"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="size-4" />
          ) : (
            <AlertTriangle className="size-4" />
          )}
          {toast.msg}
          <button
            onClick={() => setToast(null)}
            className="ml-2 opacity-70 hover:opacity-100 cursor-pointer"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Header Superior */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
            Control de Insumos
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Inventario de vacunas, desparasitantes, medicamentos y herramientas
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refetch()}
            className="h-10 w-10 grid place-items-center rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-sm transition cursor-pointer"
            title="Actualizar"
          >
            <RotateCw className="size-4" />
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 h-10 text-xs font-semibold shadow-sm transition-all duration-150 active:scale-[0.98] cursor-pointer"
          >
            <Plus className="size-4" /> Nuevo Insumo
          </button>
        </div>
      </div>

      {/* Tarjetas de Alerta de Stock / Vencimiento */}
      {!isLoading && (totalCriticos > 0 || totalVencidos > 0 || totalPorVencer > 0) && (
        <div className="grid gap-4 sm:grid-cols-3">
          {totalCriticos > 0 && (
            <div className="rounded-xl border border-rose-200/80 bg-rose-50/70 p-4 flex items-center gap-3.5 shadow-xs">
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600">
                <AlertCircle className="size-6" />
              </div>
              <div>
                <div className="text-2xl font-semibold tracking-tight text-rose-800">
                  {totalCriticos}
                </div>
                <div className="text-xs font-medium text-rose-700">
                  Stock Crítico (Bajo el mínimo)
                </div>
              </div>
            </div>
          )}

          {totalVencidos > 0 && (
            <div className="rounded-xl border border-orange-200/80 bg-orange-50/70 p-4 flex items-center gap-3.5 shadow-xs">
              <div className="p-2 rounded-lg bg-orange-500/10 text-orange-600">
                <Clock className="size-6" />
              </div>
              <div>
                <div className="text-2xl font-semibold tracking-tight text-orange-800">
                  {totalVencidos}
                </div>
                <div className="text-xs font-medium text-orange-700">
                  Insumos Vencidos
                </div>
              </div>
            </div>
          )}

          {totalPorVencer > 0 && (
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 p-4 flex items-center gap-3.5 shadow-xs">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
                <Calendar className="size-6" />
              </div>
              <div>
                <div className="text-2xl font-semibold tracking-tight text-amber-800">
                  {totalPorVencer}
                </div>
                <div className="text-xs font-medium text-amber-700">
                  Próximos a Vencer (30 días)
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Barra de Filtros Homogénea */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[220px] h-10">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar insumo por nombre..."
            className="w-full h-10 bg-white border border-slate-300 rounded-lg pl-10 pr-9 text-sm text-slate-900 shadow-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="h-10 bg-white border border-slate-300 rounded-lg px-3 text-sm text-slate-700 shadow-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none min-w-[160px]"
        >
          <option value="">Todos los tipos</option>
          {tiposInsumo.map((t) => (
            <option key={t.value} value={t.value}>
              {t.icon} {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Tabla de Insumos Estilo Tailwind UI */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl bg-white border border-slate-200/80 h-16 shadow-sm"
            />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-rose-600" />
            <span>Error al cargar la lista de insumos.</span>
          </div>
          <button
            onClick={() => refetch()}
            className="underline font-semibold hover:text-rose-900 cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      ) : insumos.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
          <Package className="size-10 mx-auto text-slate-300 mb-3" />
          <p className="text-sm font-medium text-slate-600">No hay insumos registrados</p>
          <button
            onClick={openCreate}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-semibold shadow-sm cursor-pointer"
          >
            <Plus className="size-4" /> Registrar primer insumo
          </button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider select-none">
                <tr>
                  <th className="px-4 py-3.5">Insumo</th>
                  <th className="px-4 py-3.5 hidden sm:table-cell">Lote / Proveedor</th>
                  <th className="px-4 py-3.5 text-right">Stock</th>
                  <th className="px-4 py-3.5 text-right hidden md:table-cell">Costo Unit.</th>
                  <th className="px-4 py-3.5 text-right hidden md:table-cell">Vencimiento</th>
                  <th className="px-4 py-3.5 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {insumos.map((item) => {
                  const tipoMeta = getTipoMeta(item.tipo);
                  const stockBajo = item.stockActual <= item.stockMinimo;
                  const vencido =
                    item.fechaVencimiento &&
                    new Date(item.fechaVencimiento) <= new Date();

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/50 transition-colors ${
                        stockBajo ? "bg-rose-50/30" : ""
                      }`}
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          {item.imagenUrl ? (
                            <div
                              onClick={() => setPreviewImage(item.imagenUrl!)}
                              className="relative group size-11 rounded-lg overflow-hidden border border-slate-200 shadow-xs shrink-0 cursor-pointer"
                              title="Ver imagen completa"
                            >
                              <img
                                src={item.imagenUrl}
                                alt={item.nombre}
                                className="size-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Eye className="size-4 text-white" />
                              </div>
                            </div>
                          ) : (
                            <div className="size-11 rounded-lg bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center text-xl">
                              {tipoMeta?.icon || "📦"}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                              {item.nombre}
                              {stockBajo && (
                                <span title="Stock crítico">
                                  <AlertCircle className="size-3.5 text-rose-500" />
                                </span>
                              )}
                              {vencido && (
                                <span title="Vencido">
                                  <Clock className="size-3.5 text-orange-500" />
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500">
                              {tipoMeta?.label || item.tipo}
                              {item.presentacion ? ` · ${item.presentacion}` : ""}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-slate-600 hidden sm:table-cell">
                        <div className="font-medium text-slate-800">{item.lote || "—"}</div>
                        <div className="text-xs text-slate-400">{item.proveedor || ""}</div>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div
                          className={`font-semibold ${
                            stockBajo ? "text-rose-600" : "text-slate-900"
                          }`}
                        >
                          {item.stockActual}{" "}
                          <span className="text-xs text-slate-500 font-normal">
                            {item.unidad}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {item.stockMinimo > 0 ? `Mínimo: ${item.stockMinimo}` : "Sin mínimo"}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-right text-slate-700 font-semibold hidden md:table-cell">
                        {item.costoUnitario > 0 ? formatUSD(item.costoUnitario) : "—"}
                      </td>

                      <td className="px-4 py-3.5 text-right hidden md:table-cell">
                        {item.fechaVencimiento ? (
                          <span
                            className={
                              vencido
                                ? "text-orange-600 text-xs font-semibold"
                                : "text-xs text-slate-500"
                            }
                          >
                            {new Date(item.fechaVencimiento).toLocaleDateString(
                              "es-BO",
                              { day: "numeric", month: "short", year: "numeric" }
                            )}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(item)}
                            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg p-1.5 transition-colors cursor-pointer"
                            title="Editar"
                          >
                            <Edit3 className="size-4" />
                          </button>
                          <button
                            onClick={() => setDeleteId(item.id)}
                            className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg p-1.5 transition-colors cursor-pointer"
                            title="Eliminar"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500 bg-slate-50/50">
            <span>
              Total <span className="font-semibold text-slate-900">{insumos.length}</span> insumos en inventario
            </span>
          </div>
        </div>
      )}

      {/* Modal Formulario Insumos */}
      <Dialog
        open={modal !== null}
        onOpenChange={(open) => {
          if (!open) setModal(null);
        }}
      >
        <DialogContent className="sm:max-w-lg font-sans">
          <DialogHeader>
            <DialogTitle className="font-semibold text-slate-900 text-lg">
              {editId ? "Editar Insumo" : "Nuevo Insumo"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {editId
                ? "Actualizá el stock o datos del insumo."
                : "Registrá un nuevo insumo veterinario o herramienta."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label htmlFor="nombre" className="text-slate-700 font-medium">Nombre *</Label>
                <Input
                  id="nombre"
                  value={form.nombre}
                  onChange={set("nombre")}
                  required
                  placeholder="Ej. Ivermectina 1%"
                  className="h-10"
                />
              </div>

              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label htmlFor="tipo" className="text-slate-700 font-medium">Tipo *</Label>
                <Select
                  value={form.tipo}
                  onValueChange={(v) => setForm((p) => ({ ...p, tipo: v }))}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposInsumo.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.icon} {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="stockActual" className="text-slate-700 font-medium">Stock Actual *</Label>
                <Input
                  id="stockActual"
                  type="number"
                  step="0.01"
                  value={form.stockActual}
                  onChange={set("stockActual")}
                  required
                  className="h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="stockMinimo" className="text-slate-700 font-medium">Stock Mínimo *</Label>
                <Input
                  id="stockMinimo"
                  type="number"
                  step="0.01"
                  value={form.stockMinimo}
                  onChange={set("stockMinimo")}
                  required
                  className="h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="unidad" className="text-slate-700 font-medium">Unidad de Medida</Label>
                <Input
                  id="unidad"
                  value={form.unidad}
                  onChange={set("unidad")}
                  placeholder="frascos, dosis, bolsas"
                  className="h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="costoUnitario" className="text-slate-700 font-medium">Costo Unitario ($)</Label>
                <Input
                  id="costoUnitario"
                  type="number"
                  step="0.01"
                  value={form.costoUnitario}
                  onChange={set("costoUnitario")}
                  className="h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lote" className="text-slate-700 font-medium">Lote</Label>
                <Input
                  id="lote"
                  value={form.lote}
                  onChange={set("lote")}
                  placeholder="L-2026-X"
                  className="h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fechaVencimiento" className="text-slate-700 font-medium">Fecha Vencimiento</Label>
                <Input
                  id="fechaVencimiento"
                  type="date"
                  value={form.fechaVencimiento}
                  onChange={set("fechaVencimiento")}
                  className="h-10"
                />
              </div>

              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="proveedor" className="text-slate-700 font-medium">Proveedor</Label>
                <Input
                  id="proveedor"
                  value={form.proveedor}
                  onChange={set("proveedor")}
                  placeholder="Nombre de la veterinaria o distribuidor"
                  className="h-10"
                />
              </div>

              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="notas" className="text-slate-700 font-medium">Notas</Label>
                <Textarea
                  id="notas"
                  value={form.notas}
                  onChange={set("notas")}
                  rows={2}
                  placeholder="Observaciones adicionales..."
                />
              </div>

              <div className="space-y-1.5 col-span-2 pt-2 border-t border-slate-100">
                <ImageUploader
                  value={form.imagenUrl}
                  onChange={(url) => setForm((prev) => ({ ...prev, imagenUrl: url }))}
                  folder="la_estancia/insumos"
                  label="Fotografía / Imagen de Referencia (Etiqueta o producto)"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={createInsumo.isPending || updateInsumo.isPending}
                className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-semibold shadow-sm flex items-center gap-2 cursor-pointer"
              >
                {(createInsumo.isPending || updateInsumo.isPending) && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                {editId ? "Guardar Cambios" : "Crear Insumo"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmar Eliminar */}
      <Dialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
        <DialogContent className="sm:max-w-sm font-sans">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-semibold text-base">
              Eliminar Insumo
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              ¿Confirmás que querés eliminar este insumo del inventario?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-3">
            <button
              onClick={() => setDeleteId(null)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteInsumo.isPending}
              className="rounded-lg bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-xs font-semibold shadow-sm flex items-center gap-2 cursor-pointer"
            >
              {deleteInsumo.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Eliminar
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Vista Previa de Imagen */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden bg-black/95 border-none font-sans">
          <DialogTitle className="sr-only">Imagen de Insumo</DialogTitle>
          <DialogDescription className="sr-only">Vista ampliada del insumo</DialogDescription>
          {previewImage && (
            <div className="relative flex items-center justify-center p-2 min-h-[300px] max-h-[80vh]">
              <img
                src={previewImage}
                alt="Vista ampliada del insumo"
                className="max-h-[80vh] w-auto object-contain rounded-lg shadow-2xl"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
