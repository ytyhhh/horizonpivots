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

export function roomIdFromResponse(payload: { roomId?: string; id?: string; publicId?: string; room?: { id?: string } }) {
  return payload.roomId ?? payload.publicId ?? payload.id ?? payload.room?.id ?? null;
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "请求没有完成，请稍后再试。";
}
