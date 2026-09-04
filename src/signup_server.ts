import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { ZodError } from "zod";
import { createCaptchaCheck, InfraiError } from "./infrai_captcha.js";
import {
  adminActionSchema,
  onboardTenant,
  signupSchema,
  TenantStore,
  type TenantStatus
} from "./tenant_onboarding.js";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the signup service.");

const captchaCheck = createCaptchaCheck(apiKey);
const store = new TenantStore();
const port = Number(process.env.PORT ?? 3000);

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function json(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

function clientIp(request: IncomingMessage): string | undefined {
  const forwarded = request.headers["x-forwarded-for"];
  return typeof forwarded === "string" ? forwarded.split(",")[0]?.trim() : request.socket.remoteAddress;
}

async function route(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

  if (request.method === "POST" && url.pathname === "/signup") {
    const input = signupSchema.parse(await readJson(request));
    const result = await onboardTenant(input, clientIp(request), captchaCheck, store);
    if (!result.accepted) return json(response, 422, result);
    return json(response, 201, result);
  }

  if (request.method === "GET" && url.pathname === "/admin/tenants") {
    return json(response, 200, { tenants: store.list() });
  }

  const match = url.pathname.match(/^\/admin\/tenants\/([^/]+)\/(suspend|reactivate)$/);
  if (request.method === "POST" && match) {
    const body = adminActionSchema.parse(await readJson(request));
    const status: TenantStatus = match[2] === "suspend" ? "suspended" : "active";
    const tenant = store.setStatus(match[1]!, status, body.reason);
    return tenant ? json(response, 200, { tenant }) : json(response, 404, { error: "tenant_not_found" });
  }

  json(response, 404, { error: "route_not_found" });
}

createServer((request, response) => {
  route(request, response).catch((error: unknown) => {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return json(response, 400, { error: "invalid_request" });
    }
    if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      return json(response, status, { error: "captcha_verification_failed", detail: error.message });
    }
    console.error(error);
    json(response, 500, { error: "internal_error" });
  });
}).listen(port, () => console.log(`Signup service listening on http://localhost:${port}`));
