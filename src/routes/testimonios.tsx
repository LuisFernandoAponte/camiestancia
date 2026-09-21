import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Quote, Star, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/testimonios")({
  head: () => ({
    meta: [
      { title: "Testimonios — La Estancia Guayaba" },
      { name: "description", content: "Opiniones y reconocimientos de ganaderos bolivianos a la gestión de Camila Aponte Suárez y Mauricio Suárez Lorente." },
      { property: "og:title", content: "Testimonios — La Estancia Guayaba" },
      { property: "og:description", content: "Clientes que confían en nuestra genética y reputación." },
    ],
  }),
  component: Testimonios,
});

const TESTIMONIOS_GANADEROS = [
  {
    nombre: "Don Fernando Banzer",
    cargo: "Propietario de Estancia El Retiro (San Ignacio)",
    texto: "Adquirimos reproductores Nelore PO seleccionados por Camila Aponte Suárez. Los toros mostraron una adaptabilidad excepcional al pastoreo en el monte y una tasa de preñez excelente en nuestro hato.",
    estrellas: 5,
  },
  {
    nombre: "Ing. Carlos Eduardo Roca",
    cargo: "Director de Cabaña Santa Rosa (Concepción)",
    texto: "La atención zootécnica de Mauricio Suárez Lorente y la trazabilidad digital con chip nos dan la seguridad de estar comprando genética evaluada y libre de enfermedades sanitarias.",
    estrellas: 5,
  },
  {
    nombre: "Dra. Valeria Aguilera",
    cargo: "Asesora de Nutrición & Biotecnología (Santa Cruz)",
    texto: "Trabajar con la administración de Carolina Aponte y el soporte técnico de Luis Fernando Aponte facilita todo el proceso comercial. Una gestión ganadera de altísimo nivel técnico.",
    estrellas: 5,
  },
];

function Testimonios() {
  return (
    <SiteLayout>
      <section className="container-page pt-20 pb-12 font-sans">
        <span className="text-xs uppercase tracking-widest text-emerald-700 font-bold">Confianza & Resultados</span>
        <h1 className="mt-2 font-display text-4xl md:text-6xl font-bold tracking-tight text-slate-900 leading-[1.08]">
          Reconocimiento en el <em className="not-italic text-emerald-700 font-serif">sector ganadero boliviano</em>.
        </h1>
        <p className="mt-3 text-slate-600 text-base max-w-2xl">
          Opiniones de propietarios de cabañas, estancias y asesores zootécnicos que confían en la gestión de Camila Aponte Suárez y Mauricio Suárez Lorente.
        </p>
      </section>

      <section className="container-page pb-24 grid gap-6 md:grid-cols-3 font-sans">
        {TESTIMONIOS_GANADEROS.map((t, idx) => (
          <figure key={idx} className="rounded-2xl border border-slate-200 bg-white p-8 space-y-4 shadow-xs hover:border-emerald-300 transition flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-1 text-amber-500">
                {Array.from({ length: t.estrellas }).map((_, i) => (
                  <Star key={i} className="size-4 fill-current" />
                ))}
              </div>

              <blockquote className="text-slate-700 text-xs sm:text-sm leading-relaxed font-sans italic">
                "{t.texto}"
              </blockquote>
            </div>

            <figcaption className="pt-4 border-t border-slate-100 space-y-1">
              <div className="font-display font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <span>{t.nombre}</span>
                <CheckCircle2 className="size-4 text-emerald-600" />
              </div>
              <div className="text-xs text-slate-500">{t.cargo}</div>
            </figcaption>
          </figure>
        ))}
      </section>
    </SiteLayout>
  );
}
