import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Sprout, Dna, Truck, ShieldCheck, Microscope, Scale } from "lucide-react";

export const Route = createFileRoute("/servicios")({
  head: () => ({
    meta: [
      { title: "Servicios — La Estancia Guayaba" },
      { name: "description", content: "Cría, mejora genética, sanidad y logística para ganaderos del oriente boliviano." },
      { property: "og:title", content: "Servicios" },
      { property: "og:description", content: "Cría, genética, sanidad y logística ganadera." },
    ],
  }),
  component: Servicios,
});

const servicios = [
  { icon: Sprout, t: "Cría y recría", d: "Pasturas tropicales rotativas, suplementación mineral y manejo de bienestar animal en todas las etapas." },
  { icon: Dna, t: "Mejora genética", d: "Programa de inseminación artificial con donantes Nelore PO y Brahman registrados, transferencia embrionaria." },
  { icon: ShieldCheck, t: "Sanidad veterinaria", d: "Calendario vacunal completo, diagnóstico clínico, control parasitario y bioseguridad." },
  { icon: Microscope, t: "Asesoría técnica", d: "Acompañamos a otros ganaderos con planes de mejora reproductiva y nutricional." },
  { icon: Truck, t: "Logística de embarque", d: "Flota propia, documentación SENASAG y entrega en frigorífico o predio del comprador." },
  { icon: Scale, t: "Venta de reproductores", d: "Vientres preñados, toretes y donantes con genealogía documentada." },
];

function Servicios() {
  return (
    <SiteLayout>
      <section className="container-page pt-20 pb-16">
        <span className="text-xs uppercase tracking-[0.3em] text-accent">Servicios</span>
        <h1 className="mt-4 font-display text-5xl md:text-7xl max-w-3xl leading-[1.05]">Todo lo que el <em className="not-italic text-accent">hato</em> necesita.</h1>
      </section>

      <section className="container-page pb-24 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {servicios.map((s) => (
          <div key={s.t} className="rounded-2xl border border-border bg-card p-8 hover:shadow-soft hover:border-accent/40 transition">
            <s.icon className="size-9 text-accent" strokeWidth={1.4} />
            <h3 className="mt-5 font-display text-2xl">{s.t}</h3>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{s.d}</p>
          </div>
        ))}
      </section>
    </SiteLayout>
  );
}
