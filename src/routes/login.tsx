import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useLogin, useIsAuthenticated } from "@/hooks/useAuth";
import { Loader2, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Iniciar sesión — La Estancia Guayaba" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const isAuth = useIsAuthenticated();
  const loginMutation = useLogin();

  useEffect(() => {
    if (isAuth) window.location.href = "/admin";
  }, [isAuth]);

  if (isAuth) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="size-4" /> Volver al sitio
          </Link>
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-primary text-primary-foreground font-display text-2xl">G</span>
          <h1 className="mt-4 font-display text-3xl">Panel administrativo</h1>
          <p className="mt-1 text-sm text-muted-foreground">La Estancia Guayaba</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-accent transition"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-accent transition"
              required
            />
          </div>

          {loginMutation.isError && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {loginMutation.error.message}
            </div>
          )}

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full rounded-full bg-primary py-3 text-primary-foreground font-medium hover:bg-primary/90 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loginMutation.isPending ? (
              <><Loader2 className="size-4 animate-spin" /> Conectando...</>
            ) : (
              "Iniciar sesión"
            )}
          </button>
        </form>

        <div className="text-center text-xs text-muted-foreground">
          Solo personal autorizado
        </div>
      </div>
    </div>
  );
}
