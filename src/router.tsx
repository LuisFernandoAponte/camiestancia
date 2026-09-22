import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: false, // Evita polling global constante cada 4s
      refetchOnWindowFocus: false, // Evita peticiones duplicadas al cambiar de pestaña
      staleTime: 1000 * 60, // Considera datos frescos por 1 minuto
      gcTime: 1000 * 60 * 10, // Mantiene en memoria caché por 10 minutos
    },
  },
});

export const router = createRouter({
  routeTree,
  context: { queryClient },
  scrollRestoration: true,
  defaultPreloadStaleTime: 0,
});

export const getRouter = () => router;

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
