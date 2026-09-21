import { createFileRoute } from "@tanstack/react-router";
import {
  useBovinos,
  useCreateBovino,
  useUpdateBovino,
  useDeleteBovino,
  useBulkUpdateBovino,
} from "@/hooks/useBovinos";
import { useMemo, useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Plus,
  Loader2,
  Edit3,
  Trash2,
  Beef,
  ShieldAlert,
  TrendingUp,
  Venus,
  Mars,
  AlertCircle,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Weight,
  MapPin,
  Eye,
  FileDown,
  Filter,
  XCircle,
  ListFilter,
  BadgeInfo,
  Syringe,
  Baby,
  Dna,
} from "lucide-react";
import { GenealogiaTreeModal } from "@/components/admin/GenealogiaTreeModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ImageUploader } from "@/components/ui/ImageUploader";

export const Route = createFileRoute("/admin/inventario")({
  validateSearch: (search: Record<string, unknown>) => ({
    search: (search.search as string) || undefined,
    action: (search.action as string) || undefined,
  }),
  component: Inventario,
});

const estadoPills: Record<string, string> = {
  activo: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
  disponible: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
  preñez: "bg-purple-50 text-purple-700 border-purple-200/60",
  cuarentena: "bg-amber-50 text-amber-700 border-amber-200/60",
  vendido: "bg-slate-100 text-slate-600 border-slate-200/60 line-through",
  fallecido: "bg-rose-50 text-rose-700 border-rose-200/60",
};

const estadoOptions = [
  { value: "activo", label: "Activo" },
  { value: "disponible", label: "Disponible" },
  { value: "preñez", label: "Preñez" },
  { value: "cuarentena", label: "Cuarentena" },
  { value: "vendido", label: "Vendido" },
  { value: "fallecido", label: "Fallecido" },
];

const defaultForm = {
  chip: "",
  nombre: "",
  raza: "",
  sexo: "Macho" as string,
  nacimiento: "",
  pesoInicial: "",
  pesoActual: "",
  potrero: "",
  estado: "activo",
  precio: "",
  fotoUrl: "",
  madreId: "",
  padreId: "",
};

type SortKey =
  | "nombre"
  | "raza"
  | "sexo"
  | "pesoActual"
  | "potrero"
  | "estado"
  | "nacimiento"
  | "chip";
type SortDir = "asc" | "desc";

function edadDesde(fecha: string): string {
  if (!fecha) return "—";
  const nac = new Date(fecha);
  const hoy = new Date();
  if (isNaN(nac.getTime())) return "—";
  let años = hoy.getFullYear() - nac.getFullYear();
  let meses = hoy.getMonth() - nac.getMonth();
  if (meses < 0) {
    años--;
    meses += 12;
  }
  if (años > 0) return `${años}a ${meses}m`;
  return `${meses}m`;
}

function formatPeso(n: number): string {
  return `${n.toFixed(1)} kg`;
}

