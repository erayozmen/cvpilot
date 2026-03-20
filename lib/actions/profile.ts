"use server";

import { createClient } from "@/lib/supabase-server";
import { buildPlanInfo } from "@/lib/plan";
import type { UserProfile, PlanInfo, ActionResult } from "@/lib/types";

// ─── Profil getir (yoksa oluştur) ─────────────────────────────────────────────
// upsert mantığı: yeni kayıt olunca otomatik profil oluşturur,
// mevcut kullanıcı için var olanı döner.

export async function getOrCreateProfile(): Promise<UserProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Önce mevcut profili dene
  const { data: existing } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (existing) return existing as UserProfile;

  // Yoksa oluştur (ilk giriş veya migration sonrası eski kullanıcılar için)
  const { data: created, error } = await supabase
    .from("user_profiles")
    .insert({
      id: user.id,
      plan: "free",
      ai_usage_count: 0,
      ai_usage_reset_at: nextMonthISO(),
    })
    .select()
    .single();

  if (error) {
    console.error("Profil oluşturma hatası:", error);
    return null;
  }

  return created as UserProfile;
}

// ─── Plan bilgisi getir ───────────────────────────────────────────────────────

export async function getPlanInfo(): Promise<PlanInfo | null> {
  const profile = await getOrCreateProfile();
  if (!profile) return null;

  return buildPlanInfo(
    profile.plan,
    profile.ai_usage_count,
    profile.ai_usage_reset_at
  );
}

// ─── AI kullanımını 1 artır ───────────────────────────────────────────────────
// generateAiContent server action'ından çağrılacak.

export async function incrementAiUsage(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Giriş yapmanız gerekiyor." };

  const profile = await getOrCreateProfile();
  if (!profile) return { success: false, error: "Profil bulunamadı." };

  // Aylık sıfırlama tarihi geçmişse sıfırla
  const now = new Date();
  const resetAt = new Date(profile.ai_usage_reset_at);
  const shouldReset = now > resetAt;

  const newCount = shouldReset ? 1 : profile.ai_usage_count + 1;
  const newResetAt = shouldReset ? nextMonthISO() : profile.ai_usage_reset_at;

  const { error } = await supabase
    .from("user_profiles")
    .update({
      ai_usage_count: newCount,
      ai_usage_reset_at: newResetAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    console.error("AI kullanım güncelleme hatası:", error);
    return { success: false, error: "Kullanım sayısı güncellenemedi." };
  }

  return { success: true };
}

// ─── Yardımcı: bir sonraki ayın başı ─────────────────────────────────────────

function nextMonthISO(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
