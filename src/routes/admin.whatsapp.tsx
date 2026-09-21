import { createFileRoute } from "@tanstack/react-router";
import { useWhatsappMensajes, type WhatsappMensaje } from "@/hooks/useWhatsapp";
import { useBovinos } from "@/hooks/useBovinos";
import { useSalud } from "@/hooks/useSalud";
import { useConfigPublic } from "@/hooks/useConfiguracion";
import {
  MessageCircle, Send, Clock, Loader2, RefreshCw,
  ChevronDown, ChevronUp, AlertTriangle, ExternalLink,
  Plus, X, Copy, CheckCheck, Weight, MapPin, Hash, Cake,
  DollarSign, Syringe, HeartPulse, Bug, Check, Sparkles, Phone, User,
} from "lucide-react";
import { useState, useCallback, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/admin/whatsapp")({
  component: WhatsAppPanel,
});

const PRIORIDAD: Record<string, { label: string; color: string; badgeBg: string }> = {
  urgente: { label: "Urgente 🚨", color: "text-rose-700 border-rose-300", badgeBg: "bg-rose-50" },
  alta: { label: "Alta ⚠️", color: "text-amber-700 border-amber-300", badgeBg: "bg-amber-50" },
  media: { label: "Media 📋", color: "text-blue-700 border-blue-300", badgeBg: "bg-blue-50" },
  baja: { label: "Baja ⚪", color: "text-slate-700 border-slate-300", badgeBg: "bg-slate-50" },
};

function fFecha(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" });
}

function edadDesde(fecha: string): string {
  if (!fecha) return "—";
  const nac = new Date(fecha);
  const hoy = new Date();
  if (isNaN(nac.getTime())) return "—";
  let años = hoy.getFullYear() - nac.getFullYear();
  let meses = hoy.getMonth() - nac.getMonth();
  if (meses < 0) { años--; meses += 12; }
  if (años > 0) return `${años}a ${meses}m`;
  return `${meses}m`;
}

function formatPeso(n: number | null | undefined): string {
  if (n == null || n === 0) return "—";
  return `${n.toFixed(1)} kg`;
}

function StatCard({ label, value, icon, accent }: { label: string; value: string | number; icon: string; accent?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-1 shadow-xs">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span className="font-semibold">{label}</span>
        <span className="text-base">{icon}</span>
      </div>
      <p className={`font-display text-xl font-bold ${accent || "text-slate-900"}`}>{value}</p>
    </div>
  );
}

const TEMPLATES = [
  {
    label: "Recordatorio de pago de venta",
    msg: "📋 *RECORDATORIO DE PAGO - HACIENDA GUAYABAL*\n\nEstimado/a [cliente], le recordamos que tiene un saldo pendiente de la venta realizada.\n\n🐄 Animal: [nombre] · [chip]\n💰 Precio Convenido: $[precio]\n📅 Fecha límite: [fecha]\n\nPuede realizar la transferencia o consulta de cuenta respondiendo este mensaje.\n\n¡Muchas gracias!",
    vars: ["cliente", "nombre", "chip", "precio", "fecha"],
  },
  {
    label: "Consulta de ganado disponible",
    msg: "🐄 *OFERTA GANADERA - HACIENDA GUAYABAL*\n\nBuenas tardes, le compartimos la ficha del bovino disponible en la propiedad:\n\n• Animal: [nombre] (Arete: [chip])\n• Raza: [raza] · Sexo: [sexo]\n• Peso Actual: [peso]\n• Ubicación: Potrero [potrero]\n• Precio Sugerido: $[precio]\n\n¿Desea agendar una inspección en la finca?",
    vars: ["nombre", "chip", "raza", "sexo", "peso", "potrero", "precio"],
  },
  {
    label: "Aviso de vacuna / sanidad",
    msg: "💉 *AVISO DE VACUNACIÓN / TRATAMIENTO*\n\nSe programa atención sanitaria para el bovino [nombre] ([chip]):\n\n• Protocolo: [tipo_salud]\n• Fecha Programada: [fecha_prox]\n• Veterinario a cargo: [veterinario]\n• Ubicación: [potrero]\n\nFavor alistar insumos y manga de manejo.",
    vars: ["nombre", "chip", "tipo_salud", "fecha_prox", "veterinario", "potrero"],
  },
  {
    label: "Aviso de parto inminente",
    msg: "🚨 *AVISO DE PARTO INMINENTE*\n\nLa vaca [nombre] ([chip]) registra fecha de parto inminente.\n\n• Raza: [raza] · Edad: [edad]\n• Ubicación actual: [potrero]\n• Fecha Estimada Parto: [fecha_prox]\n\nFavor monitorear el potrero de maternidad.",
    vars: ["nombre", "chip", "raza", "edad", "potrero", "fecha_prox"],
  },
];

