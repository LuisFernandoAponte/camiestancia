import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useState } from "react";
import { z } from "zod";
import { toast, Toaster } from "sonner";
import { Mail, Phone, MapPin, Send, CheckCircle2, MessageCircle, User } from "lucide-react";

export const Route = createFileRoute("/contacto")({
  head: () => ({
    meta: [
      { title: "Contacto — La Estancia Guayaba" },
      { name: "description", content: "Contacta con Camila Aponte Suárez, Mauricio Suárez Lorente, Carolina Aponte Lino y soporte técnico con Luis Fernando Aponte Barbery. Santa Cruz, Bolivia." },
      { property: "og:title", content: "Contacto — La Estancia Guayaba" },
      { property: "og:description", content: "Atención comercial, zootécnica y soporte técnico." },
    ],
  }),
  component: Contacto,
});

const schema = z.object({
  nombre: z.string().trim().min(2, "Nombre requerido").max(100),
  email: z.string().trim().email("Email inválido").max(255),
  telefono: z.string().trim().min(6, "Teléfono inválido").max(30),
  mensaje: z.string().trim().min(10, "Cuéntanos más de tu consulta").max(1000),
});

const CONTACTOS_DIRECTOS = [
  {
    nombre: "Camila Aponte Suárez",
    cargo: "Directora Ejecutiva (CEO)",
    tel: "+591 76543210",
    icono: "👑",
    area: "Ventas & Alianzas Comerciales",
  },
  {
    nombre: "Mauricio Suárez Lorente",
    cargo: "Director General & Zootecnista (COO)",
    tel: "+591 71234567",
    icono: "🤠",
    area: "Asesoría Zootécnica & Ganado",
  },
  {
    nombre: "Carolina Aponte Lino",
    cargo: "Directora de Administración (CFO)",
    tel: "+591 78912345",
    icono: "👩‍💼",
    area: "Cobros & Facturación",
  },
  {
    nombre: "Luis Fernando Aponte Barbery",
    cargo: "Soporte Técnico & Sistemas (CTO)",
    tel: "+591 77123456",
    icono: "💻",
    area: "Soporte Técnico & Trazabilidad",
  },
];

function Contacto() {
  const [form, setForm] = useState({ nombre: "", email: "", telefono: "", mensaje: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = schema.safeParse(form);
    if (!res.success) {
      const errs: Record<string, string> = {};
      res.error.issues.forEach((i) => { errs[i.path[0] as string] = i.message; });
      setErrors(errs);
      return;
    }
    setErrors({});
    toast.success("Mensaje enviado con éxito", { description: "Camila Aponte Suárez o Mauricio Suárez Lorente responderán tu mensaje a la brevedad." });
    setForm({ nombre: "", email: "", telefono: "", mensaje: "" });
  };

  return (
    <SiteLayout>
      <Toaster richColors position="top-center" />
      <section className="container-page pt-20 pb-8 font-sans">
        <span className="text-xs uppercase tracking-widest text-emerald-700 font-bold">Atención Personalizada</span>
        <h1 className="mt-2 font-display text-4xl md:text-6xl font-bold tracking-tight text-slate-900 leading-[1.08]">
          Contacto Directo con <em className="not-italic text-emerald-700 font-serif">La Estancia Guayaba</em>.
        </h1>
        <p className="mt-3 text-slate-600 text-base max-w-2xl">
          Atención comercial, visitas al campo, asesoría zootécnica y soporte técnico de sistemas.
        </p>
      </section>

      <section className="container-page pb-20 grid gap-8 lg:grid-cols-[1.2fr_1fr] font-sans">
        {/* Formulario de Mensaje */}
        <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 space-y-4 shadow-xs">
          <h2 className="font-display text-xl font-bold text-slate-900 flex items-center gap-2">
            <Mail className="size-5 text-emerald-600" /> Enviar Mensaje a la Hacienda
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700">Nombre Completo *</label>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Ej. Juan Carlos Mamani"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-emerald-500"
              />
              {errors.nombre && <p className="mt-1 text-rose-600 font-semibold">{errors.nombre}</p>}
            </div>

            <div>
              <label className="font-semibold text-slate-700">Correo Electrónico *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="juan@ejemplo.com"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-emerald-500"
              />
              {errors.email && <p className="mt-1 text-rose-600 font-semibold">{errors.email}</p>}
            </div>
          </div>

          <div className="text-xs">
            <label className="font-semibold text-slate-700">Teléfono / WhatsApp *</label>
            <input
              type="tel"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              placeholder="+591 76543210"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-emerald-500"
            />
            {errors.telefono && <p className="mt-1 text-rose-600 font-semibold">{errors.telefono}</p>}
          </div>

          <div className="text-xs">
            <label className="font-semibold text-slate-700">Mensaje o Consulta *</label>
            <textarea
              rows={4}
              value={form.mensaje}
              onChange={(e) => setForm({ ...form, mensaje: e.target.value })}
              placeholder="Consulta sobre disponibilidad de toros, vaquillas o asesoría zootécnica..."
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-emerald-500 resize-none"
            />
            {errors.mensaje && <p className="mt-1 text-rose-600 font-semibold">{errors.mensaje}</p>}
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs transition"
          >
            Enviar Consulta <Send className="size-4 text-emerald-400" />
          </button>
        </form>

        {/* Directores & Contactos Directos */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-xs">
            <h2 className="font-display text-lg font-bold text-slate-900 flex items-center gap-2 text-xs uppercase tracking-wider text-slate-500">
              Directorio de Atención Directa
            </h2>

            <div className="space-y-3">
              {CONTACTOS_DIRECTOS.map((c, i) => (
                <div key={i} className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <span>{c.icono}</span>
                      <span>{c.nombre}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">{c.cargo} · <span className="text-emerald-700 font-medium">{c.area}</span></p>
                  </div>
                  <a
                    href={`https://wa.me/${c.tel.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 bg-emerald-600 text-white px-2.5 py-1.5 rounded-lg font-bold hover:bg-emerald-700 cursor-pointer shrink-0 text-[11px]"
                  >
                    <MessageCircle className="size-3.5" /> WhatsApp
                  </a>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3 shadow-xs text-xs">
            <div className="flex items-start gap-3">
              <MapPin className="size-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 block">Ubicación del Establecimiento</span>
                <span className="text-slate-500">San Ignacio de Velasco · Santa Cruz, Bolivia</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
