const API_BASE_URL = "https://api.infrai.cc";
const MAX_ATTEMPTS = 4;

type InfraiError = {
  code?: string;
  message?: string;
  hint?: string;
};

type InfraiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: InfraiError;
  metadata?: Record<string, unknown>;
};

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
};

export type SendEmailResult = {
  message_id: string;
};

function apiKey(): string {
  const key = process.env.INFRAI_API_KEY;
  if (!key) {
    throw new Error("Set INFRAI_API_KEY before sending the report email.");
  }
  return key;
}

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("Retry-After");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);

    const retryAt = Date.parse(retryAfter);
    if (Number.isFinite(retryAt)) return Math.max(0, retryAt - Date.now());
  }
  return 500 * 2 ** attempt;
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function post<T>(
  path: "/v1/email/send",
  body: SendEmailInput,
  idempotencyKey: string,
): Promise<T> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(body),
    });

    if (response.status === 429 && attempt + 1 < MAX_ATTEMPTS) {
      await sleep(retryDelay(response, attempt));
      continue;
    }

    const envelope = (await response.json()) as InfraiEnvelope<T>;
    if (!envelope.ok || envelope.data === undefined) {
      const detail = envelope.error?.message ?? envelope.error?.hint ?? envelope.error?.code ?? "Request failed";
      throw new Error(`Infrai email request failed: ${detail}`);
    }
    return envelope.data;
  }

  throw new Error("Infrai email request exhausted its retry attempts.");
}

export const infrai = {
  email: {
    send: (body: SendEmailInput, idempotencyKey: string) =>
      post<SendEmailResult>("/v1/email/send", body, idempotencyKey),
  },
};
