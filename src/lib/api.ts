const DEFAULT_PROD_URL = "https://guayaba-backend-83oa.onrender.com";
const rawEnvUrl = import.meta.env.VITE_API_URL;
const API_BASE_URL =
  rawEnvUrl && rawEnvUrl !== "undefined" && rawEnvUrl.trim().length > 0
    ? rawEnvUrl.trim()
    : import.meta.env.PROD
      ? DEFAULT_PROD_URL
      : "http://localhost:3000";

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

  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
    });

    const data: ApiResponse<T> = await response.json();

    if (!response.ok) {
      return data;
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function fetchCsrfToken(): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/auth/csrf`, { credentials: "include" });
  } catch {
  }
}

export { API_BASE_URL };
