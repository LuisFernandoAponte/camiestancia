import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Stethoscope, CheckCircle2, Plus, Search, Loader2,
  Edit3, Trash2, Syringe, Bug, HeartPulse, Pill, FileDown,
  ChevronUp, ChevronDown, Check, X, Filter, XCircle, Clock,
  UserRound, Calendar, Tag, AlertTriangle
} from "lucide-react";
import { useSalud, useSaludDashboard, useCreateSalud, useUpdateSalud, useDeleteSalud } from "@/hooks/useSalud";
import { useBovinos } from "@/hooks/useBovinos";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/ui/PageHeader";
import { ResponsiveCardGrid } from "@/components/ui/ResponsiveCardGrid";
import { ResponsiveTable } from "@/components/ui/ResponsiveTable";

export const Route = createFileRoute("/admin/salud")({
  validateSearch: (search: Record<string, unknown>) => ({
    action: (search.action as string) || undefined,
  }),
  component: Salud,
});

const estadoStyles: Record<string, string> = {
  pendiente: "bg-rose-50 text-rose-700 border-rose-200 font-semibold",
  aplicado: "bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold",
  aplicada: "bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold",
  cancelado: "bg-slate-100 text-slate-500 line-through border-slate-200",
  reprogramado: "bg-blue-50 text-blue-700 border-blue-200 font-semibold",
};

const tipoIcon: Record<string, React.ReactNode> = {
  vacuna: <Syringe className="size-3.5" />,
  desparasitacion: <Bug className="size-3.5" />,
  chequeo: <HeartPulse className="size-3.5" />,
  tratamiento: <Pill className="size-3.5" />,
};

const tipoColor: Record<string, string> = {
  vacuna: "text-sky-700 bg-sky-50 border-sky-200",
  desparasitacion: "text-emerald-700 bg-emerald-50 border-emerald-200",
  chequeo: "text-amber-700 bg-amber-50 border-amber-200",
  tratamiento: "text-purple-700 bg-purple-50 border-purple-200",
};

const tipoIconColor: Record<string, string> = {
  vacuna: "bg-sky-100 text-sky-700",
  desparasitacion: "bg-emerald-100 text-emerald-700",
  chequeo: "bg-amber-100 text-amber-700",
  tratamiento: "bg-purple-100 text-purple-700",
};

const tipoOptions = [
  { value: "vacuna", label: "Vacuna" },
  { value: "desparasitacion", label: "Desparasitación" },
  { value: "chequeo", label: "Chequeo" },
  { value: "tratamiento", label: "Tratamiento" },
];

const estadoOptions = [
  { value: "pendiente", label: "Pendiente" },
  { value: "aplicado", label: "Aplicado" },
  { value: "cancelado", label: "Cancelado" },
  { value: "reprogramado", label: "Reprogramado" },
];

const today = () => new Date().toISOString().split("T")[0];

const defaultForm = {
  animal_id: "",
  tipo: "vacuna",
  fecha: today(),
  proxima_fecha: "",
  veterinario: "",
  estado: "pendiente",
  notas: "",
};

type SortKey = "tipo" | "fecha" | "proxima_fecha" | "veterinario" | "estado" | "chip";
type SortDir = "asc" | "desc";

function autoNextDate(tipo: string): string {
  const d = new Date();
  if (tipo === "vacuna") d.setFullYear(d.getFullYear() + 1);
  else if (tipo === "desparasitacion") d.setMonth(d.getMonth() + 6);
  else if (tipo === "chequeo") d.setMonth(d.getMonth() + 1);
  else d.setMonth(d.getMonth() + 3);
  return d.toISOString().split("T")[0];
}