function buildAnimalVars(animal: any, saludEvents: any[]): Record<string, string> {
  const hoy = new Date();
  const fechaStr = hoy.toLocaleDateString("es-BO", { day: "2-digit", month: "long", year: "numeric" });

  const nextVacuna = saludEvents.find((e: any) => e.tipo === "vacuna" && e.estado === "pendiente");
  const nextChequeo = saludEvents.find((e: any) => e.tipo === "chequeo" && e.estado === "pendiente");

  return {
    cliente: "[Nombre Cliente]",
    nombre: animal?.nombre || "[nombre]",
    chip: animal?.chip || "[chip]",
    peso: animal?.pesoActual ? formatPeso(animal.pesoActual) : "[peso]",
    raza: animal?.raza || "[raza]",
    potrero: animal?.potrero || "[potrero]",
    edad: animal?.nacimiento ? edadDesde(animal.nacimiento) : "[edad]",
    precio: animal?.precio ? `$${animal.precio.toFixed(2)}` : "[precio]",
    sexo: animal?.sexo || "[sexo]",
    fecha: fechaStr,
    fecha_prox: nextChequeo?.proxima_fecha
      ? fFecha(nextChequeo.proxima_fecha)
      : nextVacuna?.proxima_fecha
        ? fFecha(nextVacuna.proxima_fecha)
        : "[fecha_prox]",
    veterinario: nextChequeo?.veterinario || nextVacuna?.veterinario || "Dr. Zootecnista",
    tipo_salud: nextChequeo ? "Chequeo Preventivo" : nextVacuna ? "Vacunación" : "Manejo Sanitario",
  };
}

function renderMensaje(template: string, vars: Record<string, string>): string {
  let msg = template;
  for (const [key, value] of Object.entries(vars)) {
    msg = msg.replace(new RegExp(`\\[${key}\\]`, "g"), value);
  }
  return msg;
}

