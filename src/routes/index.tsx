import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ArrowRight, Dna, Truck, Sprout, ShieldCheck, Sparkles, CheckCircle2, Phone, Star, User } from "lucide-react";
import hero from "@/assets/hero-cattle.jpg";
import bull from "@/assets/bull-portrait.jpg";
import ranch from "@/assets/ranch-aerial.jpg";
import rancher from "@/assets/rancher.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hacienda Guayabal Lorente — Ganado Bovino de Élite en Santa Cruz, Bolivia" },
      { name: "description", content: "Liderazgo de Camila Aponte Suárez y Mauricio Suárez Lorente. Cría, mejora genética Nelore PO, Brahman, Brangus y trazabilidad digital en Bolivia." },
      { property: "og:title", content: "Hacienda Guayabal Lorente" },
      { property: "og:description", content: "Ganado bovino premium del oriente boliviano." },
      { property: "og:image", content: hero },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <SiteLayout>
      {/* Hero Section Modernizado */}
      <section className="relative min-h-[85vh] sm:min-h-[90vh] w-full overflow-hidden flex items-center bg-slate-950 font-sans">
        <img src={hero} alt="Ganado Nelore pastando al amanecer" className="absolute inset-0 size-full object-cover opacity-45" width={1920} height={1080} fetchPriority="high" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-950/80" />

        <div className="container-page relative z-10 py-20 space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-4 py-1.5 text-xs font-bold text-emerald-300 border border-emerald-500/30 backdrop-blur-md animate-fade-up">
            <Sparkles className="size-3.5 text-emerald-400" /> Dirección: Camila Aponte Suárez & Mauricio Suárez Lorente
          </div>

          <h1 className="max-w-4xl font-display text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white leading-[1.05] animate-fade-up" style={{ animationDelay: "0.1s" }}>
            Liderazgo ganadero con <em className="text-emerald-400 not-italic font-serif">genética de vanguardia</em>.
          </h1>

          <p className="max-w-2xl text-slate-300 text-base sm:text-lg leading-relaxed animate-fade-up" style={{ animationDelay: "0.2s" }}>
            Reproductores Nelore PO, Brahman, Brangus y Gyr Lechero evaluados andrológicamente con trazabilidad digital por chip RFID y garantía sanitaria oficial.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2 animate-fade-up" style={{ animationDelay: "0.3s" }}>
            <Link to="/catalogo" className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 px-6 py-3.5 text-xs sm:text-sm font-bold text-white shadow-lg transition cursor-pointer">
              Ver Catálogo de Reproductores <ArrowRight className="size-4" />
            </Link>
            <Link to="/contacto" className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md px-6 py-3.5 text-xs sm:text-sm font-bold text-white hover:bg-white/20 transition cursor-pointer">
              Contactar con la Hacienda
            </Link>
          </div>
        </div>
      </section>

      {/* Cifras de Impacto */}
      <section className="border-y border-slate-200 bg-white font-sans">
        <div className="container-page grid grid-cols-2 md:grid-cols-4 gap-6 py-10">
          {[
            { k: "100%", l: "Trazabilidad RFID" },
            { k: "2,400", l: "Hectáreas en Pastoreo" },
            { k: "1,800+", l: "Cabezas en Registro" },
            { k: "Nelore PO", l: "Genética Evaluada" },
          ].map((s, i) => (
            <div key={i} className="text-center space-y-1">
              <div className="font-display text-3xl sm:text-4xl font-bold text-slate-900">{s.k}</div>
              <div className="text-xs uppercase tracking-wider font-semibold text-emerald-700">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pilares de la Hacienda */}
      <section className="container-page py-20 font-sans space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <span className="text-xs uppercase tracking-widest text-emerald-700 font-bold">Manejo Técnico Integrado</span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 mt-1">Cuatro Pilares de Excelencia</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md">
            Compromiso de innovación ganadera, bienestar animal y desarrollo biotecnológico en el trópico boliviano.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Sprout, t: "Cría & Pastoreo", d: "Manejo rotativo en pasturas de Brachiaria y Panicum con suplementación de sal mineralizada." },
            { icon: Dna, t: "Genética & IATF", d: "Sincronización de celo y pajuelas de toros reproductores evaluados andrológicamente." },
            { icon: ShieldCheck, t: "Sanidad Oficial", d: "Calendario de vacunas estricto bajo normas oficiales del SENASAG en el trópico." },
            { icon: Truck, t: "Entrega Garantizada", d: "Embarque en camiones jaula acondicionados con guías de transporte al día." },
          ].map((s, i) => (
            <div key={i} className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:shadow-md hover:border-emerald-300 space-y-3">
              <div className="size-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <s.icon className="size-5" />
              </div>
              <h3 className="font-display text-lg font-bold text-slate-900">{s.t}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Presentación de Liderazgo (Camila & Mauricio) */}
      <section className="container-page pb-20 font-sans">
        <div className="rounded-3xl border border-slate-200 bg-slate-900 text-white p-8 sm:p-12 grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <span className="text-xs uppercase tracking-widest text-emerald-400 font-bold">Dirección Operativa</span>
            <h2 className="font-display text-3xl sm:text-5xl font-bold leading-tight">
              Camila Aponte Suárez & Mauricio Suárez Lorente
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              "Nuestra misión en La Estancia Guayaba es proveer al ganadero boliviano de reproductores con respaldo genético real, sanidad garantizada y métricas transparentes en peso y adaptabilidad tropical."
            </p>
            <div className="pt-2 flex flex-wrap gap-4 text-xs font-semibold text-emerald-300">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-emerald-400" /> Selección PO Registrada</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-emerald-400" /> Trazabilidad Digital RFID</span>
            </div>
            <div className="pt-4">
              <Link to="/nosotros" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white transition cursor-pointer">
                Conocer al Equipo Directivo <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5 relative aspect-[4/3] rounded-2xl overflow-hidden shadow-lg border border-white/10">
            <img src={bull} alt="Toro Nelore PO de Hacienda Guayabal" className="size-full object-cover" />
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
