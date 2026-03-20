// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AuthFormData {
  email: string;
  password: string;
}

// ─── Resume ──────────────────────────────────────────────────────────────────

export interface ResumeData {
  id?: string;
  user_id?: string;
  title?: string;
  full_name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  summary: string;
  work_experience: string;
  education: string;
  skills: string;
  updated_at?: string;
  created_at?: string;
}

export type ResumeFormData = Omit<ResumeData, "id" | "user_id" | "updated_at" | "created_at">;

// ─── Server Action Results ────────────────────────────────────────────────────

export interface ActionResult {
  success: boolean;
  error?: string;
  data?: unknown;
}

// ─── AI Generation ───────────────────────────────────────────────────────────

export type AiFeature = "summary" | "work_experience" | "cover_letter";

export interface AiGenerateInput {
  feature: AiFeature;
  resume: ResumeData;
  jobTitle: string;
  companyName?: string;
}

export interface AiGenerateResult {
  success: boolean;
  content?: string;
  error?: string;
}

// ─── Plan & Kullanım ──────────────────────────────────────────────────────────

export type UserPlan = "free" | "pro";

export interface UserProfile {
  id: string;               // auth.users.id ile aynı
  plan: UserPlan;
  ai_usage_count: number;   // toplam AI kullanım sayısı
  ai_usage_reset_at: string; // aylık sıfırlama tarihi
  created_at: string;
  updated_at: string;
}

export interface PlanInfo {
  plan: UserPlan;
  aiUsageCount: number;
  aiUsageResetAt: string;
  remainingFreeUses: number;
  isProUser: boolean;
  canUseAI: boolean;
}
