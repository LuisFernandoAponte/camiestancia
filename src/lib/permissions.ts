export type UserRole = "admin" | "veterinario" | "gestor";

export interface RoutePermission {
  to: string;
  label: string;
  icon: string;
  exact: boolean;
  badge?: boolean;
  roles: UserRole[];
}

export const ROLES_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  veterinario: "Veterinario",
  gestor: "Gestor",
};

export const SIDEBAR_ROUTES: RoutePermission[] = [
  { to: "/admin", label: "Dashboard", icon: "LayoutDashboard", exact: true, roles: ["admin", "veterinario", "gestor"] },
  { to: "/admin/inventario", label: "Inventario", icon: "Beef", exact: false, roles: ["admin", "gestor"] },
  { to: "/admin/salud", label: "Salud", icon: "Stethoscope", exact: false, roles: ["admin", "veterinario"] },
  { to: "/admin/insumos", label: "Insumos", icon: "Syringe", exact: false, roles: ["admin", "veterinario"] },
  { to: "/admin/vaquillas", label: "Vaquillas", icon: "Beef", exact: false, roles: ["admin", "gestor"] },
  { to: "/admin/toros", label: "Toros", icon: "Beef", exact: false, roles: ["admin", "gestor"] },
  { to: "/admin/reproduccion", label: "Reproducción", icon: "Heart", exact: false, roles: ["admin", "gestor"] },
  { to: "/admin/genealogia", label: "Genealogía", icon: "Heart", exact: false, roles: ["admin", "gestor"] },
  { to: "/admin/finanzas", label: "Finanzas", icon: "DollarSign", exact: false, roles: ["admin", "gestor"] },
  { to: "/admin/ventas", label: "Ventas", icon: "Receipt", exact: false, roles: ["admin", "gestor"] },
  { to: "/admin/consultor", label: "Consultor", icon: "BotMessageSquare", exact: false, badge: true, roles: ["admin"] },
  { to: "/admin/whatsapp", label: "WhatsApp", icon: "MessageCircle", exact: false, roles: ["admin"] },
  { to: "/admin/configuracion", label: "Configuración", icon: "Settings", exact: true, roles: ["admin"] },
];

export function hasPermission(rol: string | undefined, route: string): boolean {
  const r = SIDEBAR_ROUTES.find((s) => {
    if (s.exact) return s.to === route;
    return route.startsWith(s.to);
  });
  if (!r) return true;
  return r.roles.includes(rol as UserRole);
}

export function allowedRoutes(rol: string | undefined): string[] {
  return SIDEBAR_ROUTES
    .filter((r) => r.roles.includes(rol as UserRole))
    .map((r) => r.to);
}
