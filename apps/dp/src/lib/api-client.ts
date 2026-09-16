export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

interface ErrorPayload {
  error?: string;
  message?: string;
  code?: string;
}

export async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    cache: "no-store",
    credentials: "same-origin",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as ErrorPayload;
    throw new ApiError(payload.message ?? payload.error ?? "请求没有完成，请稍后再试。", response.status, payload.code);
  }

  return response.json() as Promise<T>;
}

// A newly shared Clerk session can be visible to the client before its cookie
// is accepted by the Route Handler. Only retry auth-related failures with a
// fresh Clerk session token; the server still verifies the token and room owner.
export async function fetchJsonWithClerkRetry<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
  getToken?: (() => Promise<string | null>) | null,
): Promise<T> {
  try {
    return await fetchJson<T>(input, init);
  } catch (caught) {
    if (!getToken || !(caught instanceof ApiError) || ![401, 403, 404].includes(caught.status)) throw caught;
    let token: string | null;
    try {
      token = await getToken();
    } catch {
      throw caught;
    }
    if (!token) throw caught;
    const headers = Object.fromEntries(new Headers(init?.headers).entries());
    headers.Authorization = `Bearer ${token}`;
    return fetchJson<T>(input, { ...init, headers });
  }
}

export function roomIdFromResponse(payload: { roomId?: string; id?: string; publicId?: string; room?: { id?: string } }) {
  return payload.roomId ?? payload.publicId ?? payload.id ?? payload.room?.id ?? null;
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "请求没有完成，请稍后再试。";
}
