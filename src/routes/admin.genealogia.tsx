import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Search, Loader2, Venus, Swords, AlertTriangle, Users, Info } from "lucide-react";
import { useBovinos } from "@/hooks/useBovinos";
import { useArbolFamiliar, useAlertasParentesco } from "@/hooks/useGenealogia";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/genealogia")({
  component: Genealogia,
});

const estadoStyles: Record<string, string> = {
  activo: "bg-emerald-500/10 text-emerald-600",
  disponible: "bg-blue-500/10 text-blue-600",
  preñez: "bg-purple-500/10 text-purple-600",
  vendido: "bg-muted text-muted-foreground",
  fallecido: "bg-red-500/10 text-red-600 line-through",
};

function Genealogia() {
  const [searchQ, setSearchQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: bovinosData } = useBovinos(1, 500);
  const { data: arbol, isLoading: loadingArbol } = useArbolFamiliar(selectedId || "");
  const { data: alertasParentesco } = useAlertasParentesco();

  const allBovinos = useMemo(() => {
    if (!bovinosData?.data || !Array.isArray(bovinosData.data)) return [];
    return bovinosData.data;
  }, [bovinosData]);

  const filteredBovinos = useMemo(() => {
    if (!searchQ) return allBovinos.slice(0, 10);
    return allBovinos.filter((b: any) =>
      `${b.nombre || ""} ${b.chip || ""} ${b.numeroIdentificacion || ""} ${b.raza || ""}`
        .toLowerCase()
        .includes(searchQ.toLowerCase()),
    ).slice(0, 10);
  }, [allBovinos, searchQ]);

  const alertasArray: any[] = alertasParentesco && Array.isArray(alertasParentesco) ? alertasParentesco : [];

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="font-display text-3xl">Genealogía</h1>
        <p className="text-muted-foreground text-sm">
          Árbol familiar: padres, madres, hijos y alertas de parentesco
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <h2 className="font-display text-lg mb-3">Buscar animal</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Nombre, chip, caravana..."
                className="w-full rounded-full border border-input bg-card pl-10 pr-4 py-2.5 text-sm outline-none focus:border-accent"
              />
            </div>
            <div className="mt-3 space-y-1 max-h-[400px] overflow-y-auto">
              {filteredBovinos.map((b: any) => (
                <button
                  key={b.id}
                  onClick={() => setSelectedId(b.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm hover:bg-muted transition flex items-center gap-2 ${selectedId === b.id ? "bg-accent/10 border border-accent/30" : ""}`}
                >
                  <span className={b.sexo === "Hembra" ? "text-pink-500" : "text-blue-500"}>
                    {b.sexo === "Hembra" ? "♀" : "♂"}
                  </span>
                  <span className="font-medium">{b.nombre || b.chip}</span>
                  {b.numeroIdentificacion && <span className="text-xs text-muted-foreground">#{b.numeroIdentificacion}</span>}
                  <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full ${estadoStyles[b.estado] || ""}`}>
                    {b.estado}
                  </span>
                </button>
              ))}
              {filteredBovinos.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No se encontraron animales</p>
              )}
            </div>
          </div>

          {alertasArray.length > 0 && (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-destructive mb-2">
                <AlertTriangle className="size-4" />
                Alertas de parentesco ({alertasArray.length})
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {alertasArray.map((a, i) => (
                  <div key={i} className="text-xs bg-destructive/10 rounded-xl p-2">
                    <span className="font-medium">{a.nombre1}</span> ({a.chip1}) ↔{" "}
                    <span className="font-medium">{a.nombre2}</span> ({a.chip2})
                    <br />
                    <span className="text-muted-foreground">
                      {a.tipo_parentesco === "misma_madre" ? "Misma madre" :
                       a.tipo_parentesco === "mismo_padre" ? "Mismo padre" :
                       a.tipo_parentesco === "padre_hijo" ? "Padre/Hijo" : a.tipo_parentesco}
                    </span>
                    {" "}— <span className="text-destructive">⚠️ Posible consanguinidad</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          {loadingArbol ? (
            <div className="rounded-2xl border border-border bg-card p-12 flex items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : arbol ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-display text-xl mb-4 flex items-center gap-2">
                  <Info className="size-5 text-accent" />
                  {arbol.animal.nombre || arbol.animal.chip}
                  {arbol.animal.numeroIdentificacion && <span className="text-muted-foreground text-sm font-normal">#{arbol.animal.numeroIdentificacion}</span>}
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="text-sm">
                    <span className="text-muted-foreground text-xs">Chip</span>
                    <p className="font-medium">{arbol.animal.chip}</p>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground text-xs">Raza</span>
                    <p className="font-medium">{arbol.animal.raza || "—"}</p>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground text-xs">Sexo</span>
                    <p className="font-medium">{arbol.animal.sexo === "Hembra" ? "♀ Hembra" : "♂ Macho"}</p>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground text-xs">Estado</span>
                    <p className={`font-medium ${arbol.animal.descartado ? "text-red-500" : ""}`}>
                      {arbol.animal.descartado ? "Descartado" : arbol.animal.estado}
                    </p>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground text-xs">Color</span>
                    <p className="font-medium">{arbol.animal.color || "—"}</p>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground text-xs">Nacimiento</span>
                    <p className="font-medium">{arbol.animal.nacimiento ? new Date(arbol.animal.nacimiento).toLocaleDateString("es-BO") : "—"}</p>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground text-xs">Tipo</span>
                    <p className="font-medium capitalize">{arbol.animal.tipo || "—"}</p>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground text-xs">Total hijos</span>
                    <p className="font-medium">{arbol.totalHijos}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-border bg-card p-5">
                  <h3 className="font-display text-lg mb-3 flex items-center gap-2">
                    <Venus className="size-4 text-pink-500" />
                    Madre
                  </h3>
                  {arbol.madre ? (
                    <div className="space-y-2">
                      <p className="font-medium">{arbol.madre.nombre || arbol.madre.chip}</p>
                      <p className="text-xs text-muted-foreground">Chip: {arbol.madre.chip}</p>
                      <p className="text-xs text-muted-foreground">Raza: {arbol.madre.raza || "—"}</p>
                      <p className="text-xs text-muted-foreground">Estado: {arbol.madre.estado}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sin registro de madre</p>
                  )}
                </div>
                <div className="rounded-2xl border border-border bg-card p-5">
                  <h3 className="font-display text-lg mb-3 flex items-center gap-2">
                    <Swords className="size-4 text-blue-500" />
                    Padre
                  </h3>
                  {arbol.padre ? (
                    <div className="space-y-2">
                      <p className="font-medium">{arbol.padre.nombre || arbol.padre.chip}</p>
                      <p className="text-xs text-muted-foreground">Chip: {arbol.padre.chip}</p>
                      <p className="text-xs text-muted-foreground">Raza: {arbol.padre.raza || "—"}</p>
                      <p className="text-xs text-muted-foreground">Estado: {arbol.padre.estado}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sin registro de padre</p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="font-display text-lg mb-3 flex items-center gap-2">
                  <Users className="size-4 text-accent" />
                  Hijos ({arbol.totalHijos})
                </h3>
                {arbol.hijos.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {arbol.hijos.map((h) => (
                      <button
                        key={h.id}
                        onClick={() => setSelectedId(h.id)}
                        className="text-left rounded-xl border border-border bg-muted/30 p-3 hover:bg-muted/50 transition"
                      >
                        <div className="flex items-center gap-2">
                          <span>{h.sexo === "Hembra" ? "♀" : "♂"}</span>
                          <span className="font-medium text-sm">{h.nombre || h.chip}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {h.chip} · {h.raza || "—"} · {h.estado}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No tiene hijos registrados</p>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground">
              <Users className="size-12 mx-auto mb-4 opacity-30" />
              <p className="font-display text-lg">Seleccioná un animal</p>
              <p className="text-sm mt-1">Buscá y seleccioná un animal para ver su árbol genealógico</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
