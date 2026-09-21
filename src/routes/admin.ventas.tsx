import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useCreateVenta, useVentas, type VentaItem } from "@/hooks/useVentas";
import { useBovinos, type Bovino } from "@/hooks/useBovinos";
import {
  Loader2, Search, CheckCircle2, XCircle,
  AlertTriangle, User, Phone, Mail, Building2,
  FileText, Scale, DollarSign, Tag,
  FileDown, Printer, Plus, TrendingUp, ShoppingBag, X, Calendar, Check,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/ventas")({
  component: VentasSuite,
});

const hoy = new Date();
const todayStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;

const defaultForm = {
  animalId: "",
  compradorNombre: "",
  compradorDocumento: "",
  compradorTelefono: "",
  compradorEmail: "",
  compradorFinca: "",
  precioVenta: "",
  metodoPago: "efectivo",
  notas: "",
  fechaVenta: todayStr,
};

type FormKeys = keyof typeof defaultForm;
type FormErrors = Partial<Record<FormKeys, string>>;

const TC_DEFAULT = 6.96;

const PRECIO_POR_KG: Record<string, number> = {
  Nelore: 3.8,
  Brahman: 4.0,
  Brangus: 4.2,
  Gyr: 3.6,
  default: 3.5,
};

const metodoIcon: Record<string, string> = {
  efectivo: "💵 Efectivo",
  transferencia: "🏦 Transferencia Bancaria",
  cheque: "📜 Cheque",
  letra: "📝 Letra de Cambio",
  qr: "📱 Pago QR",
};

function formatUSD(n: number): string {
  return `$${(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatBS(n: number): string {
  return `Bs. ${(n || 0).toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function VentasSuite() {
  const [activeTab, setActiveTab] = useState<"nueva" | "historial" | "kpis">("nueva");
  const [form, setForm] = useState(defaultForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [q, setQ] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "info" | "error"; message: string } | null>(null);

  const [reciboVenta, setReciboVenta] = useState<{ venta: VentaItem; animal?: Bovino } | null>(null);
  const [historialSearch, setHistorialSearch] = useState("");

  const [tcUsado, setTcUsado] = useState(() => {
    const saved = localStorage.getItem("tc_usd_bob");
    return saved ? parseFloat(saved) : TC_DEFAULT;
  });

  const [buyerHistory, setBuyerHistory] = useState<Record<string, { documento: string; telefono: string; email: string; finca: string }>>(() => {
    try { return JSON.parse(localStorage.getItem("buyers") || "{}"); } catch { return {}; }
  });
  const [showBuyerSuggest, setShowBuyerSuggest] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const createVenta = useCreateVenta();
  const { data: apiBovinos, isLoading: loadingBovinos } = useBovinos(1, 200);
  const { data: listaVentasData, isLoading: loadingVentas, refetch: refetchVentas } = useVentas(1, 100);

  const bovinos: Bovino[] = apiBovinos?.data || [];
  const ventasList: VentaItem[] = listaVentasData || [];

  const disponibles = useMemo(() => {
    return bovinos.filter((b) => b.estado !== "vendido" && b.estado !== "muerto");
  }, [bovinos]);

  const filtradosBovinos = useMemo(() => {
    if (!q) return disponibles;
    const query = q.toLowerCase();
    return disponibles.filter((b) => `${b.nombre} ${b.chip} ${b.raza} ${b.potrero}`.toLowerCase().includes(query));
  }, [disponibles, q]);

  const animalSeleccionado = useMemo(
    () => bovinos.find((b) => b.id === form.animalId),
    [form.animalId, bovinos],
  );

  const precioNum = parseFloat(form.precioVenta) || 0;
  const precioBs = precioNum * tcUsado;
  const precioKg = animalSeleccionado?.pesoActual && animalSeleccionado.pesoActual > 0
    ? precioNum / animalSeleccionado.pesoActual
    : 0;

  const set = (field: FormKeys) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    let val = e.target.value;
    if (field === "compradorTelefono") {
      val = val.replace(/[^0-9+]/g, "");
      if (val && !val.startsWith("+")) val = "+591" + val.replace(/^(\+?591)?/, "");
    }
    setForm((prev) => ({ ...prev, [field]: val }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    if (field === "compradorNombre" && val.trim()) {
      const match = Object.keys(buyerHistory).find(n => n.toLowerCase().startsWith(val.toLowerCase()));
      setShowBuyerSuggest(!!match && match !== val);
    } else {
      setShowBuyerSuggest(false);
    }
  };

  const handleAnimalSelect = useCallback((b: Bovino) => {
    const sugerido = b.precio && b.precio > 0
      ? b.precio
      : b.pesoActual > 0
        ? Math.round(b.pesoActual * (PRECIO_POR_KG[b.raza] || PRECIO_POR_KG.default) * 100) / 100
        : 0;
    setForm((prev) => ({
      ...prev,
      animalId: b.id,
      precioVenta: sugerido > 0 ? sugerido.toString() : prev.precioVenta,
    }));
    setErrors((prev) => ({ ...prev, animalId: undefined }));
  }, []);

  const fillBuyer = (nombre: string) => {
    const b = buyerHistory[nombre];
    if (!b) return;
    setForm((prev) => ({
      ...prev,
      compradorNombre: nombre,
      compradorDocumento: b.documento || prev.compradorDocumento,
      compradorTelefono: b.telefono || prev.compradorTelefono,
      compradorEmail: b.email || prev.compradorEmail,
      compradorFinca: b.finca || prev.compradorFinca,
    }));
    setShowBuyerSuggest(false);
  };

  const saveBuyer = () => {
    if (!form.compradorNombre.trim()) return;
    const updated = {
      ...buyerHistory,
      [form.compradorNombre.trim()]: {
        documento: form.compradorDocumento || buyerHistory[form.compradorNombre.trim()]?.documento || "",
        telefono: form.compradorTelefono || buyerHistory[form.compradorNombre.trim()]?.telefono || "",
        email: form.compradorEmail || buyerHistory[form.compradorNombre.trim()]?.email || "",
        finca: form.compradorFinca || buyerHistory[form.compradorNombre.trim()]?.finca || "",
      },
    };
    setBuyerHistory(updated);
    localStorage.setItem("buyers", JSON.stringify(updated));
  };

  function validate(): boolean {
    const errs: FormErrors = {};
    if (!form.animalId) errs.animalId = "Seleccioná un animal del inventario";
    if (!form.compradorNombre.trim()) errs.compradorNombre = "Nombre del comprador requerido";
    if (!form.precioVenta || parseFloat(form.precioVenta) <= 0) errs.precioVenta = "Ingresá un precio válido";
    if (!form.metodoPago) errs.metodoPago = "Seleccioná un método de pago";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!validate()) return;
    setSubmitting(true);
    setFeedback(null);

    const idempotencyKey = crypto.randomUUID();

    try {
      const payload = {
        idempotencyKey,
        animalId: form.animalId,
        compradorNombre: form.compradorNombre.trim(),
        compradorDocumento: form.compradorDocumento || undefined,
        compradorTelefono: form.compradorTelefono || undefined,
        compradorEmail: form.compradorEmail || undefined,
        compradorFinca: form.compradorFinca || undefined,
        precioVenta: parseFloat(form.precioVenta),
        metodoPago: form.metodoPago as any,
        fechaVenta: form.fechaVenta || undefined,
        notas: form.notas || undefined,
      };

      saveBuyer();
      const response = await createVenta.mutateAsync(payload as any);

      if (response.success) {
        setFeedback({ type: "success", message: `Venta de ${animalSeleccionado?.nombre || 'animal'} registrada con éxito` });
        setForm(defaultForm);
        refetchVentas();
        setActiveTab("historial");
      }
    } catch (error: any) {
      setFeedback({ type: "error", message: error?.message || "Error al procesar la venta" });
    } finally {
      setSubmitting(false);
    }
  }

  const totalVendidoUSD = useMemo(() => ventasList.reduce((s, v) => s + (v.precioVenta || 0), 0), [ventasList]);
  const totalVendidoBS = totalVendidoUSD * tcUsado;

  const ventasFiltradasHistorial = useMemo(() => {
    if (!historialSearch) return ventasList;
    const query = historialSearch.toLowerCase();
    return ventasList.filter((v) => {
      const animal = bovinos.find((b) => b.id === v.animalId);
      const str = `${v.compradorNombre} ${v.compradorFinca || ""} ${v.compradorDocumento || ""} ${animal?.nombre || ""} ${animal?.chip || ""}`.toLowerCase();
      return str.includes(query);
    });
  }, [ventasList, historialSearch, bovinos]);

  const handlePrintRecibo = () => {
    window.print();
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-6xl mx-auto font-sans text-slate-900 antialiased">
      {/* Header Responsivo */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Comercialización & Ventas Ganaderas</h1>
          <p className="text-slate-500 text-xs sm:text-sm">
            Control de clientes, precios por kilo y emisión de recibos oficiales
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-semibold overflow-x-auto max-w-full no-scrollbar scrollbar-none">
          <button
            onClick={() => setActiveTab("nueva")}
            className={`px-3 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === "nueva" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Plus className="size-4 text-emerald-600" /> Nueva Venta
          </button>
          <button
            onClick={() => setActiveTab("historial")}
            className={`px-3 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === "historial" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <FileText className="size-4 text-blue-600" /> Historial ({ventasList.length})
          </button>
          <button
            onClick={() => setActiveTab("kpis")}
            className={`px-3 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === "kpis" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <TrendingUp className="size-4 text-purple-600" /> Métricas
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-2xl text-xs flex items-center justify-between shadow-xs ${
          feedback.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
        }`}>
          <span className="flex items-center gap-2 font-semibold">
            {feedback.type === "success" ? <CheckCircle2 className="size-4" /> : <AlertTriangle className="size-4" />}
            {feedback.message}
          </span>
          <button onClick={() => setFeedback(null)} className="cursor-pointer"><X className="size-4" /></button>
        </div>
      )}

      {/* PESTAÑA 1: NUEVA VENTA */}
      {activeTab === "nueva" && (
        <form onSubmit={handleSubmit} className="grid lg:grid-cols-12 gap-6 items-start">
          {/* Columna Izquierda: Selección de Ganado */}
          <div className="lg:col-span-6 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-bold flex items-center gap-2">
                  <Tag className="size-4 text-emerald-600" /> 1. Seleccionar Bovino para Venta
                </h2>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {disponibles.length} disponibles
                </span>
              </div>

              {/* Buscador Rápido */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <input
                  ref={searchRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar por arete, nombre, raza o potrero..."
                  className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs outline-none focus:border-emerald-500"
                />
              </div>

              {/* Lista Seleccionable de Animales */}
              <div className="max-h-72 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
                {filtradosBovinos.map((b) => {
                  const isSelected = form.animalId === b.id;
                  return (
                    <div
                      key={b.id}
                      onClick={() => handleAnimalSelect(b)}
                      className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between text-xs ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-50/50 shadow-xs"
                          : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{b.nombre}</span>
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 font-mono text-[10px] text-slate-600">
                            {b.chip || "Sin arete"}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {b.raza} · {b.sexo === "M" ? "Macho" : "Hembra"} · {b.pesoActual ? `${b.pesoActual} kg` : "Sin peso"} · {b.potrero || "General"}
                        </div>
                      </div>
                      <div className="text-right">
                        {isSelected ? (
                          <span className="size-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">
                            <Check className="size-3.5" />
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-emerald-600">Seleccionar</span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {filtradosBovinos.length === 0 && (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No se encontraron bovinos disponibles con esa búsqueda.
                  </div>
                )}
              </div>

              {errors.animalId && <p className="text-rose-600 text-xs font-semibold">{errors.animalId}</p>}
            </div>

            {/* Resumen del Animal Seleccionado */}
            {animalSeleccionado && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-4 space-y-2 text-xs">
                <h3 className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <Scale className="size-4 text-emerald-600" /> Ficha de Valoración de Venta
                </h3>
                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                  <div className="bg-white p-2 rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Peso Actual</span>
                    <p className="font-bold text-slate-900">{animalSeleccionado.pesoActual || "—"} kg</p>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Precio / Kg</span>
                    <p className="font-bold text-emerald-600">{precioKg > 0 ? `$${precioKg.toFixed(2)}/kg` : "—"}</p>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Total en Bs.</span>
                    <p className="font-bold text-slate-900">{formatBS(precioBs)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Columna Derecha: Formulario de Comprador y Transacción */}
          <div className="lg:col-span-6 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
              <h2 className="font-display text-base font-bold flex items-center gap-2">
                <User className="size-4 text-blue-600" /> 2. Datos del Comprador & Cobro
              </h2>

              <div className="space-y-3 text-xs">
                {/* Nombre Comprador */}
                <div className="space-y-1 relative">
                  <Label>Nombre completo del comprador *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <Input
                      value={form.compradorNombre}
                      onChange={set("compradorNombre")}
                      placeholder="Ej. Juan Carlos Mamani"
                      className="pl-9 h-9 text-xs"
                      required
                    />
                  </div>

                  {/* Autocompletar Compradores */}
                  {showBuyerSuggest && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-2 text-xs">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase px-2">Compradores Frecuentes</p>
                      {Object.keys(buyerHistory)
                        .filter(n => n.toLowerCase().startsWith(form.compradorNombre.toLowerCase()))
                        .map((nombre) => (
                          <div
                            key={nombre}
                            onClick={() => fillBuyer(nombre)}
                            className="px-2 py-1.5 hover:bg-slate-50 rounded-lg cursor-pointer flex justify-between items-center"
                          >
                            <span className="font-semibold text-slate-800">{nombre}</span>
                            <span className="text-[10px] text-slate-400">{buyerHistory[nombre].finca || "Sin finca"}</span>
                          </div>
                        ))}
                    </div>
                  )}
                  {errors.compradorNombre && <p className="text-rose-600 text-xs font-semibold">{errors.compradorNombre}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Carnet / CI / NIT</Label>
                    <Input value={form.compradorDocumento} onChange={set("compradorDocumento")} placeholder="Ej. 4839201 SC" className="h-9 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label>Teléfono / WhatsApp</Label>
                    <Input value={form.compradorTelefono} onChange={set("compradorTelefono")} placeholder="+591 76543210" className="h-9 text-xs" />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Nombre de la Finca / Destino</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <Input value={form.compradorFinca} onChange={set("compradorFinca")} placeholder="Ej. Estancia El Carmen (San Ignacio)" className="pl-9 h-9 text-xs" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1">
                    <Label>Precio de Venta ($us) *</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                      <Input
                        type="number"
                        step="0.01"
                        value={form.precioVenta}
                        onChange={set("precioVenta")}
                        placeholder="0.00"
                        className="pl-9 h-9 text-xs font-bold"
                        required
                      />
                    </div>
                    {errors.precioVenta && <p className="text-rose-600 text-xs font-semibold">{errors.precioVenta}</p>}
                  </div>

                  <div className="space-y-1">
                    <Label>Método de Pago *</Label>
                    <Select value={form.metodoPago} onValueChange={(v) => setForm({ ...form, metodoPago: v })}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="efectivo">💵 Efectivo</SelectItem>
                        <SelectItem value="transferencia">🏦 Transferencia Bancaria</SelectItem>
                        <SelectItem value="cheque">📜 Cheque</SelectItem>
                        <SelectItem value="qr">📱 Pago QR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Observaciones de la Entrega</Label>
                  <Textarea value={form.notas} onChange={set("notas")} placeholder="Guía SENASAG, transporte, estado corporal al entregar..." className="h-16 resize-none text-xs" />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs transition"
                >
                  {submitting ? <Loader2 className="size-4 animate-spin" /> : <ShoppingBag className="size-4 text-emerald-400" />}
                  Confirmar y Registrar Venta
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* PESTAÑA 2: HISTORIAL Y COMPROBANTES */}
      {activeTab === "historial" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <input
                value={historialSearch}
                onChange={(e) => setHistorialSearch(e.target.value)}
                placeholder="Buscar por cliente, carnet, finca o bovino..."
                className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs outline-none focus:border-emerald-500"
              />
            </div>
            <div className="text-xs text-slate-500 font-semibold">
              Total Acumulado: <span className="text-emerald-600 font-bold">{formatUSD(totalVendidoUSD)}</span> ({formatBS(totalVendidoBS)})
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Comprador / Finca</th>
                  <th className="px-4 py-3">Bovino / Arete</th>
                  <th className="px-4 py-3">Método de Pago</th>
                  <th className="px-4 py-3 text-right">Monto ($us)</th>
                  <th className="px-4 py-3 text-right">Monto (Bs.)</th>
                  <th className="px-4 py-3 text-center">Recibo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {ventasFiltradasHistorial.map((v) => {
                  const animal = bovinos.find((b) => b.id === v.animalId);
                  return (
                    <tr key={v.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 text-slate-500">
                        {v.fechaVenta || (v.createdAt ? new Date(v.createdAt).toLocaleDateString("es-BO") : "—")}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {v.compradorNombre}
                        {v.compradorFinca && <span className="block text-[11px] font-normal text-slate-500">{v.compradorFinca}</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-800">
                        {animal?.nombre || "Bovino"}
                        <span className="block text-[10px] font-mono text-slate-400">{animal?.chip || v.animalId}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {metodoIcon[v.metodoPago] || v.metodoPago}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-600">
                        {formatUSD(v.precioVenta)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">
                        {formatBS(v.precioVenta * tcUsado)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setReciboVenta({ venta: v, animal })}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                        >
                          <FileText className="size-3.5" /> Ver Recibo
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {ventasFiltradasHistorial.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      No se registraron ventas aún.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PESTAÑA 3: MÉTRICAS DE VENTAS */}
      {activeTab === "kpis" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-1 shadow-xs">
            <span className="text-xs text-slate-500 font-semibold">Total Comercializado</span>
            <p className="font-display text-2xl font-bold text-emerald-600">{formatUSD(totalVendidoUSD)}</p>
            <p className="text-xs text-slate-400">{formatBS(totalVendidoBS)} consolidado</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-1 shadow-xs">
            <span className="text-xs text-slate-500 font-semibold">Bovinos Vendidos</span>
            <p className="font-display text-2xl font-bold text-slate-900">{ventasList.length} animales</p>
            <p className="text-xs text-slate-400">Transacciones completadas</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-1 shadow-xs">
            <span className="text-xs text-slate-500 font-semibold">Ticket Promedio por Venta</span>
            <p className="font-display text-2xl font-bold text-blue-600">
              {formatUSD(ventasList.length > 0 ? totalVendidoUSD / ventasList.length : 0)}
            </p>
            <p className="text-xs text-slate-400">Promedio por transacción</p>
          </div>
        </div>
      )}

      {/* DIÁLOGO / MODAL DE COMPROBANTE OFICIAL DE VENTA (IMPRIMIBLE) */}
      <Dialog open={reciboVenta !== null} onOpenChange={(o) => { if (!o) setReciboVenta(null); }}>
        <DialogContent className="sm:max-w-lg rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center justify-between">
              <span>Recibo de Venta Ganadera</span>
              <button onClick={handlePrintRecibo} className="inline-flex items-center gap-1.5 text-xs bg-slate-900 text-white px-3 py-1.5 rounded-xl hover:bg-slate-800 cursor-pointer">
                <Printer className="size-3.5" /> Imprimir
              </button>
            </DialogTitle>
            <DialogDescription className="text-xs">Comprobante de transacción comercial Hacienda Guayabal.</DialogDescription>
          </DialogHeader>

          {reciboVenta && (
            <div className="space-y-4 text-xs font-sans print:p-0">
              {/* Membrete */}
              <div className="text-center border-b border-slate-200 pb-3 space-y-1">
                <h3 className="font-display text-lg font-bold text-slate-900 uppercase tracking-wide">Hacienda Guayabal</h3>
                <p className="text-[11px] text-slate-500">Certificado Oficial de Compra - Venta de Ganado en Pie</p>
                <p className="text-[10px] text-slate-400">Folio Transacción: #{reciboVenta.venta.id?.slice(0, 8)} · Fecha: {reciboVenta.venta.fechaVenta || "Hoy"}</p>
              </div>

              {/* Vendedor y Comprador */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">VENDEDOR</span>
                  <p className="font-bold text-slate-900">Hacienda Guayabal</p>
                  <p className="text-[11px] text-slate-500">San Ignacio de Velasco, Santa Cruz</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">COMPRADOR</span>
                  <p className="font-bold text-slate-900">{reciboVenta.venta.compradorNombre}</p>
                  {reciboVenta.venta.compradorDocumento && <p className="text-[11px] text-slate-500">CI/NIT: {reciboVenta.venta.compradorDocumento}</p>}
                  {reciboVenta.venta.compradorFinca && <p className="text-[11px] text-slate-500">Propiedad: {reciboVenta.venta.compradorFinca}</p>}
                </div>
              </div>

              {/* Detalle del Ganado */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100 px-3 py-2 font-bold text-slate-700 text-[11px]">
                  DETALLE DEL GANADO ENTREGADO
                </div>
                <div className="p-3 space-y-1">
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>{reciboVenta.animal?.nombre || "Bovino"} ({reciboVenta.animal?.raza || "Sin raza"})</span>
                    <span>Arete: {reciboVenta.animal?.chip || "S/A"}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>Peso Registrado: {reciboVenta.animal?.pesoActual || "—"} kg</span>
                    <span>Método Pago: {reciboVenta.venta.metodoPago}</span>
                  </div>
                </div>
              </div>

              {/* Montos Totales */}
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex justify-between items-center text-emerald-900 font-bold">
                <span>TOTAL CONVENIDO:</span>
                <div className="text-right">
                  <span className="text-base block">{formatUSD(reciboVenta.venta.precioVenta)}</span>
                  <span className="text-xs font-normal text-emerald-700">{formatBS(reciboVenta.venta.precioVenta * tcUsado)}</span>
                </div>
              </div>

              {/* Firmas */}
              <div className="grid grid-cols-2 gap-8 pt-8 text-center text-[10px] text-slate-400">
                <div className="border-t border-slate-300 pt-1">Firma Vendedor (Ganadero)</div>
                <div className="border-t border-slate-300 pt-1">Firma Comprador / Receptor</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
