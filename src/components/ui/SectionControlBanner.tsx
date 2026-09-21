import { useState, useEffect } from "react";
import { SlidersHorizontal, Eye, EyeOff, RotateCcw, ChevronDown, ChevronUp, Layers, Check } from "lucide-react";

export interface SectionConfig {
  id: string;
  label: string;
  defaultVisible?: boolean;
}

interface SectionControlBannerProps {
  pageKey: string;
  sections: SectionConfig[];
  visibility: Record<string, boolean>;
  onToggle: (id: string) => void;
  onReset: () => void;
  title?: string;
  description?: string;
}

export function SectionControlBanner({
  pageKey,
  sections,
  visibility,
  onToggle,
  onReset,
  title = "Personalización de Vistas UI 2026",
  description = "Activá u ocultá las secciones de este panel según tus necesidades operativas.",
}: SectionControlBannerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const hiddenCount = sections.filter((s) => visibility[s.id] === false).length;

  return (
    <div className="w-full rounded-2xl glass-banner-2026 shadow-2026 overflow-hidden transition-all duration-200 border border-slate-200/80 dark:border-slate-800">
      {/* Header bar */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-3 flex items-center justify-between cursor-pointer select-none hover:bg-slate-900/5 dark:hover:bg-slate-100/5 transition"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 font-semibold">
            <SlidersHorizontal className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                {title}
              </h3>
              {hiddenCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-semibold border border-amber-500/30">
                  {hiddenCount} sección{hiddenCount > 1 ? "es" : ""} oculta{hiddenCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition"
          >
            {isOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Control Panel */}
      {isOpen && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/40 space-y-3 animate-fade-up">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Layers className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              Secciones Disponibles:
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReset();
              }}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition cursor-pointer"
            >
              <RotateCcw className="size-3" /> Restablecer Secciones
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {sections.map((sec) => {
              const isVisible = visibility[sec.id] !== false;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => onToggle(sec.id)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                    isVisible
                      ? "bg-white dark:bg-slate-800 border-emerald-500/40 text-slate-900 dark:text-slate-100 shadow-2026"
                      : "bg-slate-200/50 dark:bg-slate-950/40 border-slate-300/60 dark:border-slate-800 text-slate-400 dark:text-slate-500 line-through opacity-70"
                  }`}
                >
                  <span className="truncate">{sec.label}</span>
                  {isVisible ? (
                    <Eye className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 ml-1" />
                  ) : (
                    <EyeOff className="size-3.5 text-slate-400 shrink-0 ml-1" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Custom hook para manejar el estado de visibilidad de secciones con localStorage persistence
 */
export function useSectionVisibility(pageKey: string, initialSections: SectionConfig[]) {
  const storageKey = `estancia_sections_${pageKey}`;

  const [visibility, setVisibility] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    const defaults: Record<string, boolean> = {};
    initialSections.forEach((s) => {
      defaults[s.id] = s.defaultVisible !== false;
    });
    return defaults;
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(visibility));
    } catch {}
  }, [visibility, storageKey]);

  const toggleSection = (id: string) => {
    setVisibility((prev) => ({
      ...prev,
      [id]: prev[id] === false ? true : false,
    }));
  };

  const resetSections = () => {
    const defaults: Record<string, boolean> = {};
    initialSections.forEach((s) => {
      defaults[s.id] = s.defaultVisible !== false;
    });
    setVisibility(defaults);
  };

  return {
    visibility,
    toggleSection,
    resetSections,
    isVisible: (id: string) => visibility[id] !== false,
  };
}
