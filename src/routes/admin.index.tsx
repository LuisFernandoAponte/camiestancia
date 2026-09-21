import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  useDashboardKPIs,
  useDashboardGraficos,
  useTareasProximas,
  usePartosProximos,
  useGastosResumen,
} from "@/hooks/useDashboard";
import { useAlertasConsultor } from "@/hooks/useConsultor";
import {
  Beef,
  TrendingUp,
  Stethoscope,
  Heart,
  Loader2,
  DollarSign,
  Baby,
  Syringe,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Plus,
  Calendar,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  PieChart as PieChartIcon,
} from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { SectionControlBanner, useSectionVisibility } from "@/components/ui/SectionControlBanner";

const DASHBOARD_SECTIONS = [
  { id: "kpi_cards", label: "KPIs Principales", defaultVisible: true },
  { id: "consultor_banner", label: "Alertas Consultor IA", defaultVisible: true },
  { id: "financial_charts", label: "Gráficos Financieros", defaultVisible: true },
  { id: "health_repro", label: "Sanidad & Partos", defaultVisible: true },
];

const CATEGORIAS_META: Record<string, { label: string; color: string }> = {
  remedios: { label: "Remedios y veterinaria", color: "#10b981" },
  trabajador: { label: "Personal y mano de obra", color: "#3b82f6" },
  alimentacion: { label: "Alimentación y suplementos", color: "#f59e0b" },
  mantenimiento: { label: "Mantenimiento e infraestructura", color: "#f97316" },
  transporte: { label: "Transporte y fletes", color: "#8b5cf6" },
  otros: { label: "Otros gastos", color: "#64748b" },
};

