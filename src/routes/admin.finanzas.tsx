import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  RotateCw,
  Plus,
  Loader2,
  Edit3,
  Trash2,
  X,
  AlertTriangle,
  CheckCircle2,
  Receipt,
  FileDown,
  Calculator,
  PieChart as PieChartIcon,
  FileText,
  Beef,
  Search,
  Check,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useFinanzasResumen, useCreateFinanzas } from "@/hooks/useFinanzas";
import { useCreateGasto, useUpdateGasto, useDeleteGasto, categorias as gastoCategorias } from "@/hooks/useGastos";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/admin/finanzas")({
  validateSearch: (search: Record<string, unknown>) => ({
    action: (search.action as string) || undefined,
  }),
  component: Finanzas,
});

const meses = [
  { value: 1, label: "Enero" }, { value: 2, label: "Febrero" }, { value: 3, label: "Marzo" },
  { value: 4, label: "Abril" }, { value: 5, label: "Mayo" }, { value: 6, label: "Junio" },
  { value: 7, label: "Julio" }, { value: 8, label: "Agosto" }, { value: 9, label: "Septiembre" },
  { value: 10, label: "Octubre" }, { value: 11, label: "Noviembre" }, { value: 12, label: "Diciembre" },
];

const hoy = new Date();
const gastoFormDefault = {
  lote: "", mes: (hoy.getMonth() + 1).toString(), anio: hoy.getFullYear().toString(),
  categoria: "remedios", descripcion: "", monto: "",
};

