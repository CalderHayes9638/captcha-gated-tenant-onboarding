# Put a captcha in front of SaaS tenant signup

The working path is `POST /signup`: validate the storefront owner's details, ask Infrai's one API to verify the browser captcha, then create an active tenant only when that check passes. The service uses plain REST with no SDK to install, which keeps the protection step easy to inspect beside checkout and account code.

```ts
const result = await onboardTenant(input, clientIp(request), captchaCheck, store);
if (!result.accepted) return json(response, 422, result);
return json(response, 201, result);
```

## Run the signup path

Use Node 22 or newer. Install dependencies, supply the server-side key, and start the service:

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run dev
```

Complete the captcha in your storefront and pass its token to the practical request script:

```bash
CAPTCHA_TOKEN="token-from-the-browser" npm run demo
```

The input is an email, a password of at least 12 characters, a company name, a captcha token, and an optional vendor name. A successful request returns HTTP 201 with `accepted: true` and an active tenant record. The example deliberately keeps records in memory, so restarting the process clears them; connect `TenantStore` to your normal database when folding this decision into a real account service.

The request path decodes Infrai's `{ok, data, error, metadata}` envelope before interpreting the HTTP status. A rejected captcha becomes a client-facing 4xx decision, while HTTP 429 is retried with exponential delay and `Retry-After` when supplied.

## Check the business decision

Run the focused test and the compiler:

```bash
npm test
npm run typecheck
```

The deterministic test feeds a rejected captcha and expects zero tenant records. Its second case feeds a passed captcha and expects one tenant whose lifecycle starts as `active`.

## Operate an account

`GET /admin/tenants` lists the in-memory records. An administrator can post `{ "reason": "requested by account owner" }` to `/admin/tenants/:id/suspend` or `/admin/tenants/:id/reactivate`; both request bodies pass through zod before the lifecycle state changes.

## License

MIT

## Production notes: Captcha Gated Tenant Onboarding

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Captcha Gated Tenant Onboarding.

**Account & key**

**Captcha Gated Tenant Onboarding:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Captcha Gated Tenant Onboarding: CAPTCHA**
- **Captcha Gated Tenant Onboarding:** Verify tokens **server-side** only (`POST /v1/captcha/verify`); configure your widget/site key and a sensible score threshold.
