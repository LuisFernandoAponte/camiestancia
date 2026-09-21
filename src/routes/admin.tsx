import { createFileRoute, Outlet, useNavigate, useRouterState, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { GlobalSearchModal } from "@/components/admin/GlobalSearchModal";
import { NotificationCenter } from "@/components/admin/NotificationCenter";
import { useCurrentUser, useLogout } from "@/hooks/useAuth";
import { hasPermission, ROLES_LABELS } from "@/lib/permissions";
import { fetchCsrfToken } from "@/lib/api";
import type { UserRole } from "@/lib/permissions";
import { LogOut, Loader2, Search, Radio } from "lucide-react";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: () => {
    if (typeof window !== "undefined" && !localStorage.getItem("isLoggedIn")) {
      throw redirect({ to: "/login" });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const logoutMutation = useLogout();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    fetchCsrfToken();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (user && !hasPermission(user.rol, path)) {
      navigate({ to: "/admin" });
    }
  }, [user, path, navigate]);

  const roleLabel = ROLES_LABELS[(user?.rol || "gestor") as UserRole];

  const initials = user?.nombre
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "?";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden">
          <header className="h-14 flex items-center justify-between gap-2 sm:gap-3 border-b border-border bg-card/80 backdrop-blur-md px-3 sm:px-4 sticky top-0 z-30 w-full max-w-full min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <SidebarTrigger />
              <div className="font-display text-lg hidden sm:block shrink-0">Panel administrativo</div>

              {/* Global Search Trigger */}
              <button
                onClick={() => setSearchOpen(true)}
                className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/60 hover:bg-muted px-2.5 sm:px-3 py-1.5 rounded-xl border border-border transition shadow-xs max-w-[200px] sm:max-w-xs truncate"
              >
                <Search className="size-3.5 shrink-0" />
                <span className="hidden md:inline truncate">Buscar bovino, sección o acción...</span>
                <span className="md:hidden truncate">Buscar...</span>
                <kbd className="hidden sm:inline-block text-[10px] bg-background text-muted-foreground border border-border px-1.5 py-0.5 rounded shadow-2xs font-mono shrink-0">
                  Ctrl K
                </kbd>
              </button>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 text-sm shrink-0">
              {/* Realtime Live Sync Status Badge */}
              <div className="hidden lg:flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full font-medium">
                <span className="relative flex size-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full size-2 bg-emerald-500"></span>
                </span>
                <span>En Vivo (4s)</span>
              </div>

              {/* Notification Center */}
              <NotificationCenter />

              <span className="hidden sm:inline text-muted-foreground font-medium truncate max-w-[120px]">{user?.nombre || "Usuario"}</span>
              {user?.rol && (
                <span className="hidden sm:inline text-[11px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {roleLabel}
                </span>
              )}
              <span className="grid size-8 place-items-center rounded-full bg-accent text-accent-foreground text-xs font-semibold shadow-xs shrink-0">{initials}</span>
              <button
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className="grid size-8 place-items-center rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition shrink-0"
                title="Cerrar sesión"
              >
                {logoutMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
              </button>
            </div>
          </header>
          <main className="flex-1 w-full max-w-full min-w-0 overflow-x-hidden">
            <Outlet />
          </main>
        </div>
      </div>

      <GlobalSearchModal open={searchOpen} onOpenChange={setSearchOpen} />
    </SidebarProvider>
  );
}

