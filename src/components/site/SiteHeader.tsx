import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const nav = [
  { to: "/", label: "Inicio" },
  { to: "/nosotros", label: "Nosotros" },
  { to: "/catalogo", label: "Ganado" },
  { to: "/servicios", label: "Servicios" },
  { to: "/testimonios", label: "Testimonios" },
  { to: "/contacto", label: "Contacto" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (r) => r.location.pathname });

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl font-sans">
      <div className="container-page flex h-16 items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <span className="grid size-9 place-items-center rounded-xl bg-slate-900 text-emerald-400 font-display font-bold text-lg shadow-xs group-hover:bg-slate-800 transition">
            G
          </span>
          <div className="space-y-0">
            <span className="font-display text-lg font-bold tracking-tight text-slate-900 block leading-tight">
              La Estancia <span className="text-emerald-600 font-serif italic">Guayaba</span>
            </span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">
              Ganadería de Élite
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1.5 text-xs font-semibold">
          {nav.map((n) => {
            const isActive = path === n.to;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? "bg-slate-900 text-white font-bold shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {isActive && <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                {n.label}
              </Link>
            );
          })}
        </nav>

        {/* Mobile Hamburger Button */}
        <button
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setOpen((v) => !v)}
          className="md:hidden grid size-9 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 cursor-pointer"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile Drawer Navigation */}
      {open && (
        <div className="md:hidden border-t border-slate-200 bg-white/95 backdrop-blur-lg p-4 font-sans animate-fade-up">
          <nav className="flex flex-col gap-1.5 text-xs font-semibold">
            {nav.map((n) => {
              const isActive = path === n.to;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setOpen(false)}
                  className={`px-4 py-2.5 rounded-xl transition flex items-center justify-between ${
                    isActive
                      ? "bg-slate-900 text-white font-bold"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span>{n.label}</span>
                  {isActive && <span className="size-2 rounded-full bg-emerald-400" />}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
