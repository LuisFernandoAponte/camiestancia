import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandShortcut, CommandSeparator,
} from "@/components/ui/command";
import { LayoutDashboard, Beef, Stethoscope, Heart, DollarSign, Package, ShoppingCart, BotMessageSquare, Settings, Plus } from "lucide-react";
import { useBobinosSearch } from "@/hooks/useBovinos";

interface GlobalSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearchModal({ open, onOpenChange }: GlobalSearchModalProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const { data: bovinosResults } = useBobinosSearch(query);

  const handleSelect = (path: string) => {
    onOpenChange(false);
    navigate({ to: path as any });
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Buscar bovino por chip o nombre, sección o acción..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No se encontraron resultados.</CommandEmpty>

        {query.length > 0 && bovinosResults && bovinosResults.length > 0 && (
          <CommandGroup heading="Bovinos Encontrados">
            {bovinosResults.map((b) => (
              <CommandItem
                key={b.id}
                onSelect={() => handleSelect(`/admin/inventario?search=${b.chip}`)}
                className="cursor-pointer"
              >
                <Beef className="mr-2 size-4 text-emerald-600" />
                <div className="flex flex-col">
                  <span className="font-medium">{b.nombre} ({b.chip})</span>
                  <span className="text-xs text-muted-foreground">{b.raza} · {b.potrero} · {b.pesoActual}kg</span>
                </div>
                <CommandShortcut>{b.estado}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandGroup heading="Navegación Rápida">
          <CommandItem onSelect={() => handleSelect("/admin")}>
            <LayoutDashboard className="mr-2 size-4 text-accent" />
            <span>Panel de Control (Dashboard)</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect("/admin/inventario")}>
            <Beef className="mr-2 size-4 text-emerald-600" />
            <span>Inventario de Bovinos</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect("/admin/salud")}>
            <Stethoscope className="mr-2 size-4 text-blue-500" />
            <span>Salud y Veterinaria</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect("/admin/reproduccion")}>
            <Heart className="mr-2 size-4 text-purple-500" />
            <span>Reproducción e IATF</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect("/admin/finanzas")}>
            <DollarSign className="mr-2 size-4 text-amber-500" />
            <span>Finanzas y Costos</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect("/admin/insumos")}>
            <Package className="mr-2 size-4 text-orange-500" />
            <span>Control de Insumos</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect("/admin/ventas")}>
            <ShoppingCart className="mr-2 size-4 text-teal-500" />
            <span>Ventas y Ganado</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect("/admin/consultor")}>
            <BotMessageSquare className="mr-2 size-4 text-indigo-500" />
            <span>Consultor IA Ganadero</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect("/admin/configuracion")}>
            <Settings className="mr-2 size-4 text-gray-500" />
            <span>Configuración del Predio</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Acciones Rápida">
          <CommandItem onSelect={() => handleSelect("/admin/inventario?action=new")}>
            <Plus className="mr-2 size-4 text-emerald-600" />
            <span>Registrar Nuevo Bovino</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect("/admin/salud?action=new")}>
            <Plus className="mr-2 size-4 text-blue-500" />
            <span>Registrar Vacuna / Tratamiento</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect("/admin/finanzas?action=new")}>
            <Plus className="mr-2 size-4 text-amber-500" />
            <span>Registrar Nuevo Gasto</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
