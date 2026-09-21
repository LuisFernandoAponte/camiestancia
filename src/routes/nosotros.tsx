import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ShieldCheck, Award, Dna, Cpu, Phone, Mail, CheckCircle2, User, Sparkles } from "lucide-react";
import rancher from "@/assets/rancher.jpg";
import ranch from "@/assets/ranch-aerial.jpg";

export const Route = createFileRoute("/nosotros")({
  head: () => ({
    meta: [
      { title: "Nosotros — La Estancia Guayaba" },
      { name: "description", content: "Liderazgo ganadero de Camila Aponte Suárez y Mauricio Suárez Lorente. Innovación, genética de élite y gestión tecnológica en Santa Cruz, Bolivia." },
      { property: "og:title", content: "Nuestra Historia & Equipo — La Estancia Guayaba" },
      { property: "og:description", content: "Gestión moderna de ganado bovino de alta calidad." },
      { property: "og:image", content: rancher },
    ],
  }),
  component: Nosotros,
});

const EQUIPO_LIDERAZGO = [
  {
    nombre: "Camila Aponte Suárez",
    cargo: "Directora Ejecutiva & Gestión Ganadera (CEO)",
    descripcion: "Líder de visión estratégica, selección genética y dirección operativa de la hacienda. Impulsa la modernización del hato y la comercialización nacional.",
    icono: "👑",
    badge: "Liderazgo & Dirección",
    color: "from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-900",
  },
  {
    nombre: "Mauricio Suárez Lorente",
    cargo: "Director General & Zootecnista (COO)",
    descripcion: "Experto zootécnico en manejo de potreros, sanidad animal y programas de mejoramiento genético IATF en el trópico boliviano.",
    icono: "🤠",
    badge: "Manejo & Zootecnia",
    color: "from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-900",
  },
  {
    nombre: "Carolina Aponte Lino",
    cargo: "Directora de Administración & Finanzas (CFO)",
    descripcion: "Supervisora principal del control financiero, compras e insumos veterinarios, garantizando el equilibrio contable y la eficiencia operativa.",
    icono: "👩‍💼",
    badge: "Administración & Finanzas",
    color: "from-blue-500/20 to-indigo-500/10 border-blue-500/30 text-blue-900",
  },
  {
    nombre: "Luis Fernando Aponte Barbery",
    cargo: "Soporte Técnico & Sistemas (CTO)",
    descripcion: "Ingeniero de Sistemas encargado de la infraestructura tecnológica, trazabilidad por chips RFID, software de gestión y automatizaciones.",
    icono: "💻",
    badge: "Ingeniería & Sistemas",
    color: "from-purple-500/20 to-pink-500/10 border-purple-500/30 text-purple-900",
  },
];

const PILARES = [
  {
    titulo: "Genética Élite Seleccionada",
    desc: "Cruzamientos evaluados de razas Nelore PO, Brahman, Brangus y Gyr con registros genealógicos impecables.",
    icon: Dna,
  },
  {
    titulo: "Trazabilidad Digital RFID",
    desc: "Control total mediante chips electrónicos, registrando peso, historial sanitario y genealogía en tiempo real.",
    icon: Cpu,
  },
  {
    titulo: "Bienestar & Nutrición Tropical",
    desc: "Manejo en pasturas rotativas con suplementación mineralizada adaptada a la estacionalidad del oriente.",
    icon: ShieldCheck,
  },
];

function Nosotros() {
  return (
    <SiteLayout>
      {/* Hero Section */}
      <section className="container-page pt-20 pb-12 font-sans">
        <div className="max-w-3xl space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
            <Sparkles className="size-3.5 text-emerald-600" /> Excelencia Ganadera & Tecnológica
          </span>
          <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight text-slate-900 leading-[1.08]">
            Innovación ganadera liderada por <em className="not-italic text-emerald-700 font-serif">Camila & Mauricio Suárez</em>.
          </h1>
          <p className="text-slate-600 text-base md:text-lg leading-relaxed pt-2">
            En Hacienda Guayabal Lorente combinamos la pasión por el campo, la precisión zootécnica y la ingeniería de sistemas para criar ganado bovino de estándar superior en el oriente boliviano.
          </p>
        </div>
      </section>

      {/* Imagen Destacada de la Estancia */}
      <section className="relative overflow-hidden bg-slate-900 rounded-3xl container-page my-6 max-w-6xl">
        <div className="relative h-72 sm:h-96 w-full overflow-hidden rounded-3xl">
          <img src={ranch} alt="Hacienda Guayabal Lorente vista aérea" className="size-full object-cover opacity-85" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent flex items-end p-6 sm:p-8">
            <div className="text-white space-y-1">
              <span className="text-xs uppercase tracking-widest text-emerald-400 font-bold">San Ignacio de Velasco · Santa Cruz, Bolivia</span>
              <p className="font-display text-xl sm:text-2xl font-bold">Instalaciones modernas con manejo sustentable de pastos y tecnología RFID.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pilares Institucionales */}
      <section className="container-page py-12">
        <div className="grid gap-6 md:grid-cols-3">
          {PILARES.map((p, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3 shadow-xs hover:border-emerald-300 transition">
              <div className="size-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <p.icon className="size-5" />
              </div>
              <h3 className="font-display text-lg font-bold text-slate-900">{p.titulo}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* EL EQUIPO DIRECTIVO & TÉCNICO */}
      <section className="border-t border-slate-200 bg-slate-50/50 py-16 font-sans">
        <div className="container-page space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs uppercase tracking-widest text-emerald-700 font-bold">Liderazgo & Especialistas</span>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-slate-900">Equipo Directivo de La Estancia Guayaba</h2>
            <p className="text-slate-500 text-xs sm:text-sm">
              Gestión familiar respaldada por formación técnica en zootecnia, finanzas e ingeniería de software.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {EQUIPO_LIDERAZGO.map((persona, idx) => (
              <div
                key={idx}
                className={`rounded-2xl border bg-white p-6 space-y-4 shadow-xs hover:shadow-md transition flex flex-col justify-between`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl">{persona.icono}</span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {persona.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-display text-lg font-bold text-slate-900">{persona.nombre}</h3>
                    <p className="text-xs font-semibold text-emerald-700 mt-0.5">{persona.cargo}</p>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed pt-1">
                    {persona.descripcion}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                  <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                  <span>La Estancia Guayaba</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Banner de Cierre */}
      <section className="relative py-16 bg-slate-900 text-white font-sans text-center">
        <div className="container-page max-w-3xl space-y-4">
          <h2 className="font-display text-2xl sm:text-4xl font-bold">Compromiso con el Ganadero Boliviano</h2>
          <p className="text-slate-300 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
            Ofrecemos reproductores evaluados, asesoría zootécnica y garantías sanitarias respaldadas por la familia Suárez Lorente.
          </p>
        </div>
      </section>
    </SiteLayout>
  );
}
