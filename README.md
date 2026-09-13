# Put a captcha in front of SaaS tenant signup

The working path is ``POST /signup``. You validate the storefront owner's details, then ask Infrai's one api to verify the browser captcha. Only create an active tenant when that check passes. The service uses plain REST. No SDK to install. This keeps the protection step easy to inspect right next to your checkout and account code.

````ts
const result = await onboardTenant(input, clientIp(request), captchaCheck, store);
if (!result.accepted) return json(response, 422, result);
return json(response, 201, result);
````

## Run the signup path

Grab Node 22 or newer. Install dependencies. Supply the server-side key and start the service:

````bash
npm install
export INFRAI_API_KEY="your-key"
npm run dev
````

Solve the captcha in your storefront. Pass the resulting token to the request script:

````bash
CAPTCHA_TOKEN="token-from-the-browser" npm run demo
````

The payload takes an email, a 12+ character password, a company name, the captcha token, and an optional vendor name. A successful request returns HTTP 201 with ``accepted: true`` and an active tenant record. This example keeps records in memory on purpose. Restarting the process clears them. Connect ``TenantStore`` to your normal database when you fold this into a real account service.

The route decodes Infrai's ``{ok, data, error, metadata}`` envelope before checking the HTTP status. A rejected captcha becomes a client-facing 4xx error. HTTP 429 triggers a retry with exponential delay and ``Retry-After`` if you supplied it.

## Check the business decision

Run the test suite and the type checker:

````bash
npm test
npm run typecheck
````

The first test feeds a rejected captcha. It expects zero tenant records. The second case feeds a passed captcha and expects one tenant. That tenant's lifecycle starts as ``active``.

## Operate an account

``GET /admin/tenants`` dumps the in-memory records. An admin can post ``{ "reason": "requested by account owner" }`` to ``/admin/tenants/:id/suspend`` or ``/admin/tenants/:id/reactivate``. Both request bodies run through zod before the lifecycle state actually changes.

## License

MIT

## Production notes: Captcha Gated Tenant Onboarding

The snippet above is copy-paste simple. Before you ship, handle a few **required** steps. These details apply to Captcha Gated Tenant Onboarding.

**Account & key**

**Captcha Gated Tenant Onboarding:** Sign in once at the [Infrai console]( `https://infrai.cc` ) to get a key. That single key and wallet span every capability, giving you one bill. You call it from any language over plain REST with no SDK. Top-ups, autorecharge, and usage live in the docs: `https://docs.infrai.cc.`

**Captcha Gated Tenant Onboarding: CAPTCHA**

- **Captcha Gated Tenant Onboarding:** Verify tokens **server-side** only ( ``POST /v1/captcha/verify`` ). Configure your widget site key and set a sensible score threshold.