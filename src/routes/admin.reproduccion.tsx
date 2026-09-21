import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Heart, Baby, Plus, Search, Loader2, Edit3, Trash2, Venus, Swords, AlertTriangle, FlaskConical, BarChart3 } from "lucide-react";
import { useReproduccion, useCreateReproduccion, useUpdateReproduccion, useDeleteReproduccion } from "@/hooks/useReproduccion";
import { useBovinos } from "@/hooks/useBovinos";
import { useIatfCiclos, useTasasIatf, useTasasPorToro, useVacasParaCiclo, useHistorialHembra } from "@/hooks/useIatf";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, FileText, Calendar, Activity, CheckCircle2, UserCheck, Stethoscope, Sparkles } from "lucide-react";

export const Route = createFileRoute("/admin/reproduccion")({
  component: Reproduccion,
});

const estadoStyles: Record<string, string> = {
  confirmada: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  evaluacion: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  aborto: "bg-red-500/10 text-red-600 dark:text-red-400",
  parto_realizado: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  descartada: "bg-muted text-muted-foreground line-through",
};

const resultadoStyles: Record<string, string> = {
  positivo: "bg-emerald-500/10 text-emerald-600",
  negativo: "bg-red-500/10 text-red-600",
  pendiente: "bg-blue-500/10 text-blue-600",
};

const estadoOptions = [
  { value: "evaluacion", label: "Evaluación" },
  { value: "confirmada", label: "Confirmada" },
  { value: "aborto", label: "Aborto" },
  { value: "parto_realizado", label: "Parto realizado" },
  { value: "descartada", label: "Descartada" },
];

const MAX_IATF = 4;

const today = () => new Date().toISOString().split("T")[0];

const defaultForm = {
  hembraId: "",
  toroId: "",
  padreId: "",
  fechaInseminacion: today(),
  cicloNumero: 1,
  resultado: "pendiente",
  tipoServicio: "iatf",
  estado: "evaluacion",
  observaciones: "",
  inseminador: "",
  condicionCorporal: "3.0",
  protocolo: "",
  codigoPajuela: "",
};

const TABS = [
  { id: "registros", label: "Registros IATF", icon: Heart },
  { id: "tasas", label: "Tasas por ciclo", icon: BarChart3 },
  { id: "toros", label: "Tasas por toro", icon: Swords },
  { id: "historial", label: "Historial hembra", icon: Baby },
];

