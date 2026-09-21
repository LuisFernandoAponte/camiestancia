import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api.js";
import { useNavigate } from "@tanstack/react-router";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  nombre: string;
  rol: string;
}

export function useLogin() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const response = await apiRequest<{ user: User }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials),
      });

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || "Login fallido");
      }

      return response.data;
    },
    onSuccess: (data) => {
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("isLoggedIn", "true");
      navigate({ to: "/admin" });
    },
  });
}

export function useLogout() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async () => {
      try {
        await apiRequest("/api/auth/logout", { method: "POST" });
      } catch {
      }
    },
    onSettled: () => {
      localStorage.removeItem("user");
      localStorage.removeItem("isLoggedIn");
      navigate({ to: "/" });
    },
  });
}

export function useCurrentUser(): User | null {
  if (typeof window === "undefined") return null;
  if (!localStorage.getItem("isLoggedIn")) return null;
  const userStr = localStorage.getItem("user");
  return userStr ? JSON.parse(userStr) : null;
}

export function useIsAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("isLoggedIn");
}
