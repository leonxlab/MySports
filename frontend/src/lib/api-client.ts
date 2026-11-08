import { env } from "./env";
import { getAccessToken } from "./supabase";

export interface RequestOptions {
  /** Pengganti :param di path, contoh { id: "123" } */
  params?: Record<string, string>;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

function buildUrl(path: string, opts: RequestOptions) {
  const filled = path.replace(/:([A-Za-z]+)/g, (_, key: string) =>
    encodeURIComponent(opts.params?.[key] ?? ""),
  );
  const url = new URL(`${env.apiUrl}/api/v1${filled}`);
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }
  return url.toString();
}

/** Satu-satunya pintu ke backend. Jangan fetch langsung dari komponen. */
export const apiClient = {
  async request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
    const token = await getAccessToken();
    const res = await fetch(buildUrl(path, opts), {
      method,
      headers: {
        ...(opts.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new ApiError(
        res.status,
        data?.error?.code ?? "UNKNOWN",
        data?.error?.message ?? res.statusText,
      );
    }
    return (res.status === 204 ? undefined : await res.json()) as T;
  },
};
