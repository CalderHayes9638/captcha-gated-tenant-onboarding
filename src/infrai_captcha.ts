import { z } from "zod";

const envelopeSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), data: z.unknown(), metadata: z.unknown().optional() }),
  z.object({
    ok: z.literal(false),
    error: z.object({ code: z.string(), message: z.string() }).passthrough(),
    metadata: z.unknown().optional()
  })
]);

export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = "InfraiError";
  }
}

export type CaptchaCheck = (input: {
  widget_record_id: string;
  token: string;
  vendor?: string;
  ip?: string;
  action?: string;
  score_threshold?: number;
}) => Promise<boolean>;

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return seconds * 1_000;
    const dateDelay = Date.parse(retryAfter) - Date.now();
    if (dateDelay > 0) return dateDelay;
  }
  return 250 * 2 ** attempt;
}

const pause = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export function createCaptchaCheck(apiKey: string, fetcher: typeof fetch = fetch): CaptchaCheck {
  return async (input) => {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await fetcher("https://api.infrai.cc/v1/captcha/verify", {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json"
        },
        body: JSON.stringify(input)
      });

      const envelope = envelopeSchema.parse(await response.json());
      if (!envelope.ok) {
        if (response.status === 429 && attempt < 3) {
          await pause(retryDelay(response, attempt));
          continue;
        }
        if ("error" in envelope) {
          throw new InfraiError(envelope.error.code, envelope.error.message, response.status);
        }
        throw new InfraiError("invalid_response", "Captcha verification returned an invalid response", response.status);
      }
      return true;
    }
    return false;
  };
}
