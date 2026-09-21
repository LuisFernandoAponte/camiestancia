import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useMemo, useState, useEffect } from "react";
import { Search, Loader2, Sparkles, Filter, MessageCircle, Scale, Tag, ExternalLink, X } from "lucide-react";
import bullPortrait from "@/assets/bull-portrait.jpg";
import calvesImg from "@/assets/calves.jpg";

import { API_BASE_URL as API_BASE } from "@/lib/api.js";

interface CatalogoBovino {
  id: string;
  chip: string;
  nombre: string;
  raza: string;
  sexo: string;
  tipo?: string;
  pesoActual: number;
  potrero: string;
  estado: string;
  precio: number | null;
  foto?: string | null;
  fotoUrl?: string | null;
}

export const Route = createFileRoute("/catalogo")({
  head: () => ({
    meta: [
      { title: "Catálogo de Ganado — La Estancia Guayaba" },
      { name: "description", content: "Toros reproductores PO y Vaquillas disponibles para venta con trazabilidad y genética evaluada. Santa Cruz, Bolivia." },
      { property: "og:title", content: "Catálogo de Ganado Disponibles" },
    ],
  }),
  component: Catalogo,
});

function fotoPorDefecto(bovino: CatalogoBovino) {
  if (bovino.foto) return bovino.foto;
  if (bovino.fotoUrl) return bovino.fotoUrl;
  return bovino.sexo === "Macho" || bovino.tipo === "toro" ? bullPortrait : calvesImg;
}

