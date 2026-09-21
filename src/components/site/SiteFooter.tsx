import { Link } from "@tanstack/react-router";
import { Mail, Phone, MapPin, Lock } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-20 bg-slate-950 text-white font-sans border-t border-slate-800">
      <div className="container-page py-16 grid gap-10 md:grid-cols-4 text-xs">
        <div className="md:col-span-2 space-y-3">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-emerald-600 text-white font-display font-bold text-base">
              G
            </span>
            <span className="font-display text-xl font-bold text-white tracking-tight">
              La Estancia <span className="text-emerald-400 font-serif italic">Guayaba</span>
            </span>
          </div>
          <p className="max-w-md text-slate-400 text-xs leading-relaxed">
            Ganadería bovina de alta selección genética en Nelore PO, Brahman, Brangus y Gyr. Innovación zootécnica y trazabilidad digital RFID en Santa Cruz, Bolivia.
          </p>
        </div>

        <div className="space-y-3">
          <h4 className="text-xs uppercase font-bold tracking-wider text-emerald-400">Navegación</h4>
          <ul className="space-y-2 text-slate-300">
            <li><Link to="/" className="hover:text-emerald-400 transition">Inicio</Link></li>
            <li><Link to="/nosotros" className="hover:text-emerald-400 transition">Nosotros & Equipo</Link></li>
            <li><Link to="/catalogo" className="hover:text-emerald-400 transition">Catálogo de Ganado</Link></li>
            <li><Link to="/servicios" className="hover:text-emerald-400 transition">Servicios Zootécnicos</Link></li>
            <li><Link to="/testimonios" className="hover:text-emerald-400 transition">Testimonios</Link></li>
            <li><Link to="/contacto" className="hover:text-emerald-400 transition">Contacto Directo</Link></li>
          </ul>
        </div>

        <div className="space-y-3">
          <h4 className="text-xs uppercase font-bold tracking-wider text-emerald-400">Ubicación & Atención</h4>
          <ul className="space-y-2.5 text-slate-300">
            <li className="flex items-center gap-2"><MapPin className="size-4 text-emerald-400 shrink-0" /> San Ignacio de Velasco · Santa Cruz, Bolivia</li>
            <li className="flex items-center gap-2"><Phone className="size-4 text-emerald-400 shrink-0" /> +591 76543210 / +591 71234567</li>
            <li className="flex items-center gap-2"><Mail className="size-4 text-emerald-400 shrink-0" /> contacto@estanciaguayaba.bo</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-900 bg-slate-950">
        <div className="container-page py-6 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2 font-medium">
          <div className="flex items-center gap-2">
            <span>© {new Date().getFullYear()} La Estancia Guayaba. Todos los derechos reservados.</span>
            {/* Discretely hidden lock icon for staff administration access */}
            <Link
              to="/admin"
              className="text-slate-800 hover:text-slate-500 transition p-1 rounded-sm cursor-pointer"
              title="Acceso Privado Personal"
            >
              <Lock className="size-3" />
            </Link>
          </div>
          <span className="text-emerald-500/80 font-semibold">Trazabilidad & Tecnología Ganadera</span>
        </div>
      </div>
    </footer>
  );
}
