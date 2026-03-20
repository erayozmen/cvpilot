/**
 * lib/plan.ts
 *
 * Plan ve kullanım limiti yardımcı fonksiyonları.
 * Şu an UI'da göstermek için kullanılır.
 * İleride OpenAI ve Stripe bağlandığında bu dosyadan zorlama yapılacak.
 */

import type { UserPlan, PlanInfo } from "@/lib/types";

// ─── Sabitler ─────────────────────────────────────────────────────────────────

export const FREE_AI_LIMIT = 5;     // Ücretsiz kullanıcıya aylık 5 AI kullanımı
export const PRO_AI_LIMIT = 999;    // Pro kullanıcıda pratik olarak sınırsız

// ─── Temel plan kontrolleri ───────────────────────────────────────────────────

export function isProUser(plan: UserPlan): boolean {
  return plan === "pro";
}

export function getRemainingFreeUses(usageCount: number): number {
  return Math.max(0, FREE_AI_LIMIT - usageCount);
}

export function canUseAI(plan: UserPlan, usageCount: number): boolean {
  if (isProUser(plan)) return true;
  return getRemainingFreeUses(usageCount) > 0;
}

// ─── PlanInfo nesnesi oluştur ─────────────────────────────────────────────────
// Dashboard ve AI panel için kullanılır.

export function buildPlanInfo(
  plan: UserPlan,
  aiUsageCount: number,
  aiUsageResetAt: string
): PlanInfo {
  return {
    plan,
    aiUsageCount,
    aiUsageResetAt,
    remainingFreeUses: getRemainingFreeUses(aiUsageCount),
    isProUser: isProUser(plan),
    canUseAI: canUseAI(plan, aiUsageCount),
  };
}

// ─── Plan rozeti için etiket ve renk ─────────────────────────────────────────

export function getPlanBadge(plan: UserPlan): {
  label: string;
  color: string;
  bg: string;
  border: string;
} {
  if (plan === "pro") {
    return {
      label: "Pro",
      color: "text-amber-700",
      bg: "bg-amber-50",
      border: "border-amber-200",
    };
  }
  return {
    label: "Ücretsiz",
    color: "text-ink-muted",
    bg: "bg-paper",
    border: "border-paper-border",
  };
}