function Catalogo() {
  const [q, setQ] = useState("");
  const [razaFilter, setRazaFilter] = useState<string>("todas");
  const [tipoFilter, setTipoFilter] = useState<string>("todos");
  const [bovinos, setBovinos] = useState<CatalogoBovino[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; title: string; animal: CatalogoBovino } | null>(null);

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch(`${API_BASE}/api/catalogo`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setBovinos(json.data);
        } else {
          setError("Error al cargar el catálogo de ganado");
        }
      })
      .catch(() => setError("No se pudo conectar con el servidor"))
      .finally(() => setLoading(false));
  }, []);

  const razasDisponibles = useMemo(() => Array.from(new Set(bovinos.map((b) => b.raza).filter(Boolean))), [bovinos]);

  const filtrados = useMemo(() => {
    return bovinos.filter((b) => {
      if (razaFilter !== "todas" && b.raza !== razaFilter) return false;
      if (tipoFilter !== "todos") {
        if (tipoFilter === "toros" && b.sexo !== "Macho" && b.tipo !== "toro") return false;
        if (tipoFilter === "vaquillas" && (b.sexo !== "Hembra" || b.tipo === "toro")) return false;
      }
      if (q && !`${b.nombre} ${b.chip} ${b.raza} ${b.potrero}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [q, razaFilter, tipoFilter, bovinos]);

  const abrirWhatsApp = (bovino: CatalogoBovino) => {
    const texto = `Hola, me interesa obtener más información sobre el ejemplar ${bovino.nombre || "Bovino"} (Chip: ${bovino.chip}, Raza: ${bovino.raza}, Peso: ${bovino.pesoActual}kg) disponible en La Estancia Guayaba.`;
    const url = `https://wa.me/59176543210?text=${encodeURIComponent(texto)}`;
    window.open(url, "_blank");
  };

  return (
    <SiteLayout>
      <section className="container-page pt-20 pb-8 font-sans space-y-6">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
            <Sparkles className="size-3.5 text-emerald-600" /> Catálogo en Tiempo Real desde Inventario
          </span>
          <h1 className="mt-3 font-display text-4xl md:text-6xl font-bold tracking-tight text-slate-900 leading-[1.08]">
            Ganado Bovino <em className="not-italic text-emerald-700 font-serif">Disponible para Venta</em>
          </h1>
          <p className="mt-2 text-slate-600 text-sm md:text-base max-w-2xl">
            Toros reproductores PO evaluados andrológicamente, vaquillas de reposición y matrices registradas. Consulta directa por WhatsApp con ficha técnica y peso real.
          </p>
        </div>

        {/* Buscador & Barra de Filtros */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            {/* Buscador */}
            <div className="sm:col-span-6 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por nombre, chip RFID o potrero..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs outline-none focus:border-emerald-500 focus:bg-white"
              />
            </div>

            {/* Filtro por Categoría / Tipo */}
            <div className="sm:col-span-3">
              <select
                value={tipoFilter}
                onChange={(e) => setTipoFilter(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500"
              >
                <option value="todos">🐂 Categoría: Todos los Ejemplares</option>
                <option value="toros">🐂 Solo Toros / Machos</option>
                <option value="vaquillas">🐄 Solo Vaquillas / Hembras</option>
              </select>
            </div>

            {/* Filtro por Raza */}
            <div className="sm:col-span-3">
              <select
                value={razaFilter}
                onChange={(e) => setRazaFilter(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500"
              >
                <option value="todas">🧬 Raza: Todas las Razas</option>
                {razasDisponibles.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Estado de Carga */}
        {loading && (
          <div className="py-20 text-center space-y-3">
            <Loader2 className="size-8 text-emerald-600 animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-semibold">Cargando ejemplares disponibles desde la base de datos...</p>
          </div>
        )}

        {/* Estado de Error */}
        {error && !loading && (
          <div className="py-12 text-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-800 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Grilla de Animales Disponibles */}
        {!loading && !error && (
          <>
            {filtrados.length === 0 ? (
              <div className="py-16 text-center rounded-2xl border border-slate-200 bg-white p-8 space-y-2">
                <p className="font-display text-lg font-bold text-slate-900">No se encontraron ejemplares con los filtros seleccionados</p>
                <p className="text-xs text-slate-500">Prueba cambiando la búsqueda o seleccionando "Todas las Razas".</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtrados.map((bovino) => {
                  const fotoSrc = fotoPorDefecto(bovino);
                  const esToro = bovino.sexo === "Macho" || bovino.tipo === "toro";

                  return (
                    <div
                      key={bovino.id}
                      className="group rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between"
                    >
                      <div>
                        {/* Foto con zoom al presionar */}
                        <div className="relative aspect-[4/3] bg-slate-900 overflow-hidden cursor-pointer">
                          <img
                            src={fotoSrc}
                            alt={bovino.nombre || bovino.chip}
                            className="size-full object-cover group-hover:scale-105 transition duration-300"
                            onClick={() => setSelectedPhoto({ url: fotoSrc, title: bovino.nombre || bovino.chip, animal: bovino })}
                          />
                          <div className="absolute top-3 left-3 flex gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-900/80 text-white backdrop-blur-md border border-white/20">
                              {bovino.chip}
                            </span>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full text-white backdrop-blur-md border ${esToro ? 'bg-amber-600/90 border-amber-400/30' : 'bg-emerald-600/90 border-emerald-400/30'}`}>
                              {esToro ? "Toro Reproductor" : "Vaquilla Élite"}
                            </span>
                          </div>
                        </div>

                        {/* Ficha Técnica Corta */}
                        <div className="p-5 space-y-3">
                          <div>
                            <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-700 block">
                              {bovino.raza}
                            </span>
                            <h3 className="font-display text-lg font-bold text-slate-900 leading-tight">
                              {bovino.nombre || `Ejemplar ${bovino.chip}`}
                            </h3>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                            <div className="flex items-center gap-1.5 text-slate-600">
                              <Scale className="size-3.5 text-emerald-600 shrink-0" />
                              <span>Peso: <strong className="text-slate-900">{bovino.pesoActual} kg</strong></span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-600">
                              <Tag className="size-3.5 text-emerald-600 shrink-0" />
                              <span>Potrero: <strong className="text-slate-900">{bovino.potrero || "Norte"}</strong></span>
                            </div>
                          </div>

                          {/* Precio si está definido */}
                          {bovino.precio && bovino.precio > 0 && (
                            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-between text-xs">
                              <span className="text-slate-600 font-medium">Precio de Referencia:</span>
                              <span className="font-bold text-emerald-900 text-sm">$us {bovino.precio.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Botón Acción WhatsApp Directo */}
                      <div className="p-5 pt-0">
                        <button
                          onClick={() => abrirWhatsApp(bovino)}
                          className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs transition"
                        >
                          <MessageCircle className="size-4" /> Consultar por WhatsApp
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </section>

      {/* Modal Zoom Foto HD */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-3xl w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10 space-y-4 p-4 text-white">
            <div className="flex items-center justify-between px-2">
              <h3 className="font-display font-bold text-base">{selectedPhoto.title}</h3>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="size-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-black">
              <img src={selectedPhoto.url} alt={selectedPhoto.title} className="size-full object-contain" />
            </div>
            <div className="flex justify-end px-2 pt-2">
              <button
                onClick={() => {
                  const b = selectedPhoto.animal;
                  setSelectedPhoto(null);
                  abrirWhatsApp(b);
                }}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2 text-xs flex items-center gap-2 cursor-pointer"
              >
                <MessageCircle className="size-4" /> Consultar disponibilidad de este animal
              </button>
            </div>
          </div>
        </div>
      )}
    </SiteLayout>
  );
}