function Reproduccion() {
  const [q, setQ] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<string>("todos");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [tab, setTab] = useState("registros");
  const [historialHembraId, setHistorialHembraId] = useState<string | null>(null);
  const [viewDetail, setViewDetail] = useState<any>(null);

  const queryClient = useQueryClient();
  const { data: apiData, isLoading } = useReproduccion(1, 200);
  const { data: bovinosData } = useBovinos(1, 200);
  const { data: iatfData } = useIatfCiclos(1, 200);
  const { data: tasasData } = useTasasIatf();
  const { data: tasasToros } = useTasasPorToro();
  const { data: vacasParaCiclo } = useVacasParaCiclo(3);
  const { data: historialData } = useHistorialHembra(historialHembraId || "");
  const createMutation = useCreateReproduccion();
  const updateMutation = useUpdateReproduccion();
  const deleteMutation = useDeleteReproduccion();

  const sourceData: any[] = apiData?.data && Array.isArray(apiData.data) ? apiData.data : [];
  const iatfRecords: any[] = iatfData?.data && Array.isArray(iatfData.data) ? iatfData.data : [];

  const allBovinos = useMemo(() => {
    if (!bovinosData?.data || !Array.isArray(bovinosData.data)) return [];
    return bovinosData.data;
  }, [bovinosData]);

  const hembras = useMemo(() => allBovinos.filter((b: any) => b.sexo === "Hembra"), [allBovinos]);
  const machos = useMemo(() => allBovinos.filter((b: any) => b.sexo === "Macho"), [allBovinos]);

  const gestantesIds = useMemo(() => {
    const ids = new Set<string>();
    sourceData.forEach((r: any) => {
      if ((r.estado === "confirmada" || r.estado === "evaluacion") && r.hembraId) {
        ids.add(r.hembraId);
      }
    });
    return ids;
  }, [sourceData]);

  const vacasLimiteIatf = useMemo(() => {
    const conteo: Record<string, { id: string; nombre: string; chip: string; nro: string; total: number; ultimoCiclo: number; ultimoResultado: string }> = {};
    iatfRecords.forEach((r: any) => {
      if (!conteo[r.hembraId]) {
        conteo[r.hembraId] = { id: r.hembraId, nombre: r.hembra || "", chip: r.chipHembra || "", nro: r.numHembra || "", total: 0, ultimoCiclo: 0, ultimoResultado: "" };
      }
      conteo[r.hembraId].total++;
      if (r.cicloNumero > conteo[r.hembraId].ultimoCiclo) {
        conteo[r.hembraId].ultimoCiclo = r.cicloNumero;
        conteo[r.hembraId].ultimoResultado = r.resultado;
      }
    });
    return Object.values(conteo).filter((c) => c.ultimoResultado === "negativo" || c.total >= MAX_IATF);
  }, [iatfRecords]);

  const filtrados = useMemo(() => {
    const data = tab === "registros" ? iatfRecords : sourceData;
    return data.filter((e: any) => {
      if (estadoFiltro !== "todos" && e.estado !== estadoFiltro) return false;
      const searchStr = `${e.hembra || ""} ${e.toro || ""} ${e.padre || ""} ${e.estado || ""} ${e.resultado || ""}`;
      if (q && !searchStr.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [sourceData, iatfRecords, q, estadoFiltro, tab]);

  const stats = useMemo(() => {
    const total = iatfRecords.length;
    const positivos = iatfRecords.filter((r: any) => r.resultado === "positivo").length;
    const negativos = iatfRecords.filter((r: any) => r.resultado === "negativo").length;
    const pendientes = iatfRecords.filter((r: any) => r.resultado === "pendiente").length;
    const tasa = total > 0 ? Math.round((positivos / total) * 100) : 0;
    const confirmadas = sourceData.filter((r: any) => r.estado === "confirmada").length;
    const evaluacion = sourceData.filter((r: any) => r.estado === "evaluacion").length;
    const partos = sourceData.filter((r: any) => r.estado === "parto_realizado").length;
    const conGestacion = sourceData.filter((r: any) => (r.diasActuales ?? 0) > 0).length;
    const hembrasCount = allBovinos.filter((b: any) => b.sexo === "Hembra").length;
    const enLimite = vacasLimiteIatf.length;
    return { total, positivos, negativos, pendientes, tasa, confirmadas, evaluacion, partos, conGestacion, hembras: hembrasCount, enLimite };
  }, [iatfRecords, sourceData, allBovinos, vacasLimiteIatf]);

  const openCreate = () => {
    setForm(defaultForm);
    setEditId(null);
    setModal("create");
  };

  const openEdit = (e: any) => {
    setForm({
      hembraId: e.hembraId || "",
      toroId: e.toroId || "",
      padreId: e.padreId || "",
      fechaInseminacion: e.fechaInseminacion ? String(e.fechaInseminacion).split("T")[0] : today(),
      cicloNumero: e.cicloNumero || 1,
      resultado: e.resultado || "pendiente",
      tipoServicio: e.tipoServicio || "iatf",
      estado: e.estado || "evaluacion",
      observaciones: e.observaciones || "",
      inseminador: e.inseminador || "",
      condicionCorporal: e.condicionCorporal?.toString() || "3.0",
      protocolo: e.protocolo || "",
      codigoPajuela: e.codigoPajuela || "",
    });
    setEditId(e.id);
    setModal("edit");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      observaciones: form.observaciones || undefined,
      inseminador: form.inseminador || undefined,
      condicionCorporal: form.condicionCorporal ? parseFloat(form.condicionCorporal) : undefined,
      protocolo: form.protocolo || undefined,
      codigoPajuela: form.codigoPajuela || undefined,
    };
    if (editId) {
      payload.estado = form.estado;
      payload.resultado = form.resultado;
    } else {
      payload.hembraId = form.hembraId;
      payload.toroId = form.toroId || undefined;
      payload.padreId = form.padreId || undefined;
      payload.fechaInseminacion = form.fechaInseminacion;
      payload.cicloNumero = parseInt(form.cicloNumero as any);
      payload.resultado = form.resultado;
      payload.tipoServicio = form.tipoServicio;
      payload.estado = form.estado;
    }
    try {
      if (editId) {
        await updateMutation.mutateAsync({ id: editId, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      setModal(null);
      queryClient.invalidateQueries({ queryKey: ["reproduccion"] });
      queryClient.invalidateQueries({ queryKey: ["iatf"] });
    } catch (err) {
      console.error("Error guardando:", err);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ["reproduccion"] });
      queryClient.invalidateQueries({ queryKey: ["iatf"] });
    } catch (err) {
      console.error("Error eliminando:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 space-y-6">
        <div className="animate-pulse rounded-lg bg-muted/40 h-8 w-48" />
        <div className="grid gap-3 grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="animate-pulse rounded-2xl bg-muted/40 h-24" />)}
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
          <h1 className="font-display text-3xl">Reproducción</h1>
          <p className="text-muted-foreground text-sm">
            IATF: Inseminación Artificial a Tiempo Fijo · Ciclos 1°, 3°, 4°
          </p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-primary-foreground text-sm hover:bg-primary/90 cursor-pointer">
          <Plus className="size-4" /> Nueva IATF
        </button>
      </div>

      {stats.enLimite > 0 && (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 flex items-start gap-3">
          <AlertTriangle className="size-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm text-destructive">
              {stats.enLimite} vaca{stats.enLimite > 1 ? "s" : ""} en límite de IATF
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.enLimite} hembra{stats.enLimite > 1 ? "s" : ""} ha{stats.enLimite > 1 ? "n" : ""} alcanzado el máximo de {MAX_IATF} inseminaciones sin preñez. Considere descarte.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Heart className="size-3.5 text-purple-500" /> Tasa de preñez IATF
          </div>
          <div className="font-display text-2xl">{stats.tasa}%</div>
          <div className="text-xs text-muted-foreground/70 mt-1">
            {stats.positivos} + de {stats.total} total
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <BarChart3 className="size-3.5 text-accent" /> IATF registradas
          </div>
          <div className="font-display text-2xl">{stats.total}</div>
          <div className="text-xs text-muted-foreground/70 mt-1">
            <span className="text-emerald-600">{stats.positivos} +</span> · <span className="text-red-600">{stats.negativos} -</span> · {stats.pendientes} pend.
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Baby className="size-3.5 text-accent" /> Inseminaciones activas
          </div>
          <div className="font-display text-2xl">{stats.confirmadas + stats.evaluacion}</div>
          <div className="text-xs text-muted-foreground/70 mt-1">
            {stats.evaluacion} en eval. · {stats.confirmadas} confirmadas
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Venus className="size-3.5 text-pink-500" /> Hembras en hato
          </div>
          <div className="font-display text-2xl">{stats.hembras}</div>
          <div className="text-xs text-muted-foreground/70 mt-1">
            {stats.conGestacion} con gestación activa
          </div>
        </div>
      </div>

      {stats.enLimite > 0 && (
        <details className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
          <summary className="flex items-center gap-2 text-sm font-medium cursor-pointer">
            <AlertTriangle className="size-4 text-amber-500" />
            Vacas que necesitan evaluación ({stats.enLimite})
          </summary>
          <div className="mt-3 space-y-1">
            {vacasLimiteIatf.map((v: any) => (
              <div key={v.id} className="text-sm flex items-center justify-between py-1">
                <span>{v.nombre || v.chip} {v.nro ? `(#${v.nro})` : ""}</span>
                <span className="text-muted-foreground">
                  {v.total} IATF · Ciclo {v.ultimoCiclo} · Último: {v.ultimoResultado}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}

      <div className="flex flex-wrap gap-2 border-b border-border">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition cursor-pointer ${tab === t.id ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              <Icon className="size-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "tasas" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-lg mb-4">Tasas de preñez por ciclo IATF</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3">Ciclo</th>
                    <th className="text-left px-4 py-3">Total</th>
                    <th className="text-left px-4 py-3">Positivos (+)</th>
                    <th className="text-left px-4 py-3">Negativos (-)</th>
                    <th className="text-left px-4 py-3">Pendientes</th>
                    <th className="text-left px-4 py-3">Tasa preñez</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {tasasData?.porCiclo?.map((c: any) => (
                    <tr key={c.ciclo} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{c.ciclo}° Ciclo</td>
                      <td className="px-4 py-3">{c.total}</td>
                      <td className="px-4 py-3 text-emerald-600">{c.positivos}</td>
                      <td className="px-4 py-3 text-red-600">{c.negativos}</td>
                      <td className="px-4 py-3">{c.pendientes}</td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold ${c.tasaPreñez >= 50 ? "text-emerald-600" : c.tasaPreñez >= 30 ? "text-amber-600" : "text-red-600"}`}>
                          {c.tasaPreñez}%
                        </span>
                      </td>
                    </tr>
                  ))}
                  {tasasData?.general && (
                    <tr className="bg-muted/30 font-medium">
                      <td className="px-4 py-3">Total general</td>
                      <td className="px-4 py-3">{tasasData.general.total}</td>
                      <td className="px-4 py-3 text-emerald-600">{tasasData.general.positivos}</td>
                      <td className="px-4 py-3 text-red-600">{tasasData.general.negativos}</td>
                      <td className="px-4 py-3">—</td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold ${tasasData.general.tasaPreñez >= 50 ? "text-emerald-600" : tasasData.general.tasaPreñez >= 30 ? "text-amber-600" : "text-red-600"}`}>
                          {tasasData.general.tasaPreñez}%
                        </span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {vacasParaCiclo && vacasParaCiclo.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-display text-lg mb-3 flex items-center gap-2">
                <Baby className="size-4 text-accent" />
                Vacas para próximo ciclo ({vacasParaCiclo.length})
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="text-left px-4 py-3">Nombre</th>
                      <th className="text-left px-4 py-3">Chip</th>
                      <th className="text-left px-4 py-3">N°</th>
                      <th className="text-left px-4 py-3">Último ciclo</th>
                      <th className="text-left px-4 py-3">Total IATF</th>
                      <th className="text-left px-4 py-3">Último resultado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {vacasParaCiclo.map((v: any) => (
                      <tr key={v.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{v.nombre || v.chip}</td>
                        <td className="px-4 py-3 text-muted-foreground">{v.chip}</td>
                        <td className="px-4 py-3">{v.numeroIdentificacion || "—"}</td>
                        <td className="px-4 py-3">{v.ultimoCiclo}°</td>
                        <td className="px-4 py-3">{v.totalIatf}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs ${v.ultimoResultado === "negativo" ? "bg-red-500/10 text-red-600" : "bg-blue-500/10 text-blue-600"}`}>
                            {v.ultimoResultado || "pendiente"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "toros" && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-lg mb-4">Tasas de preñez por toro</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">Toro</th>
                  <th className="text-left px-4 py-3">Servicios</th>
                  <th className="text-left px-4 py-3">Positivos (+)</th>
                  <th className="text-left px-4 py-3">Negativos (-)</th>
                  <th className="text-left px-4 py-3">Tasa preñez</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tasasToros?.map((t: any) => (
                  <tr key={t.toroId} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium">{t.toro}</div>
                      <div className="text-xs text-muted-foreground">{t.chipToro}</div>
                    </td>
                    <td className="px-4 py-3">{t.total}</td>
                    <td className="px-4 py-3 text-emerald-600">{t.positivos}</td>
                    <td className="px-4 py-3 text-red-600">{t.negativos}</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${t.tasaPreñez >= 50 ? "text-emerald-600" : t.tasaPreñez >= 30 ? "text-amber-600" : "text-red-600"}`}>
                        {t.tasaPreñez}%
                      </span>
                    </td>
                  </tr>
                ))}
                {(!tasasToros || tasasToros.length === 0) && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">
                      Sin datos de servicios por toro
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "historial" && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <select
                value={historialHembraId || ""}
                onChange={(e) => setHistorialHembraId(e.target.value || null)}
                className="w-full rounded-full border border-input bg-card pl-10 pr-4 py-2.5 text-sm outline-none focus:border-accent"
              >
                <option value="">Seleccionar hembra...</option>
                {hembras.map((b: any) => (
                  <option key={b.id} value={b.id}>{b.nombre || b.chip} {b.numeroIdentificacion ? `(#${b.numeroIdentificacion})` : ""}</option>
                ))}
              </select>
            </div>
          </div>
          {historialData ? (
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-display text-lg mb-3">
                Historial: {historialData.hembra?.nombre || historialData.hembra?.chip}
              </h2>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-sm">
                  <span className="text-muted-foreground text-xs">Total IATF</span>
                  <p className="font-display text-xl">{historialData.totalIatf}</p>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground text-xs">Último ciclo</span>
                  <p className="font-display text-xl">{historialData.ultimoCiclo}°</p>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground text-xs">Último resultado</span>
                  <p className={`font-display text-xl ${historialData.ultimoResultado === "positivo" ? "text-emerald-600" : historialData.ultimoResultado === "negativo" ? "text-red-600" : ""}`}>
                    {historialData.ultimoResultado || "—"}
                  </p>
                </div>
              </div>
              {historialData.totalIatf >= MAX_IATF && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-600 mb-4">
                  <AlertTriangle className="size-4 inline mr-1" />
                  Esta vaca alcanzó el límite de {MAX_IATF} IATF. Considere descartarla o evaluar causa de infertilidad.
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="text-left px-4 py-3">Ciclo</th>
                      <th className="text-left px-4 py-3">Fecha</th>
                      <th className="text-left px-4 py-3">Toro</th>
                      <th className="text-left px-4 py-3">Resultado</th>
                      <th className="text-left px-4 py-3">Estado</th>
                      <th className="text-left px-4 py-3">Obs.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {historialData.iatfs?.map((r: any) => (
                      <tr key={r.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{r.cicloNumero}°</td>
                        <td className="px-4 py-3">{r.fechaInseminacion ? String(r.fechaInseminacion).split("T")[0] : "—"}</td>
                        <td className="px-4 py-3">{r.toro || "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs ${resultadoStyles[r.resultado] || ""}`}>
                            {r.resultado || "pendiente"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs capitalize ${estadoStyles[r.estado] || ""}`}>
                            {r.estado?.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{r.observaciones || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground">
              <Baby className="size-10 mx-auto mb-3 opacity-40" />
              <p className="font-display text-lg">Seleccioná una hembra</p>
              <p className="text-sm mt-1">Para ver su historial completo de IATF</p>
            </div>
          )}
        </div>
      )}

      {tab === "registros" && (
        <>
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por hembra, toro, resultado..."
                className="w-full rounded-full border border-input bg-card pl-10 pr-4 py-2.5 text-sm outline-none focus:border-accent"
              />
            </div>
            <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)} className="rounded-full border border-input bg-card px-4 py-2.5 text-sm">
              <option value="todos">Todos los estados</option>
              {estadoOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3">Hembra</th>
                    <th className="text-left px-4 py-3">Ciclo</th>
                    <th className="text-left px-4 py-3">Toro</th>
                    <th className="text-left px-4 py-3">Inseminación</th>
                    <th className="text-left px-4 py-3">Resultado</th>
                    <th className="text-left px-4 py-3">Estado</th>
                    <th className="text-left px-4 py-3">Días gest.</th>
                    <th className="text-right px-4 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtrados.map((e: any) => {
                    const isLimite = e.cicloNumero >= MAX_IATF && e.resultado === "negativo";
                    return (
                      <tr key={e.id} className={`hover:bg-muted/30 transition ${isLimite ? "bg-red-500/5" : ""}`}>
                        <td className="px-4 py-3">
                          <div className="font-medium flex items-center gap-1.5">
                            {e.hembra || e.hembraId?.slice(0, 8)}
                          </div>
                          {e.chipHembra && <div className="text-[11px] text-muted-foreground">{e.chipHembra}</div>}
                          {e.observaciones && (
                            <div
                              onClick={() => setViewDetail(e)}
                              className="mt-1 flex items-center gap-1 text-[10px] text-purple-700 dark:text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-md cursor-pointer hover:bg-purple-500/20 transition max-w-[180px] truncate"
                              title={`Notas: ${e.observaciones}`}
                            >
                              <FileText className="size-3 shrink-0 text-purple-600" />
                              <span className="truncate">{e.observaciones}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono font-medium">{e.cicloNumero || 1}°</span>
                          {e.tipoServicio && (
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{e.tipoServicio?.replace("_", " ")}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-muted-foreground font-medium">{e.toro || e.padre || "—"}</div>
                          {e.chipToro && <div className="text-[11px] text-muted-foreground">{e.chipToro}</div>}
                          {e.inseminador && <div className="text-[10px] text-muted-foreground/80">Téc: {e.inseminador}</div>}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {e.fechaInseminacion ? String(e.fechaInseminacion).split("T")[0] : "-"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${resultadoStyles[e.resultado] || ""}`}>
                            {e.resultado === "positivo" ? "🟢 (+) Positivo" : e.resultado === "negativo" ? "🔴 (-) Negativo" : "⏳ Pendiente"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs capitalize ${estadoStyles[e.estado] || ""}`}>
                            {e.estado?.replace(/_/g, " ")}
                          </span>
                          {e.trimestre && e.estado === "confirmada" && (
                            <div className={`text-[10px] font-semibold mt-1 ${e.trimestre === 3 ? "text-amber-600" : "text-muted-foreground"}`}>
                              {e.trimestre === 3 ? "🚨 3er Trim. (Pre-parto)" : `${e.trimestre}° Trimestre`}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {e.diasActuales != null ? (
                            <div>
                              <div className="font-semibold text-xs">{e.diasActuales} / 283d</div>
                              {e.diasFaltantes != null && (
                                <div className="text-[10px] text-muted-foreground">Faltan {e.diasFaltantes}d</div>
                              )}
                            </div>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => setViewDetail(e)} className="grid size-7 place-items-center rounded-md hover:bg-purple-500/10 text-purple-600 cursor-pointer" title="Ver Ficha Reproductiva Completa">
                              <Eye className="size-3.5" />
                            </button>
                            <button onClick={() => openEdit(e)} className="grid size-7 place-items-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer" title="Editar">
                              <Edit3 className="size-3.5" />
                            </button>
                            {e.estado !== "parto_realizado" && (
                              <button onClick={() => setDeleteId(e.id)} className="grid size-7 place-items-center rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive cursor-pointer" title="Eliminar">
                                <Trash2 className="size-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filtrados.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground text-sm">
                        No se encontraron registros IATF.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <Dialog open={modal !== null} onOpenChange={(open) => { if (!open) setModal(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar IATF" : "Nueva IATF"}</DialogTitle>
            <DialogDescription>
              {editId ? "Actualizá el resultado y el estado." : "Registrá una nueva inseminación artificial a tiempo fijo."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {editId ? (
                <>
                  <div className="space-y-1.5">
                    <Label>Hembra</Label>
                    <div className="rounded-xl border border-input bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">
                      {hembras.find((b: any) => b.id === form.hembraId)?.nombre || form.hembraId?.slice(0, 8) || "—"}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Toro</Label>
                    <div className="rounded-xl border border-input bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">
                      {machos.find((b: any) => b.id === form.toroId)?.nombre || form.toroId?.slice(0, 8) || "—"}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="hembraId">Hembra *</Label>
                    <Select value={form.hembraId} onValueChange={(v) => setForm({ ...form, hembraId: v })}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar hembra..." /></SelectTrigger>
                      <SelectContent>
                        {hembras.length === 0 && <SelectItem value="" disabled>No hay hembras</SelectItem>}
                        {hembras.map((b: any) => {
                          const ocupada = gestantesIds.has(b.id);
                          const iatfCount = iatfRecords.filter((r: any) => r.hembraId === b.id).length;
                          const enLimite = iatfCount >= MAX_IATF;
                          return (
                            <SelectItem key={b.id} value={b.id} disabled={ocupada || enLimite} className={ocupada || enLimite ? "opacity-50" : ""}>
                              {b.nombre || b.chip} ({iatfCount} IATF){ocupada ? " — Gestando" : enLimite ? " — Límite" : ""}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="toroId">Toro *</Label>
                    <Select value={form.toroId} onValueChange={(v) => setForm({ ...form, toroId: v })}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar toro..." /></SelectTrigger>
                      <SelectContent>
                        {machos.length === 0 && <SelectItem value="" disabled>No hay machos</SelectItem>}
                        {machos.map((b: any) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.nombre || b.chip}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="cicloNumero">Ciclo IATF</Label>
                <Select value={String(form.cicloNumero)} onValueChange={(v) => setForm({ ...form, cicloNumero: parseInt(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1° Ciclo</SelectItem>
                    <SelectItem value="3">3° Ciclo</SelectItem>
                    <SelectItem value="4">4° Ciclo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="resultado">Resultado Diagnóstico *</Label>
                <Select
                  value={form.resultado}
                  onValueChange={(v) => {
                    setForm((prev) => ({
                      ...prev,
                      resultado: v,
                      estado: v === "positivo" ? "confirmada" : v === "negativo" ? "evaluacion" : prev.estado,
                    }));
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente">⏳ Pendiente Diagnóstico</SelectItem>
                    <SelectItem value="positivo">🟢 (+) Positivo (Preñada)</SelectItem>
                    <SelectItem value="negativo">🔴 (-) Negativo (Vacía)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {!editId && (
                <>
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label htmlFor="tipoServicio">Tipo de Servicio *</Label>
                    <Select value={form.tipoServicio} onValueChange={(v) => setForm({ ...form, tipoServicio: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="iatf">💉 IATF (Inseminación a Tiempo Fijo)</SelectItem>
                        <SelectItem value="servicio_natural">🐂 Servicio Natural (Monta)</SelectItem>
                        <SelectItem value="transferencia_embrion">🧪 Transferencia de Embrión (TE)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label htmlFor="fechaInseminacion">Fecha servicio / inseminación *</Label>
                    <Input id="fechaInseminacion" type="date" value={form.fechaInseminacion} onChange={(e) => setForm({ ...form, fechaInseminacion: e.target.value })} required />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="inseminador">Inseminador / Técnico</Label>
                    <Input id="inseminador" value={form.inseminador} onChange={(e) => setForm({ ...form, inseminador: e.target.value })} placeholder="Ej. Dr. Ramírez / Técnico Juan" />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="condicionCorporal">Condición Corporal (CC 1-5)</Label>
                    <Input id="condicionCorporal" type="number" step="0.25" min="1" max="5" value={form.condicionCorporal} onChange={(e) => setForm({ ...form, condicionCorporal: e.target.value })} placeholder="3.0 (Óptima)" />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="protocolo">Protocolo Hormonal</Label>
                    <Input id="protocolo" value={form.protocolo} onChange={(e) => setForm({ ...form, protocolo: e.target.value })} placeholder="Ej. J-Syn, Benzoato + DIB" />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="codigoPajuela">Código Pajuela / Semen</Label>
                    <Input id="codigoPajuela" value={form.codigoPajuela} onChange={(e) => setForm({ ...form, codigoPajuela: e.target.value })} placeholder="Lote semen / Nro termo" />
                  </div>
                </>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="estado">Estado</Label>
                <Select value={form.estado} onValueChange={(v) => setForm({ ...form, estado: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {estadoOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
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
                  placeholder="Detalles del tacto, ecografía o medicamentos aplicados..."
                />
              </div>

              {/* Guía Visual Senior de Gestación y Diagnóstico */}
              <div className="col-span-2">
                {form.resultado === "positivo" && form.fechaInseminacion && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                    <p className="font-semibold flex items-center gap-1.5">
                      ✨ Gestación Confirmada (Cálculo Oficial 283 Días)
                    </p>
                    <p>
                      🗓️ <strong>Fecha Estimada de Parto:</strong>{" "}
                      {new Date(
                        new Date(form.fechaInseminacion).getTime() + 283 * 24 * 60 * 60 * 1000
                      ).toLocaleDateString("es-BO", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                    <p className="text-[11px] opacity-90">
                      La vaca cambiará automáticamente a estado <strong>"Preñez"</strong> en el inventario.
                    </p>
                  </div>
                )}

                {form.resultado === "negativo" && (
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-800 dark:text-rose-300 space-y-1">
                    <p className="font-semibold flex items-center gap-1.5">
                      ⚠️ Diagnóstico Negativo (Vaca Vacía)
                    </p>
                    <p className="text-[11px] opacity-90">
                      Podés mantener el estado en <strong>"Evaluación"</strong> para reintentar la inseminación en el próximo celo (Ciclo #{form.cicloNumero + 1}), o cambiar el estado a <strong>"Descartada"</strong> si la vaca presenta problemas de fertilidad.
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)} className="rounded-full border border-input px-5 py-2 text-sm hover:bg-muted cursor-pointer">
                Cancelar
              </button>
              <button type="submit" disabled={modalBusy} className="rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 cursor-pointer">
                {modalBusy && <Loader2 className="size-4 animate-spin" />}
                {editId ? "Guardar cambios" : "Registrar IATF"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar registro</DialogTitle>
            <DialogDescription>
              Esta acción eliminará permanentemente el registro. ¿Confirmás?
            </DialogDescription>
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

      {/* Dialog Ficha Técnica Reproductiva Completa */}
      <Dialog open={viewDetail !== null} onOpenChange={(open) => !open && setViewDetail(null)}>
        <DialogContent className="sm:max-w-xl font-sans">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
              <Heart className="size-5 text-purple-600" />
              Ficha Reproductiva: {viewDetail?.hembra}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Chip: {viewDetail?.chipHembra || "Sin chip"} · Identificación: #{viewDetail?.numHembra || "—"}
            </DialogDescription>
          </DialogHeader>

          {viewDetail && (
            <div className="space-y-4 pt-2 text-sm">
              {/* TIMELINE DE GESTACIÓN POR TRIMESTRES */}
              {viewDetail.estado === "confirmada" && viewDetail.diasActuales != null && (
                <div className="space-y-2 rounded-2xl border border-purple-500/30 bg-purple-500/10 p-4">
                  <div className="flex items-center justify-between text-xs font-semibold text-purple-900 dark:text-purple-200">
                    <span className="flex items-center gap-1.5">
                      🤰 Línea de Gestación ({viewDetail.diasActuales} / 283 Días)
                    </span>
                    <span className="bg-purple-600 text-white px-2 py-0.5 rounded-full text-[10px]">
                      {viewDetail.trimestre === 3 ? "🚨 3er Trimestre (Pre-Parto)" : `${viewDetail.trimestre}° Trimestre`}
                    </span>
                  </div>

                  <div className="w-full bg-purple-200 dark:bg-purple-950 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-purple-600 h-full transition-all duration-500 rounded-full"
                      style={{ width: `${viewDetail.progreso || 0}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[11px] pt-1 text-purple-800 dark:text-purple-300 border-t border-purple-500/20">
                    <div>
                      <span className="text-purple-600 dark:text-purple-400 block text-[10px] uppercase font-bold">1er Trim (1-90d)</span>
                      <span>{viewDetail.diasActuales >= 90 ? "✅ Completado" : "En curso"}</span>
                    </div>
                    <div>
                      <span className="text-purple-600 dark:text-purple-400 block text-[10px] uppercase font-bold">2do Trim (91-180d)</span>
                      <span>{viewDetail.diasActuales >= 180 ? "✅ Completado" : viewDetail.diasActuales >= 90 ? "En curso" : "Pendiente"}</span>
                    </div>
                    <div>
                      <span className="text-purple-600 dark:text-purple-400 block text-[10px] uppercase font-bold">3er Trim (181-283d)</span>
                      <span>{viewDetail.diasActuales >= 181 ? "🚨 Pre-parto" : "Pendiente"}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* SECCIÓN DESTACADA DE NOTAS Y OBSERVACIONES CLÍNICAS */}
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
                  <FileText className="size-4 text-amber-600" />
                  <span>Observaciones y Notas Clínicas</span>
                </div>
                {viewDetail.observaciones ? (
                  <p className="text-xs text-amber-900 dark:text-amber-100 whitespace-pre-wrap leading-relaxed">
                    {viewDetail.observaciones}
                  </p>
                ) : (
                  <p className="text-xs text-amber-800/70 italic">
                    No se registraron notas adicionales en este servicio.
                  </p>
                )}
              </div>

              {/* MÉTRICAS GANADERAS Y DEL SERVICIO */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Detalles del Servicio y Diagnóstico
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-muted/30 p-3.5 rounded-2xl border border-border text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Tipo Servicio</span>
                    <span className="font-semibold text-foreground uppercase">{viewDetail.tipoServicio?.replace("_", " ")}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Toro / Padre</span>
                    <span className="font-semibold text-foreground">{viewDetail.toro || viewDetail.padre || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Inseminador / Técnico</span>
                    <span className="font-semibold text-foreground">{viewDetail.inseminador || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Condición Corporal (CC)</span>
                    <span className="font-semibold text-foreground">{viewDetail.condicionCorporal ? `${viewDetail.condicionCorporal} / 5.0` : "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Protocolo Hormonal</span>
                    <span className="font-semibold text-foreground">{viewDetail.protocolo || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Lote Pajuela</span>
                    <span className="font-semibold text-foreground">{viewDetail.codigoPajuela || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Parto Estimado</span>
                    <span className="font-semibold text-emerald-600">
                      {viewDetail.partoEstimadoCalc || viewDetail.partoEstimado
                        ? new Date(viewDetail.partoEstimadoCalc || viewDetail.partoEstimado).toLocaleDateString("es-BO")
                        : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Sugerencia de Secado</span>
                    <span className="font-semibold text-amber-600">
                      {viewDetail.fechaSecado
                        ? new Date(viewDetail.fechaSecado).toLocaleDateString("es-BO")
                        : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Días Faltantes</span>
                    <span className="font-semibold text-purple-600">{viewDetail.diasFaltantes != null ? `${viewDetail.diasFaltantes} días` : "—"}</span>
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