function downloadCSV(data: any[], filename: string) {
  const headers = [
    "ID",
    "Chip",
    "Nombre",
    "Raza",
    "Sexo",
    "Edad",
    "Peso (kg)",
    "Potrero",
    "Estado",
    "Precio (USD)",
  ];
  const rows = data.map((b: any) => [
    b.id,
    b.chip,
    b.nombre,
    b.raza,
    b.sexo,
    edadDesde(b.nacimiento),
    b.pesoActual ?? 0,
    b.potrero,
    b.estado,
    b.precio ?? "",
  ]);
  const csv = [
    headers.join(","),
    ...rows.map((r) => r.map((v) => `"${v}"`).join(",")),
  ].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function Inventario() {
  const searchParams = Route.useSearch();
  const [q, setQ] = useState(searchParams.search || "");
  const [estadoFilter, setEstadoFilter] = useState<string>("todos");
  const [sexoFilter, setSexoFilter] = useState<string>("todos");
  const [potreroFilter, setPotreroFilter] = useState<string>("todos");
  const [razaFilter, setRazaFilter] = useState<string>("todos");
  const [pesoMin, setPesoMin] = useState("");
  const [pesoMax, setPesoMax] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("nombre");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [modal, setModal] = useState<"create" | "edit" | null>(
    searchParams.action === "new" ? "create" : null
  );
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailAnimal, setDetailAnimal] = useState<any>(null);
  const [genealogiaAnimalId, setGenealogiaAnimalId] = useState<string | null>(null);
  const [bulkEstadoOpen, setBulkEstadoOpen] = useState(false);
  const [bulkPotreroOpen, setBulkPotreroOpen] = useState(false);
  const [bulkEstado, setBulkEstado] = useState("");
  const [bulkPotrero, setBulkPotrero] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchParams.search) setQ(searchParams.search);
    if (searchParams.action === "new") {
      setForm(defaultForm);
      setEditId(null);
      setModal("create");
    }
  }, [searchParams.search, searchParams.action]);

  const queryClient = useQueryClient();

  const { data: apiData, isLoading } = useBovinos(1, 1000);
  const createMutation = useCreateBovino();
  const updateMutation = useUpdateBovino();
  const deleteMutation = useDeleteBovino();
  const bulkMutation = useBulkUpdateBovino();

  const sourceData: any[] =
    apiData?.data && Array.isArray(apiData.data) ? apiData.data : [];

  const uniquePotreros = useMemo(() => {
    const set = new Set<string>();
    sourceData.forEach((b: any) => {
      if (b.potrero) set.add(b.potrero);
    });
    return Array.from(set).sort();
  }, [sourceData]);

  const uniqueRazas = useMemo(() => {
    const set = new Set<string>();
    sourceData.forEach((b: any) => {
      if (b.raza) set.add(b.raza);
    });
    return Array.from(set).sort();
  }, [sourceData]);

  const filtrados = useMemo(() => {
    let data = sourceData;
    if (estadoFilter !== "todos")
      data = data.filter((b: any) => b.estado === estadoFilter);
    if (sexoFilter !== "todos")
      data = data.filter((b: any) => b.sexo === sexoFilter);
    if (potreroFilter !== "todos")
      data = data.filter((b: any) => b.potrero === potreroFilter);
    if (razaFilter !== "todos")
      data = data.filter((b: any) => b.raza === razaFilter);
    if (pesoMin)
      data = data.filter(
        (b: any) => (b.pesoActual ?? 0) >= parseFloat(pesoMin)
      );
    if (pesoMax)
      data = data.filter(
        (b: any) => (b.pesoActual ?? 0) <= parseFloat(pesoMax)
      );
    if (q) {
      const sq = q.toLowerCase();
      data = data.filter((b: any) =>
        `${b.nombre} ${b.id} ${b.chip} ${b.raza} ${b.potrero} ${b.estado}`
          .toLowerCase()
          .includes(sq)
      );
    }
    data = [...data].sort((a: any, b: any) => {
      let va = a[sortKey] ?? "",
        vb = b[sortKey] ?? "";
      if (sortKey === "pesoActual") {
        va = parseFloat(va) || 0;
        vb = parseFloat(vb) || 0;
      } else if (sortKey === "nacimiento") {
        va = new Date(va).getTime() || 0;
        vb = new Date(vb).getTime() || 0;
      } else {
        va = String(va).toLowerCase();
        vb = String(vb).toLowerCase();
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return data;
  }, [
    sourceData,
    q,
    estadoFilter,
    sexoFilter,
    potreroFilter,
    razaFilter,
    pesoMin,
    pesoMax,
    sortKey,
    sortDir,
  ]);

  const activeFilters = useMemo(() => {
    const f: { key: string; label: string; onClear: () => void }[] = [];
    if (estadoFilter !== "todos")
      f.push({
        key: "estado",
        label: `Estado: ${estadoFilter}`,
        onClear: () => setEstadoFilter("todos"),
      });
    if (sexoFilter !== "todos")
      f.push({
        key: "sexo",
        label: `Sexo: ${sexoFilter}`,
        onClear: () => setSexoFilter("todos"),
      });
    if (potreroFilter !== "todos")
      f.push({
        key: "potrero",
        label: `Potrero: ${potreroFilter}`,
        onClear: () => setPotreroFilter("todos"),
      });
    if (razaFilter !== "todos")
      f.push({
        key: "raza",
        label: `Raza: ${razaFilter}`,
        onClear: () => setRazaFilter("todos"),
      });
    if (pesoMin)
      f.push({
        key: "pesoMin",
        label: `Peso ≥ ${pesoMin} kg`,
        onClear: () => setPesoMin(""),
      });
    if (pesoMax)
      f.push({
        key: "pesoMax",
        label: `Peso ≤ ${pesoMax} kg`,
        onClear: () => setPesoMax(""),
      });
    if (q)
      f.push({
        key: "q",
        label: `Buscar: "${q}"`,
        onClear: () => {
          setQ("");
          searchRef.current?.focus();
        },
      });
    return f;
  }, [
    estadoFilter,
    sexoFilter,
    potreroFilter,
    razaFilter,
    pesoMin,
    pesoMax,
    q,
  ]);

  const clearAllFilters = () => {
    setEstadoFilter("todos");
    setSexoFilter("todos");
    setPotreroFilter("todos");
    setRazaFilter("todos");
    setPesoMin("");
    setPesoMax("");
    setQ("");
    searchRef.current?.focus();
  };

  const stats = useMemo(
    () => ({
      total: sourceData.length,
      machos: sourceData.filter((b: any) => b.sexo === "Macho").length,
      hembras: sourceData.filter((b: any) => b.sexo === "Hembra").length,
      disponibles: sourceData.filter((b: any) => b.estado === "disponible")
        .length,
      preñez: sourceData.filter((b: any) => b.estado === "preñez").length,
      cuarentena: sourceData.filter((b: any) => b.estado === "cuarentena")
        .length,
      pesoPromedio: (() => {
        const pesos = sourceData
          .map((b: any) => parseFloat(b.pesoActual))
          .filter((p: number) => p > 0);
        return pesos.length
          ? pesos.reduce((a: number, b: number) => a + b, 0) / pesos.length
          : 0;
      })(),
      potrerosCount: uniquePotreros.length,
    }),
    [sourceData, uniquePotreros]
  );

  const isAllSelected =
    filtrados.length > 0 && selectedIds.size === filtrados.length;
  const isSomeSelected = selectedIds.size > 0;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (isAllSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtrados.map((b: any) => b.id)));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortArrow = (key: SortKey) => {
    if (sortKey !== key) return null;
    return sortDir === "asc" ? (
      <ChevronUp className="size-3 inline ml-1" />
    ) : (
      <ChevronDown className="size-3 inline ml-1" />
    );
  };

  const openCreate = () => {
    setForm(defaultForm);
    setEditId(null);
    setModal("create");
  };

  const openEdit = (b: any) => {
    setForm({
      chip: b.chip || "",
      nombre: b.nombre || "",
      raza: b.raza || "",
      sexo: b.sexo || "Macho",
      nacimiento: b.nacimiento ? String(b.nacimiento).split("T")[0] : "",
      pesoInicial: b.pesoInicial?.toString() || "",
      pesoActual: b.pesoActual?.toString() || "",
      potrero: b.potrero || "",
      estado: b.estado || "activo",
      precio: b.precio?.toString() || "",
      fotoUrl: b.foto || b.fotoUrl || "",
      madreId: b.madreId || "",
      padreId: b.padreId || "",
    });
    setEditId(b.id);
    setModal("edit");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      chip: form.chip,
      nombre: form.nombre,
      raza: form.raza,
      sexo: form.sexo,
      nacimiento: form.nacimiento,
      pesoInicial: parseFloat(form.pesoInicial) || 0,
      pesoActual: parseFloat(form.pesoActual) || 0,
      potrero: form.potrero,
      estado: form.estado,
      precio: parseFloat(form.precio) || undefined,
      foto: form.fotoUrl || undefined,
      fotoUrl: form.fotoUrl || undefined,
      madreId: form.madreId || undefined,
      padreId: form.padreId || undefined,
    };

    try {
      if (editId) {
        await updateMutation.mutateAsync({ id: editId, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      setModal(null);
      setFeedback({
        type: "success",
        message: editId ? "Bovino actualizado" : "Bovino creado exitosamente",
      });
      setTimeout(() => setFeedback(null), 3000);
      queryClient.invalidateQueries({ queryKey: ["bovinos"] });
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err?.message || "Error guardando el registro de bovino",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
      setFeedback({ type: "success", message: "Bovino eliminado" });
      setTimeout(() => setFeedback(null), 3000);
      queryClient.invalidateQueries({ queryKey: ["bovinos"] });
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err?.message || "Error al eliminar bovino",
      });
    }
  };

  const handleInlineEstado = async (id: string, estado: string) => {
    try {
      await updateMutation.mutateAsync({ id, data: { estado } });
      setFeedback({
        type: "success",
        message: `Estado actualizado a "${
          estadoOptions.find((o) => o.value === estado)?.label || estado
        }"`,
      });
      setTimeout(() => setFeedback(null), 2000);
    } catch {}
  };

  const handleBulkEstado = async () => {
    if (!bulkEstado || selectedIds.size === 0) return;
    try {
      await bulkMutation.mutateAsync({
        ids: Array.from(selectedIds),
        data: { estado: bulkEstado },
      });
      setBulkEstadoOpen(false);
      setSelectedIds(new Set());
      setFeedback({
        type: "success",
        message: `${selectedIds.size} bovinos actualizados a "${bulkEstado}"`,
      });
      setTimeout(() => setFeedback(null), 3000);
    } catch {}
  };

  const handleBulkPotrero = async () => {
    if (!bulkPotrero || selectedIds.size === 0) return;
    try {
      await bulkMutation.mutateAsync({
        ids: Array.from(selectedIds),
        data: { potrero: bulkPotrero },
      });
      setBulkPotreroOpen(false);
      setSelectedIds(new Set());
      setFeedback({
        type: "success",
        message: `${selectedIds.size} bovinos movidos a "${bulkPotrero}"`,
      });
      setTimeout(() => setFeedback(null), 3000);
    } catch {}
  };

  const handleExportCSV = () => {
    const data =
      selectedIds.size > 0
        ? sourceData.filter((b: any) => selectedIds.has(b.id))
        : filtrados;
    downloadCSV(
      data,
      `inventario-bovino-${new Date().toISOString().split("T")[0]}.csv`
    );
    setFeedback({
      type: "success",
      message: `Exportados ${data.length} registros`,
    });
    setTimeout(() => setFeedback(null), 3000);
  };

  const sexoInvalido = form.sexo === "Macho" && form.estado === "preñez";
  const modalBusy = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50/50 p-6 md:p-8 space-y-6 font-sans">
        <div className="space-y-2">
          <div className="animate-pulse rounded-lg bg-slate-200/60 h-8 w-48" />
          <div className="animate-pulse rounded-lg bg-slate-200/60 h-4 w-64" />
        </div>
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl bg-white border border-slate-200/80 h-24 shadow-sm" />
          ))}
        </div>
        <div className="animate-pulse rounded-xl bg-white border border-slate-200/80 h-96 shadow-sm" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-3.5 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto font-sans text-slate-900 antialiased">
      {/* Header Superior */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
            Inventario Bovino
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {sourceData.length} animales en trazabilidad · {stats.potrerosCount} potreros activos
          </p>
        </div>

        <button
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 text-xs font-semibold shadow-sm transition-all duration-150 active:scale-[0.98] cursor-pointer w-full sm:w-auto min-h-[44px] sm:min-h-0"
        >
          <Plus className="size-4" />
          <span>Nuevo Bovino</span>
        </button>
      </div>

      {/* Alert Feedback */}
      {feedback && (
        <div
          className={`rounded-xl border px-4 py-3 text-xs font-medium flex items-center gap-2 shadow-xs ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200/60 text-emerald-800"
              : "bg-rose-50 border-rose-200/60 text-rose-800"
          }`}
        >
          {feedback.type === "success" ? (
            <Check className="size-4 shrink-0 text-emerald-600" />
          ) : (
            <XCircle className="size-4 shrink-0 text-rose-600" />
          )}
          {feedback.message}
        </div>
      )}

      {/* Tarjetas de Resumen (KPIs) - Estilo Tailwind UI */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1">
            <Beef className="size-4 text-slate-400" /> Total
          </div>
          <div className="text-2xl font-semibold tracking-tight text-slate-900">
            {stats.total}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1">
            <Mars className="size-4 text-blue-500" /> Machos
          </div>
          <div className="text-2xl font-semibold tracking-tight text-slate-900">
            {stats.machos}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1">
            <Venus className="size-4 text-pink-500" /> Hembras
          </div>
          <div className="text-2xl font-semibold tracking-tight text-slate-900">
            {stats.hembras}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1">
            <Weight className="size-4 text-sky-500" /> Peso Prom.
          </div>
          <div className="text-2xl font-semibold tracking-tight text-slate-900">
            {stats.pesoPromedio > 0 ? Math.round(stats.pesoPromedio) : "—"}
            <span className="text-xs text-slate-400 ml-1 font-normal">kg</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1">
            <TrendingUp className="size-4 text-emerald-500" /> Disponibles
          </div>
          <div className="text-2xl font-semibold tracking-tight text-slate-900">
            {stats.disponibles}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1">
            <ShieldAlert className="size-4 text-amber-500" /> Cuarentena
          </div>
          <div className="text-2xl font-semibold tracking-tight text-slate-900">
            {stats.cuarentena}
          </div>
        </div>
      </div>

      {/* Búsqueda y Filtros Unificados */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2.5 items-center">
          {/* Input de Búsqueda */}
          <div className="relative flex-1 min-w-[220px] h-10">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              ref={searchRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre, chip, raza, potrero..."
              className="w-full h-10 bg-white border border-slate-300 rounded-lg pl-10 pr-9 text-sm text-slate-900 shadow-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition"
            />
            {q && (
              <button
                onClick={() => {
                  setQ("");
                  searchRef.current?.focus();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Toggle Sexo (Pill Tabs) */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg h-10 border border-slate-200/70">
            {[
              { value: "todos", label: "Todos" },
              { value: "Macho", label: "Machos", icon: Mars },
              { value: "Hembra", label: "Hembras", icon: Venus },
            ].map((opt) => {
              const Icon = opt.icon;
              const active = sexoFilter === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setSexoFilter(opt.value)}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs transition cursor-pointer rounded-md h-8 ${
                    active
                      ? "bg-white text-slate-900 font-semibold shadow-xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {Icon && <Icon className="size-3.5" />}
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Dropdown Estado */}
          <select
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value)}
            className="h-10 bg-white border border-slate-300 rounded-lg px-3 text-sm text-slate-700 shadow-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none min-w-[130px]"
          >
            <option value="todos">Todos estados</option>
            {estadoOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          {/* Dropdown Potrero */}
          <select
            value={potreroFilter}
            onChange={(e) => setPotreroFilter(e.target.value)}
            className="h-10 bg-white border border-slate-300 rounded-lg px-3 text-sm text-slate-700 shadow-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none min-w-[130px]"
          >
            <option value="todos">Todos potreros</option>
            {uniquePotreros.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {/* Dropdown Raza */}
          <select
            value={razaFilter}
            onChange={(e) => setRazaFilter(e.target.value)}
            className="h-10 bg-white border border-slate-300 rounded-lg px-3 text-sm text-slate-700 shadow-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none min-w-[120px]"
          >
            <option value="todos">Todas razas</option>
            {uniqueRazas.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          {/* Filtros Rango Peso */}
          <div className="flex items-center gap-1.5 h-10">
            <input
              value={pesoMin}
              onChange={(e) => setPesoMin(e.target.value)}
              placeholder="Min kg"
              type="number"
              className="w-20 h-10 bg-white border border-slate-300 rounded-lg px-3 text-sm text-slate-900 shadow-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
            />
            <span className="text-slate-400 text-xs">—</span>
            <input
              value={pesoMax}
              onChange={(e) => setPesoMax(e.target.value)}
              placeholder="Max kg"
              type="number"
              className="w-20 h-10 bg-white border border-slate-300 rounded-lg px-3 text-sm text-slate-900 shadow-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
            />
          </div>

          {activeFilters.length > 0 && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-rose-600 cursor-pointer px-2 h-10"
            >
              <XCircle className="size-4" /> Limpiar
            </button>
          )}
        </div>

        {/* Tags de Filtros Activos */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="size-3.5 text-slate-400" />
            {activeFilters.map((f) => (
              <span
                key={f.key}
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 border border-slate-200/70"
              >
                {f.label}
                <button
                  onClick={f.onClear}
                  className="hover:text-slate-900 cursor-pointer"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Barra de Acciones Masivas */}
      {isSomeSelected && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 shadow-xs">
          <span className="text-xs font-semibold text-emerald-900">
            {selectedIds.size} seleccionado{selectedIds.size !== 1 ? "s" : ""}
          </span>
          <div className="h-4 w-px bg-emerald-200" />
          <button
            onClick={() => setBulkEstadoOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50 cursor-pointer"
          >
            <ListFilter className="size-3.5 text-slate-500" /> Cambiar Estado
          </button>
          <button
            onClick={() => setBulkPotreroOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50 cursor-pointer"
          >
            <MapPin className="size-3.5 text-slate-500" /> Mover Potrero
          </button>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50 cursor-pointer"
          >
            <FileDown className="size-3.5 text-slate-500" /> Exportar CSV
          </button>
          <button
            onClick={clearSelection}
            className="text-xs font-medium text-slate-500 hover:text-slate-900 ml-auto cursor-pointer"
          >
            Limpiar Selección
          </button>
        </div>
      )}

      {/* Tabla Principal de Datos - Estilo Tailwind UI */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider select-none">
              <tr>
                <th className="w-10 px-3 py-3.5">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Seleccionar todos"
                  />
                </th>
                <th
                  className="px-4 py-3.5 cursor-pointer hover:text-slate-900"
                  onClick={() => toggleSort("nombre")}
                >
                  Animal {sortArrow("nombre")}
                </th>
                <th
                  className="px-4 py-3.5 cursor-pointer hover:text-slate-900"
                  onClick={() => toggleSort("raza")}
                >
                  Raza {sortArrow("raza")}
                </th>
                <th
                  className="px-4 py-3.5 cursor-pointer hover:text-slate-900"
                  onClick={() => toggleSort("sexo")}
                >
                  Sexo {sortArrow("sexo")}
                </th>
                <th
                  className="px-4 py-3.5 cursor-pointer hover:text-slate-900"
                  onClick={() => toggleSort("nacimiento")}
                >
                  Edad {sortArrow("nacimiento")}
                </th>
                <th
                  className="px-4 py-3.5 cursor-pointer hover:text-slate-900"
                  onClick={() => toggleSort("pesoActual")}
                >
                  Peso {sortArrow("pesoActual")}
                </th>
                <th
                  className="px-4 py-3.5 cursor-pointer hover:text-slate-900"
                  onClick={() => toggleSort("potrero")}
                >
                  Potrero {sortArrow("potrero")}
                </th>
                <th
                  className="px-4 py-3.5 cursor-pointer hover:text-slate-900"
                  onClick={() => toggleSort("chip")}
                >
                  Chip {sortArrow("chip")}
                </th>
                <th
                  className="px-4 py-3.5 cursor-pointer hover:text-slate-900"
                  onClick={() => toggleSort("estado")}
                >
                  Estado {sortArrow("estado")}
                </th>
                <th className="px-4 py-3.5 text-right min-w-[140px]">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {filtrados.map((b: any) => (
                <tr
                  key={b.id}
                  className={`hover:bg-slate-50/50 transition-colors ${
                    selectedIds.has(b.id) ? "bg-emerald-50/30" : ""
                  }`}
                >
                  <td className="px-3 py-3.5">
                    <Checkbox
                      checked={selectedIds.has(b.id)}
                      onCheckedChange={() => toggleSelect(b.id)}
                      aria-label={`Seleccionar ${b.nombre}`}
                    />
                  </td>

                  <td className="px-4 py-3.5 font-medium text-slate-900">
                    <button
                      onClick={() => setDetailAnimal(b)}
                      className="hover:text-emerald-600 text-left cursor-pointer font-semibold"
                    >
                      {b.nombre || "Sin nombre"}
                    </button>
                  </td>

                  <td className="px-4 py-3.5 text-slate-600">{b.raza}</td>

                  <td className="px-4 py-3.5 text-slate-600">
                    <span className="inline-flex items-center gap-1 text-xs">
                      {b.sexo === "Macho" ? (
                        <Mars className="size-3.5 text-blue-500" />
                      ) : (
                        <Venus className="size-3.5 text-pink-500" />
                      )}
                      {b.sexo}
                    </span>
                  </td>

                  <td className="px-4 py-3.5 text-slate-500 text-xs">
                    {edadDesde(b.nacimiento)}
                  </td>

                  <td className="px-4 py-3.5 font-semibold text-slate-900">
                    {b.pesoActual ? formatPeso(b.pesoActual) : "—"}
                  </td>

                  <td className="px-4 py-3.5 text-slate-700">{b.potrero || "—"}</td>

                  <td className="px-4 py-3.5 font-mono text-xs text-slate-500">
                    {b.chip}
                  </td>

                  {/* Estado Badge Pill */}
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${
                        estadoPills[b.estado] ||
                        "bg-slate-100 text-slate-700 border-slate-200/60"
                      }`}
                    >
                      {b.estado}
                    </span>
                  </td>

                  {/* Acciones Ghost Buttons */}
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setGenealogiaAnimalId(b.id)}
                        className="grid size-7 place-items-center rounded-md hover:bg-emerald-500/10 text-emerald-600 cursor-pointer"
                        title="Ver Pedigree y Árbol Genealógico Completo"
                      >
                        <Dna className="size-3.5" />
                      </button>
                      <button
                        onClick={() => setDetailAnimal(b)}
                        className="grid size-7 place-items-center rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-900 cursor-pointer"
                        title="Ver Ficha Detallada"
                      >
                        <Eye className="size-3.5" />
                      </button>
                      <button
                        onClick={() => openEdit(b)}
                        className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg p-1.5 transition-colors cursor-pointer"
                        title="Editar"
                      >
                        <Edit3 className="size-4" />
                      </button>
                      <button
                        onClick={() => setDeleteId(b.id)}
                        className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg p-1.5 transition-colors cursor-pointer"
                        title="Eliminar"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filtrados.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-16 text-center text-slate-500"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Beef className="size-8 text-slate-300" />
                      <p className="text-sm font-medium">
                        No se encontraron animales
                        {activeFilters.length > 0
                          ? " con los filtros actuales"
                          : ""}
                        .
                      </p>
                      {activeFilters.length > 0 && (
                        <button
                          onClick={clearAllFilters}
                          className="text-xs font-semibold text-emerald-600 hover:underline cursor-pointer"
                        >
                          Limpiar filtros
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer de Tabla */}
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500 bg-slate-50/50">
          <span>
            Mostrando <span className="font-semibold text-slate-900">{filtrados.length}</span> de{" "}
            <span className="font-semibold text-slate-900">{sourceData.length}</span> animales
          </span>
          {!isSomeSelected && (
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1 font-semibold text-slate-600 hover:text-slate-900 cursor-pointer transition"
            >
              <FileDown className="size-3.5" /> Exportar tabla
            </button>
          )}
        </div>
      </div>

      {/* Detail Sheet */}
      <Sheet open={detailAnimal !== null} onOpenChange={(o) => { if (!o) setDetailAnimal(null); }}>
        <SheetContent className="sm:max-w-md overflow-y-auto font-sans">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-xl font-semibold text-slate-900">
              {detailAnimal?.sexo === "Macho" ? (
                <Mars className="size-5 text-blue-500" />
              ) : (
                <Venus className="size-5 text-pink-500" />
              )}
              {detailAnimal?.nombre || "Detalle del Animal"}
            </SheetTitle>
            <SheetDescription className="text-xs text-slate-500">
              {detailAnimal?.raza} · Chip: {detailAnimal?.chip}
            </SheetDescription>
          </SheetHeader>

          {detailAnimal && (
            <div className="space-y-6 pt-4 text-slate-900">
              {(detailAnimal.foto || detailAnimal.fotoUrl) && (
                <div className="rounded-xl overflow-hidden border border-slate-200 aspect-[4/3] max-h-56 w-full bg-slate-900/5">
                  <img
                    src={detailAnimal.foto || detailAnimal.fotoUrl}
                    alt={detailAnimal.nombre}
                    className="w-full h-full object-cover object-center"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <p className="text-slate-500">Edad</p>
                  <p className="font-semibold text-slate-900">{edadDesde(detailAnimal.nacimiento)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-500">Peso Actual</p>
                  <p className="font-semibold text-slate-900">{detailAnimal.pesoActual ? formatPeso(detailAnimal.pesoActual) : "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-500">Potrero</p>
                  <p className="font-semibold text-slate-900">{detailAnimal.potrero || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-500">Estado</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${estadoPills[detailAnimal.estado] || ""}`}>
                    {detailAnimal.estado}
                  </span>
                </div>
              </div>

              {/* Genealogía / Linaje */}
              <div className="space-y-2 pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-xs text-slate-700 flex items-center gap-1.5">
                    🧬 Genealogía y Linaje Familiar
                  </p>
                  <button
                    onClick={() => setGenealogiaAnimalId(detailAnimal.id)}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1 cursor-pointer hover:underline"
                  >
                    <Dna className="size-3.5" /> Ver Árbol Completo →
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-500 block text-[11px]">🐮 Vaca Madre</span>
                    {detailAnimal.madreNombre || detailAnimal.madreChip ? (
                      <span className="font-semibold text-slate-900">
                        {detailAnimal.madreNombre || "Sin nombre"} ({detailAnimal.madreChip || "—"})
                      </span>
                    ) : (
                      <span className="text-slate-400 font-normal">Sin registrar</span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">🐂 Toro Padre</span>
                    {detailAnimal.padreNombre || detailAnimal.padreChip ? (
                      <span className="font-semibold text-slate-900">
                        {detailAnimal.padreNombre || "Sin nombre"} ({detailAnimal.padreChip || "—"})
                      </span>
                    ) : (
                      <span className="text-slate-400 font-normal">Sin registrar</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Create/Edit Dialog */}
      <Dialog open={modal !== null} onOpenChange={(open) => { if (!open) setModal(null); }}>
        <DialogContent className="sm:max-w-lg font-sans">
          <DialogHeader>
            <DialogTitle className="font-semibold text-slate-900 text-lg">
              {editId ? "Editar Bovino" : "Nuevo Bovino"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {editId ? "Actualizá la información del animal." : "Registrá un nuevo animal en la base de datos."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="chip" className="text-slate-700 font-medium">Chip *</Label>
                <Input id="chip" value={form.chip} onChange={(e) => setForm({ ...form, chip: e.target.value })} required placeholder="BO-1000" className="h-10" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nombre" className="text-slate-700 font-medium">Nombre *</Label>
                <Input id="nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required placeholder="Ej. Lorenzo" className="h-10" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="raza" className="text-slate-700 font-medium">Raza *</Label>
                <Input id="raza" value={form.raza} onChange={(e) => setForm({ ...form, raza: e.target.value })} required placeholder="Nelore / Brahman" className="h-10" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sexo" className="text-slate-700 font-medium">Sexo *</Label>
                <Select value={form.sexo} onValueChange={(v) => setForm({ ...form, sexo: v })}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Macho">Macho</SelectItem>
                    <SelectItem value="Hembra">Hembra</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nacimiento" className="text-slate-700 font-medium">Nacimiento *</Label>
                <Input id="nacimiento" type="date" value={form.nacimiento} onChange={(e) => setForm({ ...form, nacimiento: e.target.value })} required className="h-10" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="potrero" className="text-slate-700 font-medium">Potrero *</Label>
                <Input id="potrero" value={form.potrero} onChange={(e) => setForm({ ...form, potrero: e.target.value })} required placeholder="Potrero A" className="h-10" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pesoActual" className="text-slate-700 font-medium">Peso Actual (kg) *</Label>
                <Input id="pesoActual" type="number" step="0.1" value={form.pesoActual} onChange={(e) => setForm({ ...form, pesoActual: e.target.value })} required className="h-10" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="estado" className="text-slate-700 font-medium">Estado</Label>
                <Select value={form.estado} onValueChange={(v) => setForm({ ...form, estado: v })}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {estadoOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Selección de Genealogía (Madre y Padre) */}
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label htmlFor="madreId" className="text-slate-700 font-medium">Vaca Madre (Hembra)</Label>
                <select
                  id="madreId"
                  value={form.madreId}
                  onChange={(e) => setForm({ ...form, madreId: e.target.value })}
                  className="w-full h-10 bg-white border border-slate-300 rounded-lg px-3 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="">Sin madre registrada</option>
                  {sourceData
                    .filter((b: any) => ["Hembra", "F", "H"].includes(b.sexo) && b.id !== editId)
                    .map((b: any) => (
                      <option key={b.id} value={b.id}>
                        🐮 {b.nombre || "Sin nombre"} ({b.chip})
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label htmlFor="padreId" className="text-slate-700 font-medium">Toro Padre (Macho)</Label>
                <select
                  id="padreId"
                  value={form.padreId}
                  onChange={(e) => setForm({ ...form, padreId: e.target.value })}
                  className="w-full h-10 bg-white border border-slate-300 rounded-lg px-3 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="">Sin padre registrado</option>
                  {sourceData
                    .filter((b: any) => ["Macho", "M"].includes(b.sexo) && b.id !== editId)
                    .map((b: any) => (
                      <option key={b.id} value={b.id}>
                        🐂 {b.nombre || "Sin nombre"} ({b.chip})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <ImageUploader
              value={form.fotoUrl}
              onChange={(url) => setForm({ ...form, fotoUrl: url })}
              folder="la_estancia/bovinos"
              label="Fotografía del Bovino (Cloudinary)"
            />

            <div className="flex justify-end gap-3 pt-3">
              <button type="button" onClick={() => setModal(null)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">
                Cancelar
              </button>
              <button type="submit" disabled={modalBusy} className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-semibold shadow-sm flex items-center gap-2 cursor-pointer">
                {modalBusy && <Loader2 className="size-4 animate-spin" />}
                {editId ? "Guardar Cambios" : "Crear Bovino"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <DialogContent className="sm:max-w-sm font-sans">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-semibold text-base">Eliminar Registro</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Esta acción eliminará al bovino permanentemente de la base de datos.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-3">
            <button onClick={() => setDeleteId(null)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">
              Cancelar
            </button>
            <button onClick={handleDelete} disabled={deleteMutation.isPending} className="rounded-lg bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-xs font-semibold shadow-sm flex items-center gap-2 cursor-pointer">
              {deleteMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Eliminar
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Estado Dialog */}
      <Dialog open={bulkEstadoOpen} onOpenChange={setBulkEstadoOpen}>
        <DialogContent className="sm:max-w-sm font-sans">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-semibold text-base">Cambio Masivo de Estado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs">
            <Select value={bulkEstado} onValueChange={setBulkEstado}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Seleccionar nuevo estado" /></SelectTrigger>
              <SelectContent>
                {estadoOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <button onClick={() => setBulkEstadoOpen(false)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs">Cancelar</button>
              <button onClick={handleBulkEstado} className="rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold">Aplicar</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Potrero Dialog */}
      <Dialog open={bulkPotreroOpen} onOpenChange={setBulkPotreroOpen}>
        <DialogContent className="sm:max-w-sm font-sans">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-semibold text-base">Mover a Potrero</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs">
            <Input value={bulkPotrero} onChange={(e) => setBulkPotrero(e.target.value)} placeholder="Nombre del potrero" className="h-10" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setBulkPotreroOpen(false)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs">Cancelar</button>
              <button onClick={handleBulkPotrero} className="rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold">Mover</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Modal de Árbol Genealógico Completo */}
      {genealogiaAnimalId && (
        <GenealogiaTreeModal
          bovinoId={genealogiaAnimalId}
          onClose={() => setGenealogiaAnimalId(null)}
        />
      )}
    </div>
  );
}