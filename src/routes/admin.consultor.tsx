import { createFileRoute } from "@tanstack/react-router";
import {
  useAlertasConsultor, useConsultorResumen,
  type AlertaConsultor, type Insight, type Recomendacion,
} from "@/hooks/useConsultor";
import {
  Loader2, ShieldAlert, RefreshCw, X, Clock,
  ChevronDown, ChevronUp, BrainCircuit,
  TrendingUp, AlertCircle, CheckCircle2, Lightbulb,
  MessageSquare, Send, Sparkles, HelpCircle, FileText, Check,
} from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/admin/consultor")({
  component: Consultor,
});

const PRIORIDAD_CONFIG = {
  alta: {
    icon: ShieldAlert, color: "text-rose-600", bg: "bg-rose-50",
    border: "border-rose-200", badge: "Alta Prioridad",
  },
  media: {
    icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50",
    border: "border-amber-200", badge: "Monitoreo",
  },
  baja: {
    icon: TrendingUp, color: "text-slate-600", bg: "bg-slate-50",
    border: "border-slate-200", badge: "Informativo",
  },
} as const;

const CATEGORIA_ICON: Record<string, string> = {
  salud: "💉", reproduccion: "🧬", nutricion: "🌾", clima: "🌤️", comercial: "💰",
};

const INSIGHT_STYLES: Record<string, { border: string; bg: string; dot: string }> = {
  alerta: { border: "border-rose-200", bg: "bg-rose-50/50", dot: "bg-rose-500" },
  positivo: { border: "border-emerald-200", bg: "bg-emerald-50/50", dot: "bg-emerald-500" },
  info: { border: "border-blue-200", bg: "bg-blue-50/50", dot: "bg-blue-500" },
  recomendacion: { border: "border-amber-200", bg: "bg-amber-50/50", dot: "bg-amber-500" },
};

const PREGUNTAS_RAPIDAS = [
  { text: "¿Cuándo debo vacunar contra la Aftosa y Carbunclo?", tag: "Salud 💉" },
  { text: "¿Cuáles son las vacas en momento óptimo para IATF?", tag: "Reproducción 🧬" },
  { text: "¿Qué mezcla de sal mineral usar en época de sequía?", tag: "Nutrición 🌾" },
  { text: "¿Cuándo debo secar a las vacas preñadas?", tag: "Manejo 🐮" },
];

const RESPUESTAS_BASE: Record<string, string> = {
  aftosa: "📌 **Calendario de Vacunación SENASAG**: En el trópico boliviano (Santa Cruz / Beni), los ciclos oficiales del SENASAG se realizan habitualmente en mayo-junio y octubre-noviembre. Se debe aplicar vacuna antiaftosa inactivada a todo el hato y cepa 19 / RB51 a las terneras hembras de 3 a 8 meses contra la Brucelosis.",
  iatf: "📌 **Criterios de Sincronización IATF**: Se recomienda seleccionar hembras vacías con Condición Corporal ≥ 3.0 (escala 1 a 5), al menos 45-60 días postparto. El protocolo estándar dura 9-10 días con dispositivo de Progesterona + Benzoato de Estradiol en día 0.",
  sequia: "📌 **Suplementación en Época Seca**: Durante los meses secos (junio a septiembre), la oferta de proteíco en pastos cae. Se sugiere incorporar sal mineralizada al 40-50% de harina de soya/algodón con 3-5% de urea pecuaria para activar la flora ruminal.",
  secado: "📌 **Secado de Vacas Gestantes**: La vaca debe secarse obligatoriamente a los **210 días de gestación** (día 7 del mes de preñez), unos 60-70 días antes del parto estimado (283 días), para permitir la regeneración del tejido mamario y la producción de calostro de alta calidad.",
};