export const Route = createFileRoute("/admin/")({
  component: Dashboard,
});

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-200/60 ${className ?? ""}`} />;
}

function Dashboard() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  const { data: kpis, isLoading: kpisLoading } = useDashboardKPIs();
  const { data: graficos, isLoading: graficosLoading } = useDashboardGraficos();
  const { data: tareas, isLoading: tareasLoading } = useTareasProximas();
  const { data: partos, isLoading: partosLoading } = usePartosProximos();
  const { data: gastosResumen, isLoading: gastosLoading } = useGastosResumen();
  const { data: alertasConsultor } = useAlertasConsultor();
  const { visibility, toggleSection, resetSections, isVisible } = useSectionVisibility("dashboard", DASHBOARD_SECTIONS);

  if (kpisLoading) {
    return (
      <div className="min-h-screen bg-slate-50/50 p-6 md:p-8 space-y-6">
        <div className="space-y-2">
          <SkeletonBlock className="h-8 w-64" />
          <SkeletonBlock className="h-4 w-48" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <SkeletonBlock className="lg:col-span-2 h-88" />
          <SkeletonBlock className="h-88" />
        </div>
      </div>
    );
  }

  const b = kpis?.bovinos;
  const s = kpis?.salud;
  const r = kpis?.reproduccion;
  const f = kpis?.finanzas;

  const totalBovinos = b?.total ?? 0;
  const disponibles = b?.disponibles ?? 0;
  const preñadas = b?.preñadas ?? 0;
  const hembras = b?.hembras ?? 0;
  const machos = b?.machos ?? 0;
  const tasaPreñez = b?.tasaPreñez ?? 0;
  const pctDisponibles = b?.pctDisponibles ?? 0;
  const pendientes = s?.pendientes ?? 0;
  const prox7d = s?.proximas7d ?? 0;
  const inseminacionesActivas = r?.inseminacionesActivas ?? 0;
  const partosProximos = r?.partosProximos ?? 0;
  const { ingresosMes = 0, egresosMes = 0, margenMes = 0 } = f ?? {};

  const chartData = graficos?.serie ?? [];
  const tareasList = tareas ?? [];
  const partosList = partos ?? [];
  const alertas = alertasConsultor || [];

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: "#ffffff",
      border: "1px solid #e2e8f0",
      borderRadius: 12,
      fontSize: 12,
      fontWeight: 500,
      boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.08)",
      padding: "10px 14px",
    },
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-8 space-y-6 max-w-7xl mx-auto font-sans text-slate-900 antialiased">
      {/* Top Header & Action Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
              Panel de Control Operativo
            </h1>
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200/60">
              En Vivo
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
            <Calendar className="size-3.5 text-slate-400" />
            <span>
              {hydrated
                ? new Date().toLocaleDateString("es-BO", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "Cargando fecha..."}
            </span>
          </p>
        </div>

        {/* Quick Actions Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/admin/inventario"
            search={{ action: "new" }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all duration-150 active:scale-[0.98]"
          >
            <Plus className="size-4" />
            <span>Nuevo Bovino</span>
          </Link>

          <Link
            to="/admin/salud"
            search={{ action: "new" }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 shadow-sm transition-all duration-150"
          >
            <Syringe className="size-3.5 text-sky-500" />
            <span>Evento Salud</span>
          </Link>

          <Link
            to="/admin/finanzas"
            search={{ action: "new" }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 shadow-sm transition-all duration-150"
          >
            <DollarSign className="size-3.5 text-amber-500" />
            <span>Nuevo Gasto</span>
          </Link>
        </div>
      </div>

      {/* Banner de Control de Visibilidad de Secciones UI 2026 */}
      <SectionControlBanner
        pageKey="dashboard"
        sections={DASHBOARD_SECTIONS}
        visibility={visibility}
        onToggle={toggleSection}
        onReset={resetSections}
        title="Personalización de Vista Dashboard 2026"
        description="Ocultá o mostrá las secciones del panel administrativo según tu flujo de trabajo."
      />

      {/* Consultor IA Banner (Alerta Inteligente Sugerida) */}
      {isVisible("consultor_banner") && alertas.length > 0 && (
        <div className="rounded-2xl border border-amber-200/70 bg-gradient-to-r from-amber-50/90 via-orange-50/50 to-amber-50/30 p-5 shadow-sm relative overflow-hidden transition hover:border-amber-300">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 shrink-0 border border-amber-500/20">
                <Sparkles className="size-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm text-slate-900">
                    Consultor Ganadero IA: {alertas.length} recomendación{alertas.length > 1 ? "es" : ""} activa
                  </h3>
                  <span className="inline-flex items-center rounded-full bg-amber-100/80 px-2.5 py-0.5 text-[11px] font-medium text-amber-800 border border-amber-200">
                    Sugerencia Operativa
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                  {alertas[0]?.mensaje_alerta} —{" "}
                  <span className="font-semibold text-slate-900">{alertas[0]?.recomendacion}</span>
                </p>
              </div>
            </div>

            <Link
              to="/admin/consultor"
              className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-900 shrink-0 self-center transition hover:underline"
            >
              <span>Ver todas</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* KPI Cards Grid (4 Columnas) */}
      {isVisible("kpi_cards") && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Bovinos */}
        <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700">
              <Beef className="size-5" />
            </div>
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200/60">
              {pctDisponibles}% disp.
            </span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-semibold tracking-tight text-slate-900">{totalBovinos}</div>
            <div className="text-xs font-medium text-slate-500 mt-1">Cabezas Totales</div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-4 pt-3 border-t border-slate-100">
            <span className="font-medium text-slate-700">{hembras}</span> hembras ·{" "}
            <span className="font-medium text-slate-700">{machos}</span> machos
          </div>
        </div>

        {/* Disponibles para Venta */}
        <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <TrendingUp className="size-5" />
            </div>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              En Potrero
            </span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-semibold tracking-tight text-slate-900">{disponibles}</div>
            <div className="text-xs font-medium text-slate-500 mt-1">Disponibles para Venta</div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-4 pt-3 border-t border-slate-100">
            <span>{totalBovinos > 0 ? `${disponibles} de ${totalBovinos} cabezas activas` : "Sin datos registrados"}</span>
          </div>
        </div>

        {/* Hembras en Gestación */}
        <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
              <Heart className="size-5" />
            </div>
            <span className="inline-flex items-center rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700 border border-purple-200/60">
              {tasaPreñez}% preñez
            </span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-semibold tracking-tight text-slate-900">{preñadas}</div>
            <div className="text-xs font-medium text-slate-500 mt-1">Hembras en Gestación</div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-4 pt-3 border-t border-slate-100">
            <span>{inseminacionesActivas} IATF · {partosProximos} partos</span>
          </div>
        </div>

        {/* Pendientes Sanitarios */}
        <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600">
              <Stethoscope className="size-5" />
            </div>
            {prox7d > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700 border border-rose-200/60">
                <ShieldAlert className="size-3" />
                {prox7d} urgentes
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200/60">
                Al día
              </span>
            )}
          </div>
          <div className="mt-4">
            <div className="text-3xl font-semibold tracking-tight text-slate-900">{pendientes}</div>
            <div className="text-xs font-medium text-slate-500 mt-1">Eventos Sanitarios Pendientes</div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-4 pt-3 border-t border-slate-100">
            <span>{prox7d} programados a 7 días</span>
          </div>
        </div>
      </div>
      )}

      {/* Main Charts & Financial Overview Grid */}
      {isVisible("financial_charts") && (
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Financial Curve Area Chart (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Evolución Financiera</h2>
              <p className="text-xs text-slate-500 mt-0.5">Ingresos vs Egresos mensuales consolidados</p>
            </div>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              {chartData.length} meses
            </span>
          </div>

          {graficosLoading ? (
            <div className="flex items-center justify-center h-[280px] text-slate-400">
              <Loader2 className="size-6 animate-spin" />
            </div>
          ) : chartData.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-16">Sin registros financieros para graficar.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorEgresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="mes" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip {...tooltipStyle} formatter={(value: number) => `$${value.toLocaleString("es-BO")}`} />
                <Area
                  type="monotone"
                  dataKey="ingresos"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorIngresos)"
                  name="Ingresos"
                />
                <Area
                  type="monotone"
                  dataKey="egresos"
                  stroke="#ef4444"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorEgresos)"
                  name="Egresos"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Resumen Financiero del Mes (Panel Agrupado Estilo Linear) */}
        <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-slate-900">Balance del Mes</h2>
              <span className="text-xs font-medium text-slate-500 capitalize">
                {new Date().toLocaleDateString("es-BO", { month: "long" })}
              </span>
            </div>

            <div className="space-y-3 divide-y divide-slate-100">
              {/* Ingresos */}
              <div className="pt-1 flex items-center justify-between p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/50">
                <div>
                  <div className="text-xs font-medium text-emerald-800 flex items-center gap-1">
                    <ArrowUpRight className="size-3.5 text-emerald-600" />
                    <span>Ingresos del Mes</span>
                  </div>
                  <div className="text-2xl font-semibold tracking-tight text-emerald-700 mt-0.5">
                    ${ingresosMes.toLocaleString("es-BO")}
                  </div>
                </div>
              </div>

              {/* Egresos */}
              <div className="pt-3 flex items-center justify-between p-3.5 rounded-xl bg-rose-50/60 border border-rose-200/50">
                <div>
                  <div className="text-xs font-medium text-rose-800 flex items-center gap-1">
                    <ArrowDownRight className="size-3.5 text-rose-600" />
                    <span>Egresos del Mes</span>
                  </div>
                  <div className="text-2xl font-semibold tracking-tight text-rose-700 mt-0.5">
                    ${egresosMes.toLocaleString("es-BO")}
                  </div>
                </div>
              </div>

              {/* Margen Neto */}
              <div className="pt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
                <div className="text-xs font-medium text-slate-600">Margen Neto Operativo</div>
                <div
                  className={`text-2xl font-semibold tracking-tight mt-0.5 ${
                    margenMes >= 0 ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  ${margenMes.toLocaleString("es-BO")}
                </div>
              </div>
            </div>
          </div>

          <Link
            to="/admin/finanzas"
            className="mt-6 inline-flex items-center justify-center gap-2 text-xs font-semibold py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white transition shadow-sm"
          >
            <span>Ver Detalle de Finanzas</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
      )}

      {/* Operational Widgets Grid (Tareas, Partos, Gastos) */}
      {isVisible("health_repro") && (
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Tareas Sanitarias */}
        <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Syringe className="size-4 text-sky-500" />
                <span>Salud y Vacunación</span>
              </h2>
              <span className="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700 border border-sky-200/60">
                7 días
              </span>
            </div>

            {tareasLoading ? (
              <div className="flex items-center justify-center h-[180px] text-slate-400">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : tareasList.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-10">Sin eventos sanitarios esta semana.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {tareasList.slice(0, 4).map((e: any) => (
                  <li key={e.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="min-w-0 pr-2">
                      <div className="font-semibold text-slate-900 capitalize truncate">{e.tipo}</div>
                      <div className="text-slate-500 truncate">
                        {e.animal || "Sin nombre"}
                        {e.chip ? ` (${e.chip})` : ""}
                      </div>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-700 shrink-0">
                      {e.proximaFecha
                        ? new Date(e.proximaFecha).toLocaleDateString("es-BO", { day: "numeric", month: "short" })
                        : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Link
            to="/admin/salud"
            className="mt-4 text-xs font-semibold text-sky-600 hover:text-sky-700 transition hover:underline text-center block"
          >
            Gestionar eventos sanitarios →
          </Link>
        </div>

        {/* Partos Estimados */}
        <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Baby className="size-4 text-purple-500" />
                <span>Partos Estimados</span>
              </h2>
              <span className="inline-flex items-center rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700 border border-purple-200/60">
                30 días
              </span>
            </div>

            {partosLoading ? (
              <div className="flex items-center justify-center h-[180px] text-slate-400">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : partosList.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-10">Sin partos previstos los próximos 30 días.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {partosList.slice(0, 4).map((r: any) => (
                  <li key={r.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="min-w-0 pr-2">
                      <div className="font-semibold text-slate-900 truncate">{r.hembra || "Hembra"}</div>
                      <div className="text-slate-500 truncate">
                        {r.chip ? `${r.chip} · ` : ""}
                        {r.diasGestacion != null ? `Día ${r.diasGestacion}` : ""}
                      </div>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-purple-50 px-2.5 py-0.5 text-[11px] font-medium text-purple-700 border border-purple-200/60 shrink-0">
                      {r.partoEstimado
                        ? new Date(r.partoEstimado).toLocaleDateString("es-BO", { day: "numeric", month: "short" })
                        : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Link
            to="/admin/reproduccion"
            className="mt-4 text-xs font-semibold text-purple-600 hover:text-purple-700 transition hover:underline text-center block"
          >
            Ver módulo de reproducción →
          </Link>
        </div>

        {/* Distribución de Gastos */}
        <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <PieChartIcon className="size-4 text-amber-500" />
              <span>Distribución de Gastos</span>
            </h2>

            {gastosLoading ? (
              <div className="flex items-center justify-center h-[180px] text-slate-400">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : !gastosResumen?.detalle?.length ? (
              <p className="text-xs text-slate-500 text-center py-10">Sin datos de gastos en este periodo.</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie
                      data={gastosResumen.detalle.map((d) => ({
                        name: CATEGORIAS_META[d.categoria]?.label || d.categoria,
                        value: d.monto,
                        color: CATEGORIAS_META[d.categoria]?.color || "#64748b",
                      }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={38}
                      outerRadius={62}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {gastosResumen.detalle.map((_, i) => (
                        <Cell
                          key={i}
                          fill={CATEGORIAS_META[gastosResumen.detalle[i].categoria]?.color || "#64748b"}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: 8,
                        fontSize: 11,
                      }}
                      formatter={(value: number) => `$${value.toLocaleString("es-BO")}`}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="space-y-1.5 mt-2">
                  {gastosResumen.detalle.slice(0, 3).map((d) => {
                    const meta = CATEGORIAS_META[d.categoria];
                    return (
                      <div key={d.categoria} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 truncate text-slate-600">
                          <span
                            className="size-2 rounded-full inline-block shrink-0"
                            style={{ backgroundColor: meta?.color || "#64748b" }}
                          />
                          <span className="truncate">{meta?.label || d.categoria}</span>
                        </span>
                        <span className="font-semibold text-slate-900">${d.monto.toLocaleString("es-BO")}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <Link
            to="/admin/finanzas"
            className="mt-4 text-xs font-semibold text-amber-600 hover:text-amber-700 transition hover:underline text-center block"
          >
            Ver detalle completo de gastos →
          </Link>
        </div>
      </div>
      )}
    </div>
  );
}
