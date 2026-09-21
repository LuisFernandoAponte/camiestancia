const DEFAULT_PROD_URL = "https://guayaba-backend-83oa.onrender.com";

export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL;
  if (!raw || raw === "undefined" || raw.trim().length === 0) {
    return import.meta.env.PROD ? DEFAULT_PROD_URL : "http://localhost:3000";
  }
  const clean = raw.trim();
  if (clean.includes("guayaba-backend.onrender.com") && !clean.includes("guayaba-backend-83oa")) {
    return DEFAULT_PROD_URL;
  }
  return clean;
}

const API_BASE_URL = getApiBaseUrl();

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    details?: any;
  };
  meta?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

const CSRF_COOKIE = "csrf_token";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function isMutationMethod(method?: string): boolean {
  return !!method && !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
}

export async function apiRequest<T = any>(
  endpoint: string,
  options?: RequestInit,
): Promise<ApiResponse<T>> {
  const headers = new Headers({
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  });

  if (isMutationMethod(options?.method)) {
    const csrfToken = getCookie(CSRF_COOKIE);
    if (csrfToken) {
      headers.set("X-CSRF-Token", csrfToken);
    }
  }

  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
    });

    const data: ApiResponse<T> = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
}

export async function fetchCsrfToken(): Promise<void> {
  try {
    const baseUrl = getApiBaseUrl();
    await fetch(`${baseUrl}/api/auth/csrf`, { credentials: "include" });
  } catch {
  }
}

export { API_BASE_URL };
