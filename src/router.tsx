import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: 4000, // Sync DB data every 4 seconds in real time
      refetchOnWindowFocus: true,
      staleTime: 2000,
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
