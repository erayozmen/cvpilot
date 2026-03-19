"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase-server";
import type { ActionResult, ResumeData, ResumeFormData } from "@/lib/types";

// ─── Yardımcı: kullanıcıyı doğrula ──────────────────────────────────────────

async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return { user: null, supabase };
  return { user, supabase };
}

// ─── CV Kaydet (yeni oluştur) ─────────────────────────────────────────────────

export async function saveResume(formData: FormData): Promise<ActionResult> {
  const { user, supabase } = await getAuthUser();
  if (!user) return { success: false, error: "Giriş yapmanız gerekiyor." };

  const resumeId = formData.get("resume_id") as string | null;

  const payload: ResumeFormData = {
    title: (formData.get("title") as string)?.trim() || "İsimsiz CV",
    full_name: (formData.get("full_name") as string)?.trim() ?? "",
    email: (formData.get("email") as string)?.trim() ?? "",
    phone: (formData.get("phone") as string)?.trim() ?? "",
    location: (formData.get("location") as string)?.trim() ?? "",
    linkedin: (formData.get("linkedin") as string)?.trim() ?? "",
    summary: (formData.get("summary") as string)?.trim() ?? "",
    work_experience: (formData.get("work_experience") as string)?.trim() ?? "",
    education: (formData.get("education") as string)?.trim() ?? "",
    skills: (formData.get("skills") as string)?.trim() ?? "",
  };

  if (!payload.full_name) {
    return { success: false, error: "Ad soyad zorunludur." };
  }
  if (payload.email && !payload.email.includes("@")) {
    return { success: false, error: "Geçerli bir e-posta adresi girin." };
  }

  if (resumeId) {
    // Güncelleme — önce bu CV'nin bu kullanıcıya ait olduğunu kontrol et
    const { error } = await supabase
      .from("resumes")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", resumeId)
      .eq("user_id", user.id);

    if (error) {
      console.error("CV güncelleme hatası:", error);
      return { success: false, error: "CV kaydedilemedi. Lütfen tekrar deneyin." };
    }
  } else {
    // Yeni kayıt oluştur
    const { error } = await supabase
      .from("resumes")
      .insert({ ...payload, user_id: user.id, updated_at: new Date().toISOString() });

    if (error) {
      console.error("CV oluşturma hatası:", error);
      return { success: false, error: "CV oluşturulamadı. Lütfen tekrar deneyin." };
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/cv-builder");
  return { success: true, data: "CV başarıyla kaydedildi." };
}

// ─── Tek CV Getir (id ile) ────────────────────────────────────────────────────

export async function getResumeById(id: string): Promise<ResumeData | null> {
  const { user, supabase } = await getAuthUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("resumes")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) return null;
  return data as ResumeData;
}

// ─── İlk CV'yi Getir (geriye dönük uyumluluk) ────────────────────────────────

export async function getResume(): Promise<ResumeData | null> {
  const { user, supabase } = await getAuthUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("resumes")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data as ResumeData;
}

// ─── Tüm CV'leri Getir ───────────────────────────────────────────────────────

export async function getAllResumes(): Promise<ResumeData[]> {
  const { user, supabase } = await getAuthUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("resumes")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error || !data) return [];
  return data as ResumeData[];
}

// ─── CV Sil ───────────────────────────────────────────────────────────────────

export async function deleteResume(id: string): Promise<ActionResult> {
  const { user, supabase } = await getAuthUser();
  if (!user) return { success: false, error: "Giriş yapmanız gerekiyor." };

  const { error } = await supabase
    .from("resumes")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id); // güvenlik: sadece kendi CV'sini silebilir

  if (error) {
    console.error("CV silme hatası:", error);
    return { success: false, error: "CV silinemedi. Lütfen tekrar deneyin." };
  }

  revalidatePath("/dashboard");
  return { success: true, data: "CV silindi." };
}

// ─── CV Çoğalt ────────────────────────────────────────────────────────────────

export async function duplicateResume(id: string): Promise<ActionResult> {
  const { user, supabase } = await getAuthUser();
  if (!user) return { success: false, error: "Giriş yapmanız gerekiyor." };

  // Orijinal CV'yi getir
  const { data: original, error: fetchError } = await supabase
    .from("resumes")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !original) {
    return { success: false, error: "CV bulunamadı." };
  }

  // id, created_at, updated_at olmadan kopyasını oluştur
  const { id: _id, created_at: _created, updated_at: _updated, ...rest } = original;

  const { error: insertError } = await supabase.from("resumes").insert({
    ...rest,
    title: `${original.title || "İsimsiz CV"} (Kopya)`,
    user_id: user.id,
    updated_at: new Date().toISOString(),
  });

  if (insertError) {
    console.error("CV çoğaltma hatası:", insertError);
    return { success: false, error: "CV çoğaltılamadı." };
  }

  revalidatePath("/dashboard");
  return { success: true, data: "CV kopyası oluşturuldu." };
}