function downloadCSV(data: any[], filename: string) {
  const headers = ["Animal", "Chip", "Tipo", "Fecha", "Próxima", "Veterinario", "Estado", "Notas"];
  const rows = data.map((e: any) => [
    e.nombre_animal || "", e.chip || "", e.tipo,
    e.fecha ? String(e.fecha).split("T")[0] : "",
    e.proxima_fecha ? String(e.proxima_fecha).split("T")[0] : "",
    e.veterinario || "", e.estado || "", e.notas || "",
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function Salud() {
  const searchParams = Route.useSearch();
  const [q, setQ] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<string>("todos");
  const [estadoFiltro, setEstadoFiltro] = useState<string>("todos");
  const [vetFiltro, setVetFiltro] = useState<string>("todos");
  const [sortKey, setSortKey] = useState<SortKey>("fecha");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [modal, setModal] = useState<"create" | "edit" | null>(searchParams.action === "new" ? "create" : null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchParams.action === "new") { setForm(defaultForm); setEditId(null); setModal("create"); }
  }, [searchParams.action]);

  const queryClient = useQueryClient();
  const { data: apiData, isLoading } = useSalud(1, 1000);
  const { data: bovinosData } = useBovinos(1, 1000);
  const { data: dashboardData } = useSaludDashboard();
  const createMutation = useCreateSalud();
  const updateMutation = useUpdateSalud();
  const deleteMutation = useDeleteSalud();

  const sourceData: any[] = apiData?.data && Array.isArray(apiData.data) ? apiData.data : [];
  const bovinos: any[] = bovinosData?.data && Array.isArray(bovinosData.data) ? bovinosData.data : [];

  const uniqueVets = useMemo(() => {
    const set = new Set<string>();
    sourceData.forEach((e: any) => { if (e.veterinario) set.add(e.veterinario); });
    return Array.from(set).sort();
  }, [sourceData]);

  const filtrados = useMemo(() => {
    let data = sourceData;
    if (tipoFiltro !== "todos") data = data.filter((e: any) => e.tipo === tipoFiltro);
    if (estadoFiltro !== "todos") data = data.filter((e: any) => e.estado === estadoFiltro);
    if (vetFiltro !== "todos") data = data.filter((e: any) => e.veterinario === vetFiltro);
    if (q) {
      const sq = q.toLowerCase();
      data = data.filter((e: any) =>
        `${e.nombre_animal || ""} ${e.chip || ""} ${e.tipo} ${e.veterinario || ""} ${e.notas || ""}`
          .toLowerCase().includes(sq)
      );
    }
    data = [...data].sort((a: any, b: any) => {
      let va = a[sortKey] ?? "", vb = b[sortKey] ?? "";
      if (sortKey === "fecha" || sortKey === "proxima_fecha") {
        va = new Date(va).getTime() || 0;
        vb = new Date(vb).getTime() || 0;
      } else {
        va = String(va).toLowerCase();
        vb = String(vb).toLowerCase();
      }
      return sortDir === "asc" ? (va < vb ? -1 : va > vb ? 1 : 0) : (va > vb ? -1 : va < vb ? 1 : 0);
    });
    return data;
  }, [sourceData, q, tipoFiltro, estadoFiltro, vetFiltro, sortKey, sortDir]);

  const activeFilters = useMemo(() => {
    const f: { key: string; label: string; onClear: () => void }[] = [];
    if (tipoFiltro !== "todos") f.push({ key: "tipo", label: `Tipo: ${tipoOptions.find((t) => t.value === tipoFiltro)?.label || tipoFiltro}`, onClear: () => setTipoFiltro("todos") });
    if (estadoFiltro !== "todos") f.push({ key: "estado", label: `Estado: ${estadoFiltro}`, onClear: () => setEstadoFiltro("todos") });
    if (vetFiltro !== "todos") f.push({ key: "vet", label: `Vet: ${vetFiltro}`, onClear: () => setVetFiltro("todos") });
    if (q) f.push({ key: "q", label: `"${q}"`, onClear: () => { setQ(""); searchRef.current?.focus(); } });
    return f;
  }, [tipoFiltro, estadoFiltro, vetFiltro, q]);

  const clearAllFilters = () => {
    setTipoFiltro("todos"); setEstadoFiltro("todos"); setVetFiltro("todos"); setQ("");
    searchRef.current?.focus();
  };

  const kpis = useMemo(() => {
    const total = dashboardData?.total_eventos ?? sourceData.length;
    const pendientes = dashboardData?.pendientes ?? sourceData.filter((e: any) => e.estado === "pendiente").length;
    const aplicadasMes = dashboardData?.aplicadas_mes ?? sourceData.filter((e: any) => {
      if (e.estado !== "aplicado" && e.estado !== "aplicada") return false;
      if (!e.fecha) return false;
      const d = new Date(e.fecha);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    const vencidas = sourceData.filter((e: any) =>
      e.estado === "pendiente" && e.proxima_fecha && new Date(e.proxima_fecha) < new Date()
    ).length;
    const pctPendientes = total > 0 ? Math.round((pendientes / total) * 100) : 0;
    const porTipo = tipoOptions.map((t) => ({
      ...t,
      count: sourceData.filter((e: any) => e.tipo === t.value).length,
    }));
    return { total, pendientes, aplicadasMes, vencidas, pctPendientes, porTipo };
  }, [dashboardData, sourceData]);

  const metricCards = useMemo(() => {
    return [
      {
        id: "total",
        label: "Eventos totales",
        value: kpis.total,
        icon: <Stethoscope className="size-4 text-emerald-600" />,
        subtext: `${kpis.porTipo.filter((t) => t.count > 0).map((t) => `${t.count} ${t.label.toLowerCase()}`).join(" · ")}`,
      },
      {
        id: "pendientes",
        label: "Pendientes",
        value: kpis.pendientes,
        icon: <Clock className="size-4 text-amber-500" />,
        subtext: `${kpis.pctPendientes}% del total ${kpis.vencidas > 0 ? `· ${kpis.vencidas} vencida(s)` : ""}`,
      },
      {
        id: "aplicadas",
        label: "Aplicadas este mes",
        value: kpis.aplicadasMes,
        icon: <CheckCircle2 className="size-4 text-emerald-600" />,
        subtext: new Date().toLocaleDateString("es-BO", { month: "long", year: "numeric" }),
      },
      ...kpis.porTipo.map((t) => ({
        id: t.value,
        label: t.label,
        value: t.count,
        icon: <span className={`p-1 rounded-md ${tipoIconColor[t.value]}`}>{tipoIcon[t.value]}</span>,
        subtext: "Registros del hato",
      })),
    ];
  }, [kpis]);

  const isAllSelected = filtrados.length > 0 && selectedIds.size === filtrados.length;
  const isSomeSelected = selectedIds.size > 0;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (isAllSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtrados.map((e: any) => e.id)));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const openCreate = () => {
    const firstId = bovinos.length > 0 ? bovinos[0].id : "";
    setForm({ ...defaultForm, animal_id: firstId });
    setEditId(null);
    setModal("create");
  };

  const openEdit = (e: any) => {
    setForm({
      animal_id: e.animal_id || "",
      tipo: e.tipo?.toLowerCase()?.replace(" ", "_") || "vacuna",
      fecha: e.fecha ? String(e.fecha).split("T")[0] : today(),
      proxima_fecha: e.proxima_fecha ? String(e.proxima_fecha).split("T")[0] : "",
      veterinario: e.veterinario || "",
      estado: e.estado || "pendiente",
      notas: e.notas || "",
    });
    setEditId(e.id);
    setModal("edit");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.animal_id) {
      setFeedback({ type: "error", message: "Debe seleccionar un animal" });
      return;
    }

    const payload: any = {
      animal_id: form.animal_id,
      tipo: form.tipo,
      fecha: form.fecha,
      veterinario: form.veterinario,
      estado: form.estado,
    };
    if (form.proxima_fecha) payload.proxima_fecha = form.proxima_fecha;
    if (form.notas) payload.notas = form.notas;

    try {
      if (editId) {
        await updateMutation.mutateAsync({ id: editId, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      setModal(null);
      setFeedback({ type: "success", message: editId ? "Evento actualizado correctamente" : "Evento de salud guardado exitosamente" });
      setTimeout(() => setFeedback(null), 4000);
      queryClient.invalidateQueries({ queryKey: ["salud"] });
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Error al guardar evento de salud" });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
      setFeedback({ type: "success", message: "Evento eliminado correctamente" });
      setTimeout(() => setFeedback(null), 3000);
      queryClient.invalidateQueries({ queryKey: ["salud"] });
    } catch {}
  };

  const handleInlineEstado = async (id: string, estado: string) => {
    try {
      await updateMutation.mutateAsync({ id, data: { estado } });
      setFeedback({ type: "success", message: `Estado actualizado a "${estadoOptions.find((o) => o.value === estado)?.label || estado}"` });
      setTimeout(() => setFeedback(null), 2000);
    } catch {}
  };

  const handleExport = () => {
    const data = selectedIds.size > 0 ? sourceData.filter((e: any) => selectedIds.has(e.id)) : filtrados;
    downloadCSV(data, `salud-${new Date().toISOString().split("T")[0]}.csv`);
    setFeedback({ type: "success", message: `Exportados ${data.length} registros` });
    setTimeout(() => setFeedback(null), 3000);
  };

  const modalBusy = createMutation.isPending || updateMutation.isPending;

  // Definición de columnas para ResponsiveTable (Desktop & Mobile)
  const columns = [
    {
      key: "select",
      header: (
        <Checkbox checked={isAllSelected} onCheckedChange={toggleSelectAll} aria-label="Seleccionar todos" />
      ),
      className: "w-10 text-center",
      render: (e: any) => (
        <Checkbox checked={selectedIds.has(e.id)} onCheckedChange={() => toggleSelect(e.id)} aria-label="Seleccionar" />
      ),
    },
    {
      key: "animal",
      header: "Animal",
      className: "min-w-[180px]",
      render: (e: any) => (
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 shrink-0">
            {e.chip || "—"}
          </span>
          <span className="font-semibold text-slate-900 truncate" title={e.nombre_animal || "Sin nombre"}>
            {e.nombre_animal || "Sin nombre"}
          </span>
        </div>
      ),
    },
    {
      key: "tipo",
      header: "Tipo",
      sortableKey: "tipo",
      render: (e: any) => (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border capitalize ${tipoColor[e.tipo] || "border-slate-200"}`}>
          {tipoIcon[e.tipo]}
          {e.tipo}
        </span>
      ),
    },
    {
      key: "fecha",
      header: "Aplicada",
      sortableKey: "fecha",
      render: (e: any) => (
        <span className="text-slate-600 text-xs font-medium">
          {e.fecha ? String(e.fecha).split("T")[0] : "—"}
        </span>
      ),
    },
    {
      key: "proxima_fecha",
      header: "Próxima Fecha",
      sortableKey: "proxima_fecha",
      render: (e: any) => {
        const isVencida = e.estado === "pendiente" && e.proxima_fecha && new Date(e.proxima_fecha) < new Date();
        return (
          <span className={`text-xs font-semibold ${isVencida ? "text-rose-600" : "text-slate-600"}`}>
            {e.proxima_fecha ? String(e.proxima_fecha).split("T")[0] : "—"}
            {isVencida && " ⚠️"}
          </span>
        );
      },
    },
    {
      key: "veterinario",
      header: "Veterinario",
      sortableKey: "veterinario",
      render: (e: any) => (
        <div className="flex items-center gap-1.5 text-slate-600 text-xs truncate max-w-[160px]" title={e.veterinario || "No asignado"}>
          <UserRound className="size-3.5 shrink-0 text-slate-400" />
          <span className="truncate">{e.veterinario || "—"}</span>
        </div>
      ),
    },
    {
      key: "estado",
      header: "Estado",
      sortableKey: "estado",
      render: (e: any) => (
        <select
          value={e.estado}
          onChange={(e2) => handleInlineEstado(e.id, e2.target.value)}
          className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize cursor-pointer border text-center outline-none shadow-2xs ${estadoStyles[e.estado] || ""}`}
        >
          {estadoOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ),
    },
    {
      key: "acciones",
      header: <span className="sr-only">Acciones</span>,
      className: "text-right w-24",
      render: (e: any) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => openEdit(e)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition cursor-pointer"
            title="Editar evento"
          >
            <Edit3 className="size-4" />
          </button>
          <button
            onClick={() => setDeleteId(e.id)}
            className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition cursor-pointer"
            title="Eliminar evento"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="w-full max-w-full min-w-0 overflow-x-hidden p-4 sm:p-6 md:p-8 space-y-6 font-sans text-slate-900">
        <div className="space-y-2">
          <div className="animate-pulse rounded-lg bg-slate-200/60 h-8 w-48" />
          <div className="animate-pulse rounded-lg bg-slate-200/60 h-4 w-64" />
        </div>
        <div className="grid gap-3.5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="animate-pulse rounded-2xl bg-slate-200/60 h-24" />)}
        </div>
        <div className="animate-pulse rounded-2xl bg-slate-200/60 h-80" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-full min-w-0 overflow-x-hidden p-4 sm:p-6 md:p-8 space-y-6 font-sans text-slate-900 antialiased">
      {/* Page Header Compartido */}
      <PageHeader
        title="Sanidad y Salud"
        description={`Historial clínico, vacunación y tratamientos — ${kpis.total} eventos registrados`}
        badge="Certificado"
      >
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 text-xs sm:text-sm font-semibold shadow-2026 transition cursor-pointer active:scale-[0.98]"
        >
          <Plus className="size-4" /> Nuevo evento
        </button>
      </PageHeader>

      {/* Feedback Alert */}
      {feedback && (
        <div className={`rounded-xl border px-4 py-3 text-xs font-semibold flex items-center gap-2 animate-fade-up ${
          feedback.type === "success"
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : "bg-rose-50 border-rose-200 text-rose-800"
        }`}>
          {feedback.type === "success" ? <Check className="size-4 shrink-0" /> : <XCircle className="size-4 shrink-0" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Metric Cards Compartidas */}
      <ResponsiveCardGrid items={metricCards} />

      {/* Filtros e Insumos Operativos */}
      <div className="space-y-3 w-full max-w-full min-w-0">
        <div className="flex flex-wrap items-center gap-2.5 w-full min-w-0">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              ref={searchRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por animal, chip, tipo o vet..."
              className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-8 py-2.5 text-xs font-semibold outline-none focus:border-emerald-600 shadow-xs"
            />
            {q && (
              <button
                onClick={() => { setQ(""); searchRef.current?.focus(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold cursor-pointer shadow-xs"
          >
            <option value="todos">Todos los estados</option>
            {estadoOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <select
            value={vetFiltro}
            onChange={(e) => setVetFiltro(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold cursor-pointer shadow-xs max-w-[160px]"
          >
            <option value="todos">Todos los veterinarios</option>
            {uniqueVets.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>

          {activeFilters.length > 0 && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer px-2"
            >
              <XCircle className="size-3.5" /> Limpiar
            </button>
          )}
        </div>

        {/* Filter Badges */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <Filter className="size-3 text-slate-400" />
            {activeFilters.map((f) => (
              <span key={f.key} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-700">
                {f.label}
                <button onClick={f.onClear} className="hover:text-slate-900 cursor-pointer">
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Bulk Export Actions Bar */}
      {isSomeSelected && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-300 bg-emerald-50/60 p-3 text-xs">
          <span className="font-bold text-emerald-900">{selectedIds.size} evento(s) seleccionado(s)</span>
          <div className="h-4 w-px bg-emerald-200" />
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 font-semibold text-emerald-800 hover:bg-emerald-100 cursor-pointer transition shadow-2xs"
          >
            <FileDown className="size-3.5" /> Exportar Selección CSV
          </button>
          <button onClick={clearSelection} className="text-slate-500 hover:text-slate-900 ml-auto cursor-pointer font-medium">
            Limpiar selección
          </button>
        </div>
      )}

      {/* Tabla Responsiva con Renderizado de Cards para Móvil (< lg) y Tabla (>= lg) */}
      <ResponsiveTable
        data={filtrados}
        columns={columns}
        keyExtractor={(e: any) => e.id}
        onSort={(key) => toggleSort(key as SortKey)}
        activeSortKey={sortKey}
        sortDirection={sortDir}
        emptyState={
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500 space-y-3">
            <Stethoscope className="size-10 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-800">No se encontraron eventos sanitarios</p>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Probá cambiando los términos de búsqueda o limpiá los filtros activos.
            </p>
            {activeFilters.length > 0 && (
              <button onClick={clearAllFilters} className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:underline cursor-pointer">
                Restablecer filtros
              </button>
            )}
          </div>
        }
        mobileCardRender={(e: any) => {
          const isVencida = e.estado === "pendiente" && e.proxima_fecha && new Date(e.proxima_fecha) < new Date();
          return (
            <div className={`w-full max-w-full min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-3 ${selectedIds.has(e.id) ? "border-emerald-500 bg-emerald-50/20" : ""}`}>
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Checkbox checked={selectedIds.has(e.id)} onCheckedChange={() => toggleSelect(e.id)} />
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 shrink-0">
                    {e.chip || "—"}
                  </span>
                  <span className="font-bold text-sm text-slate-900 truncate" title={e.nombre_animal}>
                    {e.nombre_animal || "Sin nombre"}
                  </span>
                </div>

                <select
                  value={e.estado}
                  onChange={(e2) => handleInlineEstado(e.id, e2.target.value)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize border cursor-pointer outline-none ${estadoStyles[e.estado] || ""}`}
                >
                  {estadoOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-semibold block">Tipo</span>
                  <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold border mt-0.5 capitalize ${tipoColor[e.tipo] || ""}`}>
                    {tipoIcon[e.tipo]}
                    {e.tipo}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-semibold block">Veterinario</span>
                  <span className="text-slate-800 font-semibold truncate block mt-0.5" title={e.veterinario}>
                    {e.veterinario || "—"}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-semibold block">Fecha Aplicación</span>
                  <span className="text-slate-700 font-medium block mt-0.5">
                    {e.fecha ? String(e.fecha).split("T")[0] : "—"}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-semibold block">Próxima Fecha</span>
                  <span className={`font-semibold block mt-0.5 ${isVencida ? "text-rose-600" : "text-slate-700"}`}>
                    {e.proxima_fecha ? String(e.proxima_fecha).split("T")[0] : "—"} {isVencida && "⚠"}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => openEdit(e)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold transition"
                >
                  <Edit3 className="size-3.5" /> Editar
                </button>
                <button
                  onClick={() => setDeleteId(e.id)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-semibold transition"
                >
                  <Trash2 className="size-3.5" /> Eliminar
                </button>
              </div>
            </div>
          );
        }}
      />

      {/* Modal Nuevo / Editar Evento */}
      <Dialog open={modal !== null} onOpenChange={(open) => { if (!open) setModal(null); }}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">{editId ? "Editar evento sanitario" : "Nuevo evento sanitario"}</DialogTitle>
            <DialogDescription className="text-xs">
              {editId ? "Actualizá los detalles de la intervención veterinaria." : "Registrá un nuevo evento clínico o preventivo para un ejemplar del hato."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="animal_id" className="font-semibold">Animal *</Label>
                <Select value={form.animal_id} onValueChange={(v) => setForm({ ...form, animal_id: v })}>
                  <SelectTrigger className="h-10 text-xs"><SelectValue placeholder="Seleccionar animal..." /></SelectTrigger>
                  <SelectContent>
                    {bovinos.length === 0 ? (
                      <SelectItem value="none" disabled>No hay animales registrados</SelectItem>
                    ) : (
                      bovinos.map((b: any) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.chip || b.id?.slice(0, 8)} - {b.nombre || "sin nombre"} ({b.potrero || "General"})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tipo" className="font-semibold">Tipo de Evento *</Label>
                <Select value={form.tipo} onValueChange={(v) => {
                  const next = autoNextDate(v);
                  setForm({ ...form, tipo: v, proxima_fecha: form.proxima_fecha || next });
                }}>
                  <SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {tipoOptions.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="estado" className="font-semibold">Estado</Label>
                <Select value={form.estado} onValueChange={(v) => setForm({ ...form, estado: v })}>
                  <SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {estadoOptions.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fecha" className="font-semibold">Fecha Aplicación *</Label>
                <Input id="fecha" type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} required className="h-10 text-xs" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="proxima_fecha" className="font-semibold">
                  Próxima Fecha
                  {form.tipo && (
                    <button type="button" onClick={() => setForm({ ...form, proxima_fecha: autoNextDate(form.tipo) })} className="ml-2 text-[10px] text-emerald-600 hover:underline cursor-pointer">
                      Sugerir
                    </button>
                  )}
                </Label>
                <Input id="proxima_fecha" type="date" value={form.proxima_fecha} onChange={(e) => setForm({ ...form, proxima_fecha: e.target.value })} className="h-10 text-xs" />
              </div>

              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="veterinario" className="font-semibold">Veterinario Responsable *</Label>
                <Input id="veterinario" value={form.veterinario} onChange={(e) => setForm({ ...form, veterinario: e.target.value })} required placeholder="Dr. Apellido / Clínica" className="h-10 text-xs" />
              </div>

              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="notas" className="font-semibold">Notas u Observaciones</Label>
                <Textarea id="notas" value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} placeholder="Ej: Dosis 5ml, marca Aftobagó, potrero 3..." rows={3} className="text-xs" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold hover:bg-slate-50 cursor-pointer">
                Cancelar
              </button>
              <button type="submit" disabled={modalBusy} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-xs">
                {modalBusy && <Loader2 className="size-4 animate-spin" />}
                {editId ? "Guardar cambios" : "Crear evento"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Eliminar Evento */}
      <Dialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Eliminar evento sanitario</DialogTitle>
            <DialogDescription className="text-xs">
              Esta acción eliminará el registro permanentemente de la base de datos. ¿Confirmás?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-2 text-xs">
            <button onClick={() => setDeleteId(null)} className="rounded-xl border border-slate-200 px-4 py-2 font-semibold hover:bg-slate-50 cursor-pointer">
              Cancelar
            </button>
            <button onClick={handleDelete} disabled={deleteMutation.isPending} className="rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2 font-semibold text-white disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-xs">
              {deleteMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Eliminar
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}