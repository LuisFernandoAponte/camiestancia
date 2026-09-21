import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  Bell,
  Heart,
  Package,
  Activity,
  AlertTriangle,
  CheckCircle2,
  X,
  ChevronRight,
  Clock,
  Check,
} from "lucide-react";
import { useAlertasInsumos } from "@/hooks/useInsumos";
import { useReproduccion } from "@/hooks/useReproduccion";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface AppNotification {
  id: string;
  type: "reproduccion" | "insumo" | "salud";
  severity: "high" | "medium" | "info";
  title: string;
  message: string;
  date: string;
  link: string;
  read?: boolean;
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "reproduccion" | "insumo" | "salud">("all");
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const { data: alertasInsumos } = useAlertasInsumos();
  const { data: repData } = useReproduccion(1, 200);

  const notifications = useMemo(() => {
    const list: AppNotification[] = [];

    // 1. Alertar Partos Próximos (menos de 45 días o vencidos)
    if (repData?.data) {
      repData.data.forEach((rep) => {
        if (rep.estado === "confirmada" && rep.diasActuales !== null) {
          const diasRestantes = 283 - rep.diasActuales;
          if (diasRestantes <= 45 && diasRestantes >= 0) {
            list.push({
              id: `parto-${rep.id}`,
              type: "reproduccion",
              severity: diasRestantes <= 15 ? "high" : "medium",
              title: `🤰 Parto estimado en ${diasRestantes} días`,
              message: `Vaca ${rep.hembra} (${rep.chipHembra || "Sin chip"}) está en día ${rep.diasActuales}/283 de gestación.`,
              date: rep.partoEstimadoCalc || rep.createdAt,
              link: "/admin/reproduccion",
            });
          } else if (diasRestantes < 0) {
            list.push({
              id: `parto-vencido-${rep.id}`,
              type: "reproduccion",
              severity: "high",
              title: `⚠️ Parto superó fecha estimada`,
              message: `Vaca ${rep.hembra} alcanzó los 283 días de gestación. Verificar estado de parto.`,
              date: rep.partoEstimadoCalc || rep.createdAt,
              link: "/admin/reproduccion",
            });
          }
        } else if (rep.estado === "evaluacion" || rep.resultado === "pendiente") {
          list.push({
            id: `diag-pend-${rep.id}`,
            type: "reproduccion",
            severity: "medium",
            title: `📋 Diagnóstico reproductivo pendiente`,
            message: `Servicio de ${rep.hembra} (${rep.chipHembra || ""}) requiere confirmar preñez o evaluar celo.`,
            date: rep.fechaInseminacion || rep.createdAt,
            link: "/admin/reproduccion",
          });
        }
      });
    }

    // 2. Alertar Insumos Críticos
    if (alertasInsumos?.criticos) {
      alertasInsumos.criticos.forEach((ins) => {
        list.push({
          id: `ins-crit-${ins.id}`,
          type: "insumo",
          severity: "high",
          title: `📦 Stock crítico: ${ins.nombre}`,
          message: `Stock actual (${ins.stockActual} ${ins.unidad}) está por debajo del mínimo requerido (${ins.stockMinimo}).`,
          date: new Date().toISOString(),
          link: "/admin/insumos",
        });
      });
    }

    // 3. Alertar Insumos Vencidos / Por Vencer
    if (alertasInsumos?.porVencer) {
      alertasInsumos.porVencer.forEach((ins) => {
        list.push({
          id: `ins-venc-${ins.id}`,
          type: "insumo",
          severity: "medium",
          title: `⏳ Insumo próximo a vencer`,
          message: `${ins.nombre} vence el ${ins.fechaVencimiento ? new Date(ins.fechaVencimiento).toLocaleDateString("es-BO") : ""}.`,
          date: ins.fechaVencimiento || new Date().toISOString(),
          link: "/admin/insumos",
        });
      });
    }

    return list;
  }, [alertasInsumos, repData]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !readIds.has(n.id)).length;
  }, [notifications, readIds]);

  const filteredNotifications = useMemo(() => {
    if (filter === "all") return notifications;
    return notifications.filter((n) => n.type === filter);
  }, [notifications, filter]);

  const markAllRead = () => {
    const allIds = new Set(notifications.map((n) => n.id));
    setReadIds(allIds);
  };

  const toggleRead = (id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative grid size-8 place-items-center rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition shrink-0 cursor-pointer"
          title="Notificaciones de la Estancia"
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-xs">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-80 sm:w-96 p-0 shadow-2xl rounded-2xl border border-border bg-card text-card-foreground font-sans">
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 border-b border-border bg-muted/40 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Bell className="size-4 text-emerald-600" />
            <span className="font-semibold text-xs text-foreground">
              Notificaciones de la Finca
            </span>
            {unreadCount > 0 && (
              <span className="text-[10px] font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/20 px-2 py-0.5 rounded-full">
                {unreadCount} nuevas
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-[11px] font-medium text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Check className="size-3" /> Marcar leídas
            </button>
          )}
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1 p-2 border-b border-border bg-background text-xs">
          <button
            onClick={() => setFilter("all")}
            className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
              filter === "all"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Todas ({notifications.length})
          </button>
          <button
            onClick={() => setFilter("reproduccion")}
            className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1 cursor-pointer ${
              filter === "reproduccion"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <Heart className="size-3" /> Reproducción
          </button>
          <button
            onClick={() => setFilter("insumo")}
            className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1 cursor-pointer ${
              filter === "insumo"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <Package className="size-3" /> Insumos
          </button>
        </div>

        {/* Notifications List */}
        <div className="max-h-80 overflow-y-auto divide-y divide-border">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              <CheckCircle2 className="size-8 mx-auto text-emerald-500 mb-2 opacity-80" />
              <p className="font-medium text-foreground">Todo al día</p>
              <p className="text-[11px]">No hay alertas pendientes en esta categoría.</p>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const isRead = readIds.has(notif.id);
              return (
                <div
                  key={notif.id}
                  className={`p-3 transition-colors flex items-start gap-3 hover:bg-muted/50 ${
                    isRead ? "opacity-60 bg-muted/20" : "bg-card"
                  }`}
                >
                  <div
                    className={`size-8 rounded-xl shrink-0 flex items-center justify-center text-white shadow-xs ${
                      notif.severity === "high"
                        ? "bg-rose-500"
                        : notif.severity === "medium"
                        ? "bg-amber-500"
                        : "bg-blue-500"
                    }`}
                  >
                    {notif.type === "reproduccion" ? (
                      <Heart className="size-4" />
                    ) : notif.type === "insumo" ? (
                      <Package className="size-4" />
                    ) : (
                      <Activity className="size-4" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-xs text-foreground truncate">
                        {notif.title}
                      </span>
                      <button
                        onClick={() => toggleRead(notif.id)}
                        className="text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
                        title={isRead ? "Marcar no leída" : "Marcar leída"}
                      >
                        <div
                          className={`size-2 rounded-full ${
                            isRead ? "border border-muted-foreground" : "bg-emerald-500"
                          }`}
                        />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {notif.message}
                    </p>

                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-border/50 text-[10px]">
                      <span className="text-muted-foreground/80 flex items-center gap-1">
                        <Clock className="size-3" />
                        {new Date(notif.date).toLocaleDateString("es-BO", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                      <Link
                        to={notif.link as any}
                        onClick={() => {
                          toggleRead(notif.id);
                          setOpen(false);
                        }}
                        className="font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5 hover:underline"
                      >
                        Ver detalle <ChevronRight className="size-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-2.5 border-t border-border bg-muted/30 text-center text-[11px] text-muted-foreground font-medium rounded-b-2xl">
          Monitoreo en tiempo real de reproducción, partos e inventario
        </div>
      </PopoverContent>
    </Popover>
  );
}
