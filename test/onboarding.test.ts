import assert from "node:assert/strict";
import test from "node:test";
import { onboardTenant, TenantStore, type SignupInput } from "../src/tenant_onboarding.js";

const signup: SignupInput = {
  email: "owner@shop.example",
  password: "correct-horse-battery-staple",
  companyName: "Checkout Supply",
  captchaToken: "browser-token",
  captchaWidgetRecordId: "widget-record-1",
  captchaVendor: "turnstile"
};

test("a rejected captcha never creates a tenant", async () => {
  const store = new TenantStore();
  const result = await onboardTenant(signup, "203.0.113.8", async () => false, store);
  assert.deepEqual(result, { accepted: false, reason: "captcha_rejected" });
  assert.equal(store.list().length, 0);
});

test("a passed captcha creates an active tenant", async () => {
  const store = new TenantStore();
  const result = await onboardTenant(signup, "203.0.113.8", async () => true, store);
  assert.equal(result.accepted, true);
  assert.equal(store.list()[0]?.status, "active");
  assert.equal(store.list()[0]?.ownerEmail, signup.email);
});
