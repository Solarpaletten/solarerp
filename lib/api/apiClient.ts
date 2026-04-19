// lib/api/apiClient.ts
// ═══════════════════════════════════════════════════════════════
// TASK 59 — API Client
// Auto-injects X-Company-Id, AbortController on company switch,
// global error handler for company errors
// ═══════════════════════════════════════════════════════════════

const ACTIVE_COMPANY_KEY = 'solar_active_company_id';

function getActiveCompanyId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACTIVE_COMPANY_KEY);
}

// ─── In-flight request registry ───────────────────────────────
const inflightControllers = new Set<AbortController>();

export function abortAllInflightRequests(): void {
  for (const ctrl of inflightControllers) ctrl.abort();
  inflightControllers.clear();
}

// ─── Company management ────────────────────────────────────────
export function setActiveCompany(companyId: string): void {
  if (typeof window === 'undefined') return;
  abortAllInflightRequests(); // cancel previous company requests
  localStorage.setItem(ACTIVE_COMPANY_KEY, companyId);
}

export function clearActiveCompany(): void {
  if (typeof window === 'undefined') return;
  abortAllInflightRequests();
  localStorage.removeItem(ACTIVE_COMPANY_KEY);
}

// ─── Global error handler ─────────────────────────────────────
const COMPANY_ERRORS = [
  'COMPANY_ACCESS_DENIED',
  'TENANT_ACCESS_DENIED',
  'COMPANY_CONTEXT_MISSING',
  'COMPANY_CONTEXT_MISMATCH',
];

function handleCompanyError(code: string): void {
  if (typeof window === 'undefined') return;
  if (COMPANY_ERRORS.includes(code)) {
    clearActiveCompany();
    window.location.href = '/account/companies';
  }
}

// ─── Helpers ──────────────────────────────────────────────────
function combineSignals(...signals: AbortSignal[]): AbortSignal {
  const ctrl = new AbortController();
  for (const sig of signals) {
    if (sig.aborted) { ctrl.abort(); break; }
    sig.addEventListener('abort', () => ctrl.abort(), { once: true });
  }
  return ctrl.signal;
}

interface FetchOptions extends RequestInit {
  companyId?: string;
}

// ─── APIClient class ──────────────────────────────────────────
class APIClient {
  private buildHeaders(url: string, opts: FetchOptions): HeadersInit {
    const h: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(opts.headers as Record<string, string> || {}),
    };
    if (url.includes('/api/company/')) {
      const id = opts.companyId ?? getActiveCompanyId();
      if (id) h['X-Company-Id'] = id;
    }
    return h;
  }

  async fetch(url: string, opts: FetchOptions = {}): Promise<Response> {
    const ctrl = new AbortController();
    inflightControllers.add(ctrl);
    const signal = opts.signal
      ? combineSignals(opts.signal, ctrl.signal)
      : ctrl.signal;
    try {
      return await fetch(url, {
        ...opts,
        credentials: 'include',
        headers: this.buildHeaders(url, opts),
        signal,
      });
    } finally {
      inflightControllers.delete(ctrl);
    }
  }

  get   = (url: string, opts?: FetchOptions) =>
    this.fetch(url, { ...opts, method: 'GET' });

  post  = (url: string, body: unknown, opts?: FetchOptions) =>
    this.fetch(url, { ...opts, method: 'POST', body: JSON.stringify(body) });

  put   = (url: string, body: unknown, opts?: FetchOptions) =>
    this.fetch(url, { ...opts, method: 'PUT', body: JSON.stringify(body) });

  patch = (url: string, body: unknown, opts?: FetchOptions) =>
    this.fetch(url, { ...opts, method: 'PATCH', body: JSON.stringify(body) });

  delete = (url: string, opts?: FetchOptions) =>
    this.fetch(url, { ...opts, method: 'DELETE' });

  async json<T = unknown>(url: string, opts: FetchOptions = {}): Promise<T> {
    let res: Response;
    try {
      res = await this.fetch(url, opts);
    } catch (e: any) {
      if (e.name === 'AbortError') throw new Error('REQUEST_ABORTED');
      throw e;
    }

    if (res.status === 401) {
      if (typeof window !== 'undefined') {
        window.location.href = `/login?from=${encodeURIComponent(window.location.pathname)}`;
      }
      throw new Error('UNAUTHORIZED');
    }

    if (res.status === 400 || res.status === 403) {
      const body = await res.json().catch(() => ({}));
      const code = body.error || (res.status === 400 ? 'BAD_REQUEST' : 'FORBIDDEN');
      handleCompanyError(code);
      throw new Error(code);
    }

    if (!res.ok) throw new Error(`API_ERROR_${res.status}`);
    return res.json() as Promise<T>;
  }
}

export const apiClient = new APIClient();
