import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Beef,
  Stethoscope,
  Heart,
  DollarSign,
  MessageCircle,
  ArrowLeft,
  Receipt,
  BotMessageSquare,
  Syringe,
  Settings,
  Venus,
  TreePine,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useAlertasConsultor } from "@/hooks/useConsultor";
import { useCurrentUser } from "@/hooks/useAuth";
import { SIDEBAR_ROUTES, ROLES_LABELS } from "@/lib/permissions";
import type { UserRole } from "@/lib/permissions";
import { useConfigPublic } from "@/hooks/useConfiguracion";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Beef,
  Stethoscope,
  Syringe,
  Heart,
  Venus,
  TreePine,
  DollarSign,
  Receipt,
  BotMessageSquare,
  MessageCircle,
  Settings,
};

function farmInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

export function AdminSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const user = useCurrentUser();
  const { data: alertas } = useAlertasConsultor();
  const { data: publicConfig } = useConfigPublic();
  const alertasCount = alertas?.length || 0;
  const role = (user?.rol || "gestor") as UserRole;
  const items = SIDEBAR_ROUTES.filter((r) => r.roles.includes(role));
  const farmName = publicConfig?.farm_name || "La Estancia";

  return (
    <Sidebar collapsible="icon" className="bg-[#06241B] text-slate-100 border-r border-emerald-950">
      <SidebarHeader className="border-b border-emerald-900/40 bg-[#06241B] px-4 py-3.5">
        <div className="flex items-center gap-3 min-w-0 w-full">
          <span className="grid size-9 place-items-center rounded-xl bg-emerald-600 text-white font-semibold text-sm shadow-sm shrink-0">
            {farmInitial(farmName)}
          </span>
          <div className="leading-tight min-w-0 flex-1">
            <div className="font-semibold text-sm text-white tracking-tight truncate" title={farmName}>
              {farmName}
            </div>
            <div className="text-[11px] text-emerald-400/80 font-medium truncate">
              {ROLES_LABELS[role]}
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-[#06241B] px-2 py-3">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] font-medium text-emerald-400/60 uppercase tracking-wider px-3 mb-1">
            Gestión Operativa
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {items.map((it) => {
                const Icon = ICON_MAP[it.icon];
                const active = it.exact ? path === it.to : path.startsWith(it.to);
                return (
                  <SidebarMenuItem key={it.to}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link
                        to={it.to}
                        className={`flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-all duration-150 min-w-0 ${
                          active
                            ? "bg-emerald-900/60 text-white font-semibold shadow-xs border border-emerald-800/40"
                            : "text-emerald-300/70 hover:text-white hover:bg-emerald-900/30"
                        }`}
                      >
                        <Icon className={`size-4 shrink-0 ${active ? "text-emerald-400" : "text-emerald-400/60"}`} />
                        <span className="flex-1 truncate" title={it.label}>{it.label}</span>
                        {it.badge && alertasCount > 0 && (
                          <span className="grid min-w-[18px] h-[18px] place-items-center rounded-full bg-rose-500 text-[10px] font-semibold text-white px-1 shadow-xs shrink-0">
                            {alertasCount}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-emerald-900/40 bg-[#06241B] p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link
                to="/"
                className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-emerald-300/70 hover:text-white hover:bg-emerald-900/30 rounded-lg transition"
              >
                <ArrowLeft className="size-4 text-emerald-400/60" />
                <span>Volver al sitio</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