function WhatsAppPanel() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useWhatsappMensajes();
  const { data: bovinosData } = useBovinos(1, 500);
  const { data: saludData } = useSalud(1, 500);
  const { data: publicConfig } = useConfigPublic();

  const [activeTab, setActiveTab] = useState<"alertas" | "redactor">("alertas");
  const [openId, setOpenId] = useState<string | null>(null);

  const [destinatarioTel, setDestinatarioTel] = useState("591");
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(0);
  const [customAnimalId, setCustomAnimalId] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (publicConfig?.whatsapp_phone && destinatarioTel === "591") {
      const clean = publicConfig.whatsapp_phone.replace(/^(\+?591)?/, "");
      setDestinatarioTel(`591${clean}`);
    }
  }, [publicConfig, destinatarioTel]);

  const bovinos = bovinosData?.data || [];
  const saludEvents: any[] = saludData?.data && Array.isArray(saludData.data) ? saludData.data : [];
  const mensajes = data?.mensajes || [];
  const stats = data?.stats;

  const animalSel = bovinos.find((b) => b.id === customAnimalId);
  const animalSalud = useMemo(
    () => saludEvents.filter((e: any) => e.animal_id === customAnimalId),
    [saludEvents, customAnimalId],
  );
  const animalVars = useMemo(
    () => buildAnimalVars(animalSel, animalSalud),
    [animalSel, animalSalud],
  );

  const mensajeRedactado = useMemo(
    () => renderMensaje(TEMPLATES[selectedTemplateIndex].msg, animalVars),
    [selectedTemplateIndex, animalVars],
  );

  const waRedactorLink = destinatarioTel && mensajeRedactado
    ? `https://wa.me/${destinatarioTel.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(mensajeRedactado)}`
    : null;

  const refrescar = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["whatsapp", "mensajes"] });
  }, [queryClient]);

  const handleCopy = () => {
    navigator.clipboard.writeText(mensajeRedactado);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-6xl mx-auto font-sans text-slate-900 antialiased">
      {/* Header Responsivo */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Despachador de Alertas WhatsApp</h1>
          <p className="text-slate-500 text-xs sm:text-sm">
            Envío de avisos de parto, recordatorios de cobro y alertas sanitarias en 1 clic
          </p>
        </div>

        <button
          onClick={refrescar}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50 cursor-pointer shadow-xs"
        >
          <RefreshCw className="size-3.5 text-emerald-600" /> Actualizar
        </button>
      </div>

      {/* Stats Bar */}
      {stats && !isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Alertas Totales" value={stats.total} icon="💬" />
          <StatCard label="Urgentes" value={stats.urgentes} icon="🚨" accent="text-rose-600" />
          <StatCard label="Alta Prioridad" value={stats.altas} icon="⚠️" accent="text-amber-600" />
          <StatCard label="Recordatorios" value={stats.medias} icon="📋" accent="text-blue-600" />
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab("alertas")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition cursor-pointer ${
            activeTab === "alertas" ? "border-emerald-600 text-emerald-600" : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <MessageCircle className="size-4" /> Alertas Automáticas ({mensajes.length})
        </button>

        <button
          onClick={() => setActiveTab("redactor")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition cursor-pointer ${
            activeTab === "redactor" ? "border-emerald-600 text-emerald-600" : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Sparkles className="size-4 text-purple-600" /> Redactor Rápido con Plantillas
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-emerald-600" />
        </div>
      ) : (
        <>
          {/* PESTAÑA 1: ALERTAS AUTOMÁTICAS */}
          {activeTab === "alertas" && (
            <div className="space-y-4">
              <div className="grid gap-3">
                {mensajes.map((m) => {
                  const p = PRIORIDAD[m.prioridad] || PRIORIDAD.media;
                  const isOpen = openId === m.id;
                  const waLink = `https://wa.me/${m.telefono.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(m.mensaje)}`;

                  return (
                    <div key={m.id} className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs space-y-3 p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap text-xs">
                            <span className="text-base">{m.icono}</span>
                            <span className={`px-2 py-0.5 rounded-full font-bold border text-[10px] ${p.color} ${p.badgeBg}`}>
                              {p.label}
                            </span>
                            <span className="font-bold text-slate-900">{m.tipo}</span>
                            <span className="text-slate-400">· {m.animal} ({m.chip})</span>
                          </div>
                          <p className="text-xs font-bold text-slate-800 pt-1">{m.mensajeCorto}</p>
                          <p className="text-[11px] text-slate-500">{m.contexto} · Destinatario: {m.destinatario} (+{m.telefono})</p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => setOpenId(isOpen ? null : m.id)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer rounded-lg hover:bg-slate-100"
                            title="Ver mensaje completo"
                          >
                            {isOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                          </button>

                          <a
                            href={waLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-bold shadow-xs cursor-pointer transition"
                          >
                            <Send className="size-3.5" /> Enviar por WhatsApp
                          </a>
                        </div>
                      </div>

                      {isOpen && (
                        <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 font-mono text-[11px] text-slate-800 whitespace-pre-wrap">
                            {m.mensaje}
                          </div>
                          <div className="text-[11px] text-emerald-800 font-semibold flex items-center gap-1.5">
                            <Check className="size-3.5 text-emerald-600" /> Acción recomendada: {m.accion}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {mensajes.length === 0 && (
                  <div className="p-8 text-center rounded-2xl border border-slate-200 bg-white text-slate-400 text-xs">
                    No hay alertas urgentes pendientes de envío por WhatsApp.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PESTAÑA 2: REDACTOR RÁPIDO */}
          {activeTab === "redactor" && (
            <div className="grid md:grid-cols-12 gap-6 items-start">
              {/* Controles de Selección */}
              <div className="md:col-span-6 rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs text-xs">
                <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Sparkles className="size-4 text-purple-600" /> 1. Configurar Recordatorio
                </h2>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Seleccionar Plantilla de Mensaje</label>
                  <select
                    value={selectedTemplateIndex}
                    onChange={(e) => setSelectedTemplateIndex(parseInt(e.target.value))}
                    className="w-full h-9 rounded-xl border border-slate-200 px-3 font-semibold bg-white outline-none focus:border-emerald-500"
                  >
                    {TEMPLATES.map((t, idx) => (
                      <option key={idx} value={idx}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Seleccionar Bovino del Hato</label>
                  <select
                    value={customAnimalId}
                    onChange={(e) => setCustomAnimalId(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-200 px-3 bg-white outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Ninguno (Usar variables por defecto) --</option>
                    {bovinos.map((b) => (
                      <option key={b.id} value={b.id}>{b.nombre} · Arete: {b.chip} ({b.raza})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Teléfono WhatsApp Destino</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <input
                      value={destinatarioTel}
                      onChange={(e) => setDestinatarioTel(e.target.value)}
                      placeholder="Ej. 59176543210"
                      className="w-full h-9 rounded-xl border border-slate-200 pl-9 pr-3 outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Vista Previa del Mensaje y Envío */}
              <div className="md:col-span-6 rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs text-xs">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-slate-900 text-sm">2. Vista Previa del Mensaje</h2>
                  <button onClick={handleCopy} className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 cursor-pointer">
                    {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                    {copied ? "Copiado" : "Copiar Texto"}
                  </button>
                </div>

                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200/60 font-sans text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {mensajeRedactado}
                </div>

                {waRedactorLink ? (
                  <a
                    href={waRedactorLink}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs transition"
                  >
                    <Send className="size-4" /> Abrir WhatsApp y Enviar
                  </a>
                ) : (
                  <button disabled className="w-full rounded-xl bg-slate-200 text-slate-400 font-bold py-3 text-xs flex items-center justify-center gap-2">
                    Ingresá un número de teléfono válido
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}