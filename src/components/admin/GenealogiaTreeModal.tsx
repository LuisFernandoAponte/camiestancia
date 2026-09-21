import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useGenealogia } from "@/hooks/useBovinos";
import { Dna, Venus, Mars, AlertTriangle, ChevronRight, Baby, ShieldCheck, GitFork } from "lucide-react";

interface GenealogiaTreeModalProps {
  bovinoId: string | null;
  onClose: () => void;
  onSelectAnimal?: (id: string) => void;
}

export function GenealogiaTreeModal({ bovinoId, onClose, onSelectAnimal }: GenealogiaTreeModalProps) {
  const [currentId, setCurrentId] = useState<string | null>(bovinoId);
  const activeId = currentId || bovinoId;

  const { data: genData, isLoading, error } = useGenealogia(activeId);

  const handleNavigate = (id: string) => {
    if (!id) return;
    setCurrentId(id);
    if (onSelectAnimal) onSelectAnimal(id);
  };

  const animal = genData?.animal;
  const madre = genData?.madre;
  const padre = genData?.padre;
  const abuelos = genData?.abuelos;
  const hijos = genData?.hijos || [];
  const consanguinidad = genData?.consanguinidad;

  return (
    <Dialog open={activeId !== null} onOpenChange={(open) => { if (!open) { setCurrentId(null); onClose(); } }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto font-sans">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold text-slate-900">
            <Dna className="size-5 text-emerald-600" />
            Pedigree y Genealogía del Bovino
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Árbol genealógico interactivo de 3 generaciones y control de consanguinidad ganadera.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 text-center text-sm text-slate-500 animate-pulse flex flex-col items-center gap-2">
            <Dna className="size-8 text-emerald-500 animate-spin" />
            Cargando linaje genético...
          </div>
        ) : error || !animal ? (
          <div className="py-8 text-center text-sm text-rose-500">
            No se pudo obtener el historial genealógico de este animal.
          </div>
        ) : (
          <div className="space-y-6 pt-2 text-xs">
            {/* INSIGNIA DEL ANIMAL CENTRAL */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-emerald-900 to-slate-900 text-white p-4 rounded-2xl shadow-sm">
              <div className="flex items-center gap-3">
                <div className="grid size-11 place-items-center rounded-xl bg-white/10 text-white font-bold text-lg border border-white/20">
                  {animal.sexo === "Macho" ? "🐂" : "🐮"}
                </div>
                <div>
                  <h3 className="font-semibold text-base flex items-center gap-2">
                    {animal.nombre}
                    <span className="text-xs font-normal text-emerald-300">({animal.chip})</span>
                  </h3>
                  <p className="text-xs text-slate-300">
                    Raza: {animal.raza} · Sexo: {animal.sexo} · Potrero: {animal.potrero || "—"}
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 capitalize">
                {animal.estado}
              </span>
            </div>

            {/* ALERTA DE CONSANGUINIDAD */}
            {consanguinidad?.detectada ? (
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 flex items-start gap-3">
                <AlertTriangle className="size-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-xs text-rose-900 dark:text-rose-200">
                    ⚠️ Alerta de Consanguinidad / Endogamia Detectada
                  </h4>
                  <p className="text-[11px] text-rose-800 dark:text-rose-300 mt-0.5 leading-relaxed">
                    La línea materna y paterna de este reproductor comparten {consanguinidad.ancestrosComunesCount} ancestro(s) común(es). Evitá acoplamientos con familiares directos para mantener la heterosis (vigor híbrido).
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 flex items-center gap-2.5 text-emerald-900 dark:text-emerald-200">
                <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
                <span className="text-xs font-medium">
                  ✅ Coeficiente de Endogamia Normal (Ancestros maternos y paternos independientes)
                </span>
              </div>
            )}

            {/* ÁRBOLES PEDIGREE DE 3 GENERACIONES */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <GitFork className="size-4 text-emerald-600" />
                Árbol Ancestral (Padres y Abuelos)
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* RAMA MATERNA */}
                <div className="rounded-2xl border border-pink-500/20 bg-pink-500/5 p-3.5 space-y-3">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-pink-700 dark:text-pink-300">
                    <Venus className="size-4 text-pink-500" />
                    <span>Línea Materna (Madre)</span>
                  </div>

                  {/* MADRE */}
                  {madre ? (
                    <div
                      onClick={() => handleNavigate(madre.id)}
                      className="p-3 rounded-xl border border-pink-500/30 bg-white dark:bg-slate-900 hover:border-pink-500 transition cursor-pointer flex items-center justify-between group"
                    >
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1">
                          🐮 {madre.nombre}
                          <span className="text-[10px] text-slate-500 font-normal">({madre.chip})</span>
                        </div>
                        <div className="text-[10px] text-slate-500">Raza: {madre.raza}</div>
                      </div>
                      <ChevronRight className="size-4 text-slate-400 group-hover:text-pink-600 transition" />
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl border border-dashed border-pink-300/60 bg-white/50 text-slate-400 text-center italic">
                      Vaca Madre no registrada
                    </div>
                  )}

                  {/* ABUELOS MATERNOS */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="p-2 rounded-lg border border-slate-200 bg-white text-[11px]">
                      <span className="text-[10px] text-slate-400 block">Abuelo Materno</span>
                      {abuelos?.materno?.padre ? (
                        <button onClick={() => handleNavigate(abuelos.materno.padre.id)} className="font-medium text-slate-800 hover:text-emerald-600 text-left truncate w-full block cursor-pointer">
                          🐂 {abuelos.materno.padre.nombre}
                        </button>
                      ) : (
                        <span className="text-slate-400 italic font-normal">No registrado</span>
                      )}
                    </div>
                    <div className="p-2 rounded-lg border border-slate-200 bg-white text-[11px]">
                      <span className="text-[10px] text-slate-400 block">Abuela Materna</span>
                      {abuelos?.materno?.madre ? (
                        <button onClick={() => handleNavigate(abuelos.materno.madre.id)} className="font-medium text-slate-800 hover:text-pink-600 text-left truncate w-full block cursor-pointer">
                          🐮 {abuelos.materno.madre.nombre}
                        </button>
                      ) : (
                        <span className="text-slate-400 italic font-normal">No registrada</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* RAMA PATERNA */}
                <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-3.5 space-y-3">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-blue-700 dark:text-blue-300">
                    <Mars className="size-4 text-blue-500" />
                    <span>Línea Paterna (Padre / Toro)</span>
                  </div>

                  {/* PADRE */}
                  {padre ? (
                    <div
                      onClick={() => handleNavigate(padre.id)}
                      className="p-3 rounded-xl border border-blue-500/30 bg-white dark:bg-slate-900 hover:border-blue-500 transition cursor-pointer flex items-center justify-between group"
                    >
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1">
                          🐂 {padre.nombre}
                          <span className="text-[10px] text-slate-500 font-normal">({padre.chip})</span>
                        </div>
                        <div className="text-[10px] text-slate-500">Raza: {padre.raza}</div>
                      </div>
                      <ChevronRight className="size-4 text-slate-400 group-hover:text-blue-600 transition" />
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl border border-dashed border-blue-300/60 bg-white/50 text-slate-400 text-center italic">
                      Toro Padre no registrado
                    </div>
                  )}

                  {/* ABUELOS PATERNOS */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="p-2 rounded-lg border border-slate-200 bg-white text-[11px]">
                      <span className="text-[10px] text-slate-400 block">Abuelo Paterno</span>
                      {abuelos?.paterno?.padre ? (
                        <button onClick={() => handleNavigate(abuelos.paterno.padre.id)} className="font-medium text-slate-800 hover:text-blue-600 text-left truncate w-full block cursor-pointer">
                          🐂 {abuelos.paterno.padre.nombre}
                        </button>
                      ) : (
                        <span className="text-slate-400 italic font-normal">No registrado</span>
                      )}
                    </div>
                    <div className="p-2 rounded-lg border border-slate-200 bg-white text-[11px]">
                      <span className="text-[10px] text-slate-400 block">Abuela Paterna</span>
                      {abuelos?.paterno?.madre ? (
                        <button onClick={() => handleNavigate(abuelos.paterno.madre.id)} className="font-medium text-slate-800 hover:text-pink-600 text-left truncate w-full block cursor-pointer">
                          🐮 {abuelos.paterno.madre.nombre}
                        </button>
                      ) : (
                        <span className="text-slate-400 italic font-normal">No registrada</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN DE DESCENDENCIA / HIJOS (CRÍAS) */}
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Baby className="size-4 text-emerald-600" />
                Descendencia Directa / Crías Nacidas ({hijos.length})
              </h4>

              {hijos.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                  {hijos.map((h: any) => (
                    <div
                      key={h.id}
                      onClick={() => handleNavigate(h.id)}
                      className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-emerald-500 transition cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{h.sexo === "Macho" ? "🐂" : "🐮"}</span>
                        <div>
                          <div className="font-semibold text-slate-900">{h.nombre || "Sin nombre"}</div>
                          <div className="text-[10px] text-slate-500">Chip: {h.chip} · Raza: {h.raza}</div>
                        </div>
                      </div>
                      <ChevronRight className="size-4 text-slate-400" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-400 text-center text-xs italic">
                  No se han registrado crías nacidas de este animal.
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
