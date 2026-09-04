import { z } from "zod";
import type { CaptchaCheck } from "./infrai_captcha.js";

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12),
  companyName: z.string().min(2).max(100),
  captchaToken: z.string().min(1),
  captchaWidgetRecordId: z.string().min(1),
  captchaVendor: z.string().min(1).optional()
});

export const adminActionSchema = z.object({
  reason: z.string().min(3).max(200)
});

export type SignupInput = z.infer<typeof signupSchema>;
export type TenantStatus = "active" | "suspended";

export interface TenantAccount {
  id: string;
  companyName: string;
  ownerEmail: string;
  status: TenantStatus;
  createdAt: string;
  statusReason?: string;
}

export class TenantStore {
  private readonly tenants = new Map<string, TenantAccount>();

  create(input: SignupInput): TenantAccount {
    const tenant: TenantAccount = {
      id: crypto.randomUUID(),
      companyName: input.companyName,
      ownerEmail: input.email,
      status: "active",
      createdAt: new Date().toISOString()
    };
    this.tenants.set(tenant.id, tenant);
    return tenant;
  }

  find(id: string): TenantAccount | undefined {
    return this.tenants.get(id);
  }

  list(): TenantAccount[] {
    return [...this.tenants.values()];
  }

  setStatus(id: string, status: TenantStatus, reason: string): TenantAccount | undefined {
    const current = this.tenants.get(id);
    if (!current) return undefined;
    const updated = { ...current, status, statusReason: reason };
    this.tenants.set(id, updated);
    return updated;
  }
}

export type OnboardingResult =
  | { accepted: true; tenant: TenantAccount }
  | { accepted: false; reason: "captcha_rejected" };

export async function onboardTenant(
  input: SignupInput,
  ip: string | undefined,
  captchaCheck: CaptchaCheck,
  store: TenantStore
): Promise<OnboardingResult> {
  const passed = await captchaCheck({
    widget_record_id: input.captchaWidgetRecordId,
    token: input.captchaToken,
    vendor: input.captchaVendor,
    ip,
    action: "saas_signup"
  });
  if (!passed) return { accepted: false, reason: "captcha_rejected" };
  return { accepted: true, tenant: store.create(input) };
}