function StatCard({ label, value, sub, icon, accent }: {
  label: string; value: string | number; sub?: string; icon: string; accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-1 shadow-xs">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span className="font-semibold">{label}</span>
        <span className="text-base">{icon}</span>
      </div>
      <p className={`font-display text-xl font-bold ${accent || "text-slate-900"}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-500 truncate">{sub}</p>}
    </div>
  );
}

function Consultor() {
  const queryClient = useQueryClient();
  const { data: alertas, isLoading: loadingAlertas, dataUpdatedAt } = useAlertasConsultor();
  const { data: resumen, isLoading: loadingResumen } = useConsultorResumen();

  const [activeTab, setActiveTab] = useState<"alertas" | "chat" | "guias">("alertas");
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{ sender: "user" | "bot"; text: string }>>([
    {
      sender: "bot",
      text: "¡Hola! Soy tu **Consultor Zootécnico Ganadero**. Podés hacerme cualquier consulta sobre vacunación, reproducción, suplementación o manejo del hato en Hacienda Guayabal.",
    },
  ]);

  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("consultor_dismissed") || "[]")); }
    catch { return new Set<string>(); }
  });
  const [refreshing, setRefreshing] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  const visible = alertas?.filter((a) => !dismissed.has(a.mensaje_alerta)) || [];
  const stats = resumen?.stats;
  const insights = resumen?.insights || [];
  const recomendaciones = resumen?.recomendaciones || [];
  const faqs = resumen?.faq || [];

  const refrescar = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["consultor", "alertas"] }),
      queryClient.invalidateQueries({ queryKey: ["consultor", "resumen"] }),
    ]);
    setTimeout(() => setRefreshing(false), 400);
  }, [queryClient]);

  const descartar = (mensaje: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(mensaje);
      localStorage.setItem("consultor_dismissed", JSON.stringify([...next]));
      return next;
    });
  };

  const handleSendChat = (query?: string) => {
    const textToSend = query || chatInput;
    if (!textToSend.trim()) return;

    setChatHistory((prev) => [...prev, { sender: "user", text: textToSend }]);
    if (!query) setChatInput("");

    // Generar respuesta zootécnica inteligente
    setTimeout(() => {
      const lower = textToSend.toLowerCase();
      let answer = "📌 **Recomendación Técnica**: Para asegurar la máxima rentabilidad, se recomienda realizar chequeos palpatorios/ecográficos periódicos, mantener al día el registro de vacunas del SENASAG y garantizar un aporte de sales minerales equilibrado según la época del año.";

      if (lower.includes("aftosa") || lower.includes("vacun")) answer = RESPUESTAS_BASE.aftosa;
      else if (lower.includes("iatf") || lower.includes("sincroniz") || lower.includes("semen")) answer = RESPUESTAS_BASE.iatf;
      else if (lower.includes("sequia") || lower.includes("sal") || lower.includes("aliment")) answer = RESPUESTAS_BASE.sequia;
      else if (lower.includes("sec") || lower.includes("leche") || lower.includes("par")) answer = RESPUESTAS_BASE.secado;

      setChatHistory((prev) => [...prev, { sender: "bot", text: answer }]);
    }, 500);
  };

  const loading = loadingAlertas || loadingResumen;
  const ultimaActualizacion = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-6xl mx-auto font-sans text-slate-900 antialiased">
      {/* Header Responsivo */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Consultor Zootécnico & Asesor Ganadero</h1>
          <p className="text-slate-500 text-xs sm:text-sm">
            Diagnóstico inteligente del hato, alertas sanitarias y guía técnica para el trópico
          </p>
        </div>

        <div className="flex items-center gap-2">
          {ultimaActualizacion && (
            <span className="text-xs text-slate-400 hidden sm:flex items-center gap-1">
              <Clock className="size-3" /> {ultimaActualizacion.toLocaleTimeString("es-BO")}
            </span>
          )}
          <button
            onClick={refrescar}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50 cursor-pointer shadow-xs"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} /> Actualizar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto scrollbar-none no-scrollbar pb-0.5">
        <button
          onClick={() => setActiveTab("alertas")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === "alertas" ? "border-emerald-600 text-emerald-600" : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <ShieldAlert className="size-4" /> Alertas & Diagnósticos ({visible.length})
        </button>

        <button
          onClick={() => setActiveTab("chat")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === "chat" ? "border-emerald-600 text-emerald-600" : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <BrainCircuit className="size-4 text-purple-600" /> Asistente Zootécnico IA
        </button>

        <button
          onClick={() => setActiveTab("guias")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === "guias" ? "border-emerald-600 text-emerald-600" : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Lightbulb className="size-4 text-amber-600" /> Guías & Protocolos
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-emerald-600" />
        </div>
      ) : (
        <>
          {/* PESTAÑA 1: ALERTAS Y KPIs */}
          {activeTab === "alertas" && (
            <div className="space-y-6">
              {/* Tarjetas de Estadísticas Principales */}
              {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard label="Total Bovinos" value={stats.totalBovinos} icon="🐄" sub={`${stats.totalMachos} Machos · ${stats.totalHembras} Hembras`} />
                  <StatCard label="Tasa de Preñez" value={`${stats.tasaPreñez}%`} icon="🐮" sub={`${stats.hembrasGestantes} vacas preñadas`} accent={stats.tasaPreñez >= 60 ? "text-emerald-600" : "text-amber-600"} />
                  <StatCard label="Próximos Partos (30d)" value={stats.proximosPartos30d} icon="👶" sub="Atención prioritaria maternidad" />
                  <StatCard label="Vacunas Próximas (7d)" value={stats.vacunasProximas7d} icon="💉" sub="Sanidad de hato al día" accent={stats.vacunasProximas7d > 0 ? "text-rose-600" : "text-slate-900"} />
                </div>
              )}

              {/* Lista de Alertas de Gestión */}
              <div className="space-y-3">
                <h2 className="font-display text-lg font-bold text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="size-5 text-rose-600" /> Alertas Operativas del Hato
                </h2>

                <div className="grid gap-3">
                  {visible.map((a: any, i) => {
                    const cfg = (PRIORIDAD_CONFIG as Record<string, any>)[a.prioridad] || PRIORIDAD_CONFIG.baja;
                    const Icon = cfg.icon;
                    return (
                      <div key={i} className={`p-4 rounded-2xl border ${cfg.border} ${cfg.bg} flex items-start justify-between gap-4 shadow-xs`}>
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="text-xl shrink-0 mt-0.5">{CATEGORIA_ICON[a.categoria] || "📋"}</span>
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${cfg.color} bg-white border border-current`}>
                                {cfg.badge}
                              </span>
                              <h3 className="font-bold text-slate-900 text-xs sm:text-sm">{a.mensaje_alerta || a.mensaje}</h3>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed">{a.recomendacion || a.accion_recomendada || "Realizar seguimiento preventivo."}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => descartar(a.mensaje_alerta || a.mensaje)}
                          className="text-slate-400 hover:text-slate-700 cursor-pointer p-1 shrink-0"
                          title="Descartar alerta"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    );
                  })}

                  {visible.length === 0 && (
                    <div className="p-8 text-center rounded-2xl border border-slate-200 bg-white text-slate-500 text-xs space-y-1">
                      <CheckCircle2 className="size-8 text-emerald-500 mx-auto" />
                      <p className="font-bold text-slate-900 text-sm">¡El hato no presenta alertas críticas!</p>
                      <p>Todos los controles sanitarios y reproductivos están al día.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PESTAÑA 2: CHAT ZOOTÉCNICO IA */}
          {activeTab === "chat" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-5 text-purple-600" />
                  <div>
                    <h2 className="font-bold text-slate-900 text-sm">Asistente Zootécnico Inteligente</h2>
                    <p className="text-xs text-slate-500">Respuestas rápidas para el manejo ganadero en el trópico</p>
                  </div>
                </div>
              </div>

              {/* Botones de Preguntas Rápidas */}
              <div className="flex flex-wrap gap-2 pt-1">
                {PREGUNTAS_RAPIDAS.map((pr, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendChat(pr.text)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 text-xs font-semibold text-slate-700 hover:text-emerald-800 transition cursor-pointer"
                  >
                    {pr.text}
                  </button>
                ))}
              </div>

              {/* Mensajes del Chat */}
              <div className="min-h-[300px] max-h-[450px] overflow-y-auto space-y-3 p-3 bg-slate-50/50 rounded-xl border border-slate-100 text-xs">
                {chatHistory.map((m, idx) => (
                  <div key={idx} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] p-3.5 rounded-2xl space-y-1 ${
                      m.sender === "user" ? "bg-slate-900 text-white rounded-br-none" : "bg-white border border-slate-200 text-slate-800 shadow-xs rounded-bl-none"
                    }`}>
                      <p className="whitespace-pre-line leading-relaxed">{m.text}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Formulario de Entrada */}
              <form onSubmit={(e) => { e.preventDefault(); handleSendChat(); }} className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Escribí una consulta sobre vacunas, alimento, IATF..."
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-xs outline-none focus:border-emerald-500"
                />
                <button type="submit" className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition">
                  <Send className="size-4" /> Enviar
                </button>
              </form>
            </div>
          )}

          {/* PESTAÑA 3: GUÍAS & PREGUNTAS FRECUENTES */}
          {activeTab === "guias" && (
            <div className="space-y-4">
              <h2 className="font-display text-lg font-bold text-slate-900">Guías Técnicas & Preguntas Frecuentes</h2>
              <div className="space-y-2">
                {faqs.map((faq: any, i: number) => {
                  const isOpen = faqOpen === i;
                  return (
                    <div key={i} className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                      <button
                        onClick={() => setFaqOpen(isOpen ? null : i)}
                        className="w-full flex items-center justify-between p-4 text-left font-bold text-xs sm:text-sm text-slate-900 hover:bg-slate-50 transition cursor-pointer"
                      >
                        <span>{faq.pregunta}</span>
                        {isOpen ? <ChevronUp className="size-4 text-slate-400" /> : <ChevronDown className="size-4 text-slate-400" />}
                      </button>
                      {isOpen && (
                        <div className="p-4 pt-0 text-xs text-slate-600 border-t border-slate-100 leading-relaxed bg-slate-50/50">
                          {faq.respuesta}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