const formatBs = (val?: number | null) => {
  const n = typeof val === "number" && !isNaN(val) ? val : 0;
  return `Bs. ${n.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

function Finanzas() {
  const searchParams = Route.useSearch();
  const [mesSel, setMesSel] = useState(hoy.getMonth() + 1);
  const [anioSel, setAnioSel] = useState(hoy.getFullYear());
  const [activeTab, setActiveTab] = useState<"resumen" | "pl" | "diario">("resumen");

  const [gastoModal, setGastoModal] = useState<"create" | "edit" | null>(searchParams.action === "new" ? "create" : null);
  const [gastoEditId, setGastoEditId] = useState<string | null>(null);
  const [gastoForm, setGastoForm] = useState(gastoFormDefault);
  const [gastoDeleteId, setGastoDeleteId] = useState<string | null>(null);

  const [ingresoModal, setIngresoModal] = useState(false);
  const todayStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
  const [ingresoForm, setIngresoForm] = useState({ lote: "", mes: (hoy.getMonth() + 1).toString(), anio: hoy.getFullYear().toString(), fecha: todayStr, monto: "" });

  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [diarioSearch, setDiarioSearch] = useState("");
  const [diarioFiltroTipo, setDiarioFiltroTipo] = useState<"todos" | "ingreso" | "gasto">("todos");

  useEffect(() => {
    if (searchParams.action === "new") { setGastoForm(gastoFormDefault); setGastoEditId(null); setGastoModal("create"); }
  }, [searchParams.action]);

  const { data, isLoading, isError, refetch } = useFinanzasResumen(mesSel, anioSel);
  const createGasto = useCreateGasto();
  const updateGasto = useUpdateGasto();
  const deleteGasto = useDeleteGasto();
  const createFinanzas = useCreateFinanzas();

  useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); }
  }, [toast]);

  const showToast = (type: "success" | "error", msg: string) => setToast({ type, msg });

  const gastosPorCategoria = useMemo(() => {
    if (!data?.porCategoria?.length) return [];
    return gastoCategorias.map((cat) => {
      const found = data.porCategoria.find((d: any) => d.categoria === cat.value);
      return { ...cat, total: found?.total || 0 };
    }).filter((c) => c.total > 0);
  }, [data]);

  const pieData = gastosPorCategoria.map((c) => ({
    name: c.label.replace(/^[^\s]+\s*/, ""), value: c.total, color: c.color,
  }));
  const hasPieData = pieData.length > 0;
  const totalGastos = pieData.reduce((s, c) => s + c.value, 0);

  const ultimosMovimientos = useMemo(() => {
    if (!data?.ultimosRegistros) return [];
    return data.ultimosRegistros.filter((r: any) => {
      if (diarioFiltroTipo !== "todos" && r.tipo !== diarioFiltroTipo) return false;
      if (diarioSearch) {
        const queryStr = `${r.lote || ""} ${r.categoria || ""} ${r.descripcion || ""}`.toLowerCase();
        if (!queryStr.includes(diarioSearch.toLowerCase())) return false;
      }
      return true;
    });
  }, [data, diarioFiltroTipo, diarioSearch]);

  const openGastoCreate = () => {
    setGastoForm({ ...gastoFormDefault, mes: mesSel.toString(), anio: anioSel.toString() });
    setGastoEditId(null); setGastoModal("create");
  };

  const openGastoEdit = (g: any) => {
    setGastoForm({
      lote: g.lote || "", mes: (g.mes || hoy.getMonth() + 1).toString(),
      anio: (g.anio || hoy.getFullYear()).toString(), categoria: g.categoria || "remedios",
      descripcion: g.descripcion || "", monto: g.monto?.toString() || "0",
    });
    setGastoEditId(g.id); setGastoModal("edit");
  };

  const openIngresoCreate = () => {
    setIngresoForm({ lote: "", mes: mesSel.toString(), anio: anioSel.toString(), fecha: todayStr, monto: "" });
    setIngresoModal(true);
  };

  const handleIngresoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const monto = parseFloat(ingresoForm.monto) || 0;
    if (monto <= 0) { showToast("error", "El monto debe ser mayor a 0"); return; }
    if (!ingresoForm.lote.trim()) { showToast("error", "Indicá el origen del ingreso"); return; }
    try {
      await createFinanzas.mutateAsync({
        lote: ingresoForm.lote,
        mes: parseInt(ingresoForm.mes),
        anio: parseInt(ingresoForm.anio),
        ingresos: monto,
        egresos: 0,
      });
      setIngresoModal(false); refetch();
      showToast("success", "Ingreso registrado exitosamente");
    } catch (err: any) {
      showToast("error", err?.message || "Error al guardar ingreso");
    }
  };

  const handleGastoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      lote: gastoForm.lote, mes: parseInt(gastoForm.mes), anio: parseInt(gastoForm.anio),
      categoria: gastoForm.categoria, descripcion: gastoForm.descripcion || undefined,
      monto: parseFloat(gastoForm.monto) || 0,
    };
    if (payload.monto <= 0) { showToast("error", "El monto debe ser mayor a 0"); return; }
    try {
      if (gastoEditId) await updateGasto.mutateAsync({ id: gastoEditId, data: payload });
      else await createGasto.mutateAsync(payload);
      setGastoModal(null); refetch();
      showToast("success", gastoEditId ? "Gasto actualizado" : "Gasto registrado");
    } catch (err: any) {
      showToast("error", err?.message || "Error al guardar gasto");
    }
  };

  const handleGastoDelete = async () => {
    if (!gastoDeleteId) return;
    try {
      await deleteGasto.mutateAsync(gastoDeleteId);
      setGastoDeleteId(null); refetch();
      showToast("success", "Gasto eliminado");
    } catch { showToast("error", "Error al eliminar"); }
  };

  const handleExportCSV = () => {
    if (!data?.ultimosRegistros?.length) {
      showToast("error", "No hay datos para exportar en este periodo");
      return;
    }
    const rows = [
      ["Tipo", "Fecha", "Lote / Origen", "Categoria", "Descripcion", "Monto (Bs)"],
      ...data.ultimosRegistros.map((r: any) => [
        r.tipo,
        r.createdAt ? new Date(r.createdAt).toISOString().split("T")[0] : "",
        `"${r.lote || ""}"`,
        `"${r.categoria || ""}"`,
        `"${r.descripcion || ""}"`,
        r.monto,
      ]),
    ];
    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Reporte_Contable_Guayabal_${meses[mesSel - 1]?.label}_${anioSel}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("success", "Reporte contable exportado a CSV");
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-full min-w-0 overflow-x-hidden p-4 sm:p-6 md:p-8 space-y-6 font-sans text-slate-900">
        <div className="space-y-2"><div className="animate-pulse rounded-lg bg-slate-200/60 h-8 w-48" /><div className="animate-pulse rounded-lg bg-slate-200/60 h-4 w-64" /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{[1, 2, 3, 4].map((i) => <div key={i} className="animate-pulse rounded-2xl bg-slate-200/60 h-28" />)}</div>
        <div className="animate-pulse rounded-2xl bg-slate-200/60 h-72" />
      </div>
    );
  }

  const r: any = data?.resumen ?? {};

  return (
    <div className="w-full max-w-full min-w-0 overflow-x-hidden p-4 sm:p-6 md:p-8 space-y-6 font-sans text-slate-900 antialiased">
      {/* Toast Feedback */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm text-white animate-fade-up ${
          toast.type === "success" ? "bg-emerald-600" : "bg-rose-600"
        }`}>
          {toast.type === "success" ? <CheckCircle2 className="size-4" /> : <AlertTriangle className="size-4" />}
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100 cursor-pointer"><X className="size-3.5" /></button>
        </div>
      )}

      {/* Header Responsivo Adaptable */}
      <div className="flex flex-wrap items-center justify-between gap-3 w-full max-w-full min-w-0">
        <div className="min-w-0">
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Finanzas & Contabilidad Ganadera</h1>
          <p className="text-slate-500 text-xs sm:text-sm truncate">
            {data?.moneda || "Bs."} · Control de ingresos, egresos operativos y costo por animal
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 shrink-0">
            <select value={mesSel} onChange={(e) => setMesSel(parseInt(e.target.value))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-semibold shadow-xs">
              {meses.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <input type="number" value={anioSel} onChange={(e) => setAnioSel(parseInt(e.target.value) || hoy.getFullYear())} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-semibold w-20 text-center shadow-xs" min={2020} />
          </div>
          <button onClick={() => refetch()} className="grid size-9 place-items-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer shadow-xs" title="Actualizar">
            <RotateCw className="size-4" />
          </button>
          <button onClick={handleExportCSV} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 cursor-pointer shadow-xs" title="Exportar CSV">
            <FileDown className="size-4 text-emerald-600" /> Exportar CSV
          </button>
          <button onClick={openGastoCreate} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-2 text-xs sm:text-sm font-semibold text-white cursor-pointer shadow-xs transition">
            <Plus className="size-4" /> Nuevo gasto
          </button>
          <button onClick={openIngresoCreate} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs sm:text-sm font-semibold text-white cursor-pointer shadow-xs transition">
            <Plus className="size-4" /> Nuevo ingreso
          </button>
        </div>
      </div>

      {isError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 flex items-center gap-2">
          <AlertTriangle className="size-4" /> Error al cargar datos financieros. <button onClick={() => refetch()} className="underline ml-1 cursor-pointer">Reintentar</button>
        </div>
      )}

      {!isError && (
        <>
          {/* GRID DE 4 KPIS CONTABLES CPA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-full min-w-0">
            {/* Ingresos */}
            <div className="w-full max-w-full min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                  <TrendingUp className="size-4 text-emerald-600" /> Ingresos Totales
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                  Ventas
                </span>
              </div>
              <div className="font-display text-2xl sm:text-3xl font-bold text-emerald-600 truncate">{formatBs(r.ingresos)}</div>
              <div className="text-[11px] text-slate-400 mt-1.5">Entradas brutas del mes</div>
            </div>

            {/* Egresos / Gastos */}
            <div className="w-full max-w-full min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                  <TrendingDown className="size-4 text-rose-500" /> Costos & Egresos
                </span>
                <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200">
                  {r.total_registros} mov.
                </span>
              </div>
              <div className="font-display text-2xl sm:text-3xl font-bold text-rose-600 truncate">{formatBs(r.egresos)}</div>
              <div className="text-[11px] text-slate-400 mt-1.5">Sanidad, alimento y estructura</div>
            </div>

            {/* Margen Net / Balance */}
            <div className="w-full max-w-full min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                  <DollarSign className={`size-4 ${r.margen >= 0 ? "text-emerald-600" : "text-rose-500"}`} /> Utilidad Neta
                </span>
                {r.utilidadPorcentaje !== undefined && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    r.margen >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                  }`}>
                    {r.utilidadPorcentaje.toFixed(1)}% Margen
                  </span>
                )}
              </div>
              <div className={`font-display text-2xl sm:text-3xl font-bold truncate ${r.margen >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {formatBs(r.margen)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1.5">
                {r.margen >= 0 ? "Balance positivo de operación" : "Déficit en el periodo"}
              </div>
            </div>

            {/* Costo Operativo por Cabeza (KPI Contable Ganadero) */}
            <div className="w-full max-w-full min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                  <Beef className="size-4 text-purple-600" /> Costo / Animal
                </span>
                <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-200">
                  {r.totalBovinos || 0} cabezas
                </span>
              </div>
              <div className="font-display text-2xl sm:text-3xl font-bold text-purple-700 truncate">
                {formatBs(r.costoPorCabeza || 0)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1.5">Costo mensual por cada animal</div>
            </div>
          </div>

          {/* TAB BAR NAVEGABLE */}
          <div className="flex border-b border-slate-200 gap-2">
            <button
              onClick={() => setActiveTab("resumen")}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition cursor-pointer ${
                activeTab === "resumen"
                  ? "border-emerald-600 text-emerald-600"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <PieChartIcon className="size-4" /> Cuadro de Mandos & Categorías
            </button>

            <button
              onClick={() => setActiveTab("pl")}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition cursor-pointer ${
                activeTab === "pl"
                  ? "border-emerald-600 text-emerald-600"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <Calculator className="size-4" /> Estado de Resultados (P&L Ganadero)
            </button>

            <button
              onClick={() => setActiveTab("diario")}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition cursor-pointer ${
                activeTab === "diario"
                  ? "border-emerald-600 text-emerald-600"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <FileText className="size-4" /> Libro Diario de Movimientos ({data?.ultimosRegistros?.length || 0})
            </button>
          </div>

          {/* PESTAÑA 1: RESUMEN Y GRÁFICOS */}
          {activeTab === "resumen" && (
            <div className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2 w-full max-w-full min-w-0">
                {/* Card Gastos Por Categoría */}
                <div className="w-full max-w-full min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between">
                  <div>
                    <h2 className="font-display text-lg font-bold text-slate-900 mb-4">Gastos por categoría</h2>
                    
                    {!hasPieData ? (
                      <div className="flex flex-col items-center justify-center py-10 px-4 text-center space-y-3">
                        <div className="p-3.5 rounded-2xl bg-slate-100 text-slate-400 border border-slate-200/60">
                          <Receipt className="size-8" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-slate-800">No hay gastos registrados este mes</p>
                          <p className="text-xs text-slate-500 max-w-xs mx-auto">Seleccioná otro periodo o añadí un nuevo egreso operativo.</p>
                        </div>
                        <button onClick={openGastoCreate} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-xs transition cursor-pointer">
                          <Plus className="size-4" /> Registrar gasto
                        </button>
                      </div>
                    ) : (
                      <>
                        <ResponsiveContainer width="100%" height={180}>
                          <PieChart>
                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={80} paddingAngle={3} dataKey="value">
                              {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                            </Pie>
                            <Tooltip formatter={(v: number) => formatBs(v)} />
                          </PieChart>
                        </ResponsiveContainer>

                        <div className="space-y-2 mt-3 pt-3 border-t border-slate-100">
                          {gastosPorCategoria.map((c) => {
                            const pct = totalGastos > 0 ? ((c.total / totalGastos) * 100).toFixed(1) : "0.0";
                            return (
                              <div key={c.value} className="flex items-center justify-between text-xs py-1">
                                <span className="flex items-center gap-2 truncate pr-2">
                                  <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                                  <span className="font-medium text-slate-800 truncate">{c.label}</span>
                                </span>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="font-semibold text-slate-900">{formatBs(c.total)}</span>
                                  <span className="text-[11px] font-semibold text-slate-400 w-12 text-right">({pct}%)</span>
                                </div>
                              </div>
                            );
                          })}

                          <div className="pt-3 mt-2 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-slate-900">
                            <span>Total Egresos</span>
                            <span>{formatBs(totalGastos)}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Card Últimos Registros */}
                <div className="w-full max-w-full min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between">
                  <div>
                    <h2 className="font-display text-lg font-bold text-slate-900 mb-4">Últimos movimientos</h2>
                    {!data?.ultimosRegistros?.length ? (
                      <div className="flex flex-col items-center justify-center py-10 px-4 text-center space-y-2">
                        <p className="text-xs text-slate-500 font-medium">Sin movimientos registrados en este periodo.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {data.ultimosRegistros.slice(0, 7).map((r: any, i: number) => {
                          const isIngreso = r.tipo === "ingreso";
                          const cat = isIngreso ? null : gastoCategorias.find((c) => c.value === r.categoria);
                          return (
                            <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0 text-xs">
                              <div className="min-w-0 flex-1 pr-2">
                                <div className="flex items-center gap-2">
                                  <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: isIngreso ? "#059669" : cat?.color || "#64748b" }} />
                                  <span className="font-bold text-slate-900 truncate">{isIngreso ? "Ingreso Venta" : (cat?.label || r.categoria)}</span>
                                </div>
                                <div className="text-[11px] text-slate-500 truncate mt-0.5">
                                  {isIngreso ? r.lote : (r.descripcion || "Gasto operativo")} · {r.lote || "General"}
                                </div>
                              </div>
                              <div className="text-right shrink-0 flex items-center gap-2">
                                <div>
                                  <div className={`font-bold ${isIngreso ? "text-emerald-600" : "text-rose-600"}`}>
                                    {isIngreso ? "+" : ""}{formatBs(r.monto)}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {r.createdAt ? new Date(r.createdAt).toLocaleDateString("es-BO", { day: "numeric", month: "short" }) : ""}
                                  </div>
                                </div>
                                {!isIngreso && (
                                  <button onClick={() => setGastoDeleteId(r.id || r._id)} className="text-slate-400 hover:text-rose-600 cursor-pointer p-1">
                                    <Trash2 className="size-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Insights Automáticos */}
              {data?.insights?.length ? (
                <div className="w-full max-w-full min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-2">
                  <h2 className="font-display text-xs font-bold uppercase tracking-wider text-slate-500">Insights & Recomendaciones del Contador</h2>
                  <div className="flex flex-wrap gap-2">
                    {data.insights.map((ins: any, i: number) => (
                      <span key={i} className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold border ${
                        ins.trend.includes("↑") || ins.trend.includes("🔴") || ins.trend.includes("⚠️")
                          ? "bg-rose-50 border-rose-200 text-rose-700"
                          : ins.trend.includes("↓") || ins.trend.includes("✅")
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                          : "bg-slate-50 border-slate-200 text-slate-700"
                      }`}>
                        {ins.trend}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* PESTAÑA 2: ESTADO DE RESULTADOS (P&L GANADERO) */}
          {activeTab === "pl" && (
            <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <h2 className="font-display text-xl font-bold text-slate-900">Estado de Resultados Ganadero (P&L)</h2>
                  <p className="text-xs text-slate-500">
                    Periodo: {meses[mesSel - 1]?.label} {anioSel} · Hacienda Guayabal
                  </p>
                </div>
                <button onClick={handleExportCSV} className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700">
                  <FileDown className="size-4" /> Exportar P&L (.CSV)
                </button>
              </div>

              <div className="space-y-4 text-xs">
                {/* 1. INGRESOS OPERATIVOS */}
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2">
                  <div className="flex items-center justify-between font-bold text-sm text-emerald-900">
                    <span className="flex items-center gap-2">
                      <TrendingUp className="size-4 text-emerald-600" />
                      (+) INGRESOS OPERATIVOS BRUTOS
                    </span>
                    <span>{formatBs(r.ingresos)}</span>
                  </div>
                  <div className="text-[11px] text-emerald-800/80">
                    Ventas de ganado en pie, reproductores, leche y subproductos.
                  </div>
                </div>

                {/* 2. COSTOS DIRECTOS DE PRODUCCIÓN */}
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
                  <div className="flex items-center justify-between font-bold text-sm text-amber-900">
                    <span className="flex items-center gap-2">
                      <Receipt className="size-4 text-amber-600" />
                      (-) COSTOS DIRECTOS DE PRODUCCIÓN (SANIDAD & NUTRICIÓN)
                    </span>
                    <span>{formatBs(r.gastosDirectos || 0)}</span>
                  </div>
                  <div className="text-[11px] text-amber-800/80">
                    Medicinas veterinarias, vacunas, sales minerales, alimento y genética IATF.
                  </div>
                </div>

                {/* 3. GASTOS DE ESTRUCTURA Y MANTENIMIENTO */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                  <div className="flex items-center justify-between font-bold text-sm text-slate-900">
                    <span className="flex items-center gap-2">
                      <TrendingDown className="size-4 text-slate-600" />
                      (-) GASTOS DE ESTRUCTURA, PERSONAL Y FLETES
                    </span>
                    <span>{formatBs(r.gastosEstructura || 0)}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Salarios de vaqueros, capataces, mantenimiento de potreros, cercas, fletes y servicios.
                  </div>
                </div>

                {/* RESULTADO NETO (MARGEN) */}
                <div className={`rounded-xl border p-5 flex items-center justify-between text-base font-bold ${
                  r.margen >= 0 ? "border-emerald-500 bg-emerald-600 text-white" : "border-rose-500 bg-rose-600 text-white"
                }`}>
                  <div>
                    <span>(=) UTILIDAD NETA DEL PERIODO</span>
                    <span className="block text-xs font-normal opacity-90">
                      {r.margen >= 0 ? "Ganancia operativamente consolidada" : "Pérdida en el periodo contable"}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-display">{formatBs(r.margen)}</span>
                    {r.utilidadPorcentaje !== undefined && (
                      <span className="block text-xs font-semibold">{r.utilidadPorcentaje.toFixed(1)}% Margen Operativo</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PESTAÑA 3: LIBRO DIARIO DE MOVIMIENTOS */}
          {activeTab === "diario" && (
            <div className="w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                  <input
                    value={diarioSearch}
                    onChange={(e) => setDiarioSearch(e.target.value)}
                    placeholder="Buscar movimiento por descripción, lote..."
                    className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500">Filtrar:</span>
                  <select
                    value={diarioFiltroTipo}
                    onChange={(e) => setDiarioFiltroTipo(e.target.value as any)}
                    className="rounded-xl border border-slate-200 px-3 py-2 bg-white text-xs font-semibold"
                  >
                    <option value="todos">Todos los movimientos</option>
                    <option value="ingreso">Solo Ingresos (+)</option>
                    <option value="gasto">Solo Egresos (-)</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Categoría / Origen</th>
                      <th className="px-4 py-3">Descripción</th>
                      <th className="px-4 py-3 text-right">Monto</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {ultimosMovimientos.map((m: any, idx: number) => {
                      const isIngreso = m.tipo === "ingreso";
                      const cat = isIngreso ? null : gastoCategorias.find((c) => c.value === m.categoria);
                      return (
                        <tr key={idx} className="hover:bg-slate-50 transition">
                          <td className="px-4 py-3 font-semibold">
                            {isIngreso ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px]">
                                🟢 Ingreso
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px]">
                                🔴 Egreso
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {m.createdAt ? new Date(m.createdAt).toLocaleDateString("es-BO") : "—"}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-800">
                            {isIngreso ? `Venta Lote ${m.lote}` : (cat?.label || m.categoria)}
                          </td>
                          <td className="px-4 py-3 text-slate-600 max-w-[250px] truncate">
                            {m.descripcion || m.lote || "—"}
                          </td>
                          <td className={`px-4 py-3 text-right font-bold ${isIngreso ? "text-emerald-600" : "text-rose-600"}`}>
                            {isIngreso ? "+" : ""}{formatBs(m.monto)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {!isIngreso && (
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={() => openGastoEdit(m)} className="p-1 hover:bg-slate-100 rounded-md text-slate-500 hover:text-slate-900 cursor-pointer" title="Editar">
                                  <Edit3 className="size-3.5" />
                                </button>
                                <button onClick={() => setGastoDeleteId(m.id || m._id)} className="p-1 hover:bg-rose-50 rounded-md text-slate-500 hover:text-rose-600 cursor-pointer" title="Eliminar">
                                  <Trash2 className="size-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {ultimosMovimientos.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                          No se encontraron movimientos financieros con los filtros seleccionados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal Nuevo / Editar Gasto */}
      <Dialog open={gastoModal !== null} onOpenChange={(o) => { if (!o) setGastoModal(null); }}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">{gastoEditId ? "Editar gasto" : "Nuevo gasto"}</DialogTitle>
            <DialogDescription className="text-xs">{gastoEditId ? "Actualizá los datos del gasto." : "Registrá un gasto detallado por categoría."}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleGastoSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 col-span-2">
                <Label>Categoría de Gasto *</Label>
                <Select value={gastoForm.categoria} onValueChange={(v) => setGastoForm({ ...gastoForm, categoria: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {gastoCategorias.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Lote / Secciones</Label>
                <Input value={gastoForm.lote} onChange={(e) => setGastoForm({ ...gastoForm, lote: e.target.value })} placeholder="Ej. Potrero 4 / General" className="h-9" />
              </div>

              <div className="space-y-1">
                <Label>Monto (Bs.) *</Label>
                <Input type="number" step="0.01" value={gastoForm.monto} onChange={(e) => setGastoForm({ ...gastoForm, monto: e.target.value })} required placeholder="0.00" className="h-9" />
              </div>

              <div className="space-y-1 col-span-2">
                <Label>Descripción / Observación</Label>
                <Textarea value={gastoForm.descripcion} onChange={(e) => setGastoForm({ ...gastoForm, descripcion: e.target.value })} placeholder="Detalles de la compra, factura o insumos..." className="h-20 resize-none text-xs" />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setGastoModal(null)} className="rounded-xl border border-slate-200 px-4 py-2 hover:bg-slate-50 cursor-pointer">Cancelar</button>
              <button type="submit" disabled={createGasto.isPending || updateGasto.isPending} className="rounded-xl bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer">
                {(createGasto.isPending || updateGasto.isPending) && <Loader2 className="size-3.5 animate-spin" />}
                {gastoEditId ? "Guardar cambios" : "Registrar gasto"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Nuevo Ingreso */}
      <Dialog open={ingresoModal} onOpenChange={setIngresoModal}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Nuevo ingreso</DialogTitle>
            <DialogDescription className="text-xs">Registrá una entrada de dinero por venta de ganado o leche.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleIngresoSubmit} className="space-y-4 text-xs">
            <div className="space-y-1">
              <Label>Origen / Lote de Venta *</Label>
              <Input value={ingresoForm.lote} onChange={(e) => setIngresoForm({ ...ingresoForm, lote: e.target.value })} required placeholder="Ej. Venta Toros Lote A / Venta Leche" className="h-9" />
            </div>

            <div className="space-y-1">
              <Label>Monto (Bs.) *</Label>
              <Input type="number" step="0.01" value={ingresoForm.monto} onChange={(e) => setIngresoForm({ ...ingresoForm, monto: e.target.value })} required placeholder="0.00" className="h-9" />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setIngresoModal(false)} className="rounded-xl border border-slate-200 px-4 py-2 hover:bg-slate-50 cursor-pointer">Cancelar</button>
              <button type="submit" disabled={createFinanzas.isPending} className="rounded-xl bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 flex items-center gap-1.5 cursor-pointer">
                {createFinanzas.isPending && <Loader2 className="size-3.5 animate-spin" />}
                Registrar ingreso
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Eliminar Gasto */}
      <Dialog open={gastoDeleteId !== null} onOpenChange={(o) => { if (!o) setGastoDeleteId(null); }}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Eliminar gasto</DialogTitle>
            <DialogDescription className="text-xs">¿Confirmás eliminar este registro de gasto?</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setGastoDeleteId(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs hover:bg-slate-50 cursor-pointer">Cancelar</button>
            <button onClick={handleGastoDelete} disabled={deleteGasto.isPending} className="rounded-xl bg-rose-600 px-4 py-2 text-xs text-white hover:bg-rose-700 flex items-center gap-1.5 cursor-pointer">
              {deleteGasto.isPending && <Loader2 className="size-3.5 animate-spin" />}
              Eliminar
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
