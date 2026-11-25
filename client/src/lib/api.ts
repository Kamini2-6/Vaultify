export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT';
  body?: unknown;
  token?: string;
}

async function request<T>(path: string, { method = 'GET', body, token }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
  if (!res.ok) throw new ApiError(data.error ?? 'Request failed', res.status, data.code);
  return data as T;
}

export const api = {
  health: () => request<{ ok: boolean }>('/health'),

  getSalt: (email: string) => request<{ kdfSalt: string }>(`/auth/salt?email=${encodeURIComponent(email)}`),
  register: (email: string, kdfSalt: string, authKey: string) =>
    request<{ ok: true }>('/auth/register', { method: 'POST', body: { email, kdfSalt, authKey } }),
  login: (email: string, authKey: string, totp?: string) =>
    request<{ token: string; totpEnabled: boolean }>('/auth/login', {
      method: 'POST',
      body: { email, authKey, totp },
    }),

  getVault: (token: string) => request<{ blob: string }>('/vault', { token }),
  putVault: (token: string, blob: string) => request<{ ok: true }>('/vault', { method: 'PUT', token, body: { blob } }),

  setup2fa: (token: string) =>
    request<{ secret: string; qrDataUrl: string }>('/2fa/setup', { method: 'POST', token }),
  enable2fa: (token: string, code: string) =>
    request<{ ok: true }>('/2fa/enable', { method: 'POST', token, body: { code } }),
};