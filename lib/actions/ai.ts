"use server";

import OpenAI from "openai";
import { createClient } from "@/lib/supabase-server";
import { getOrCreateProfile, incrementAiUsage } from "@/lib/actions/profile";
import { canUseAI } from "@/lib/plan";
import type { AiFeature, AiGenerateResult, ResumeData } from "@/lib/types";

// ─── OpenAI client (server-only) ─────────────────────────────────────────────
// This file is "use server" — it never runs in the browser.
// The API key is read from environment variables and is never sent to the client.

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set in environment variables.");
  }
  return new OpenAI({ apiKey });
}

// ─── Rate limiting (in-memory, per deployment instance) ──────────────────────
// Simple request timestamp map keyed by user ID.
// Prevents a user from hammering the API faster than once per 5 seconds.

const lastRequestTime = new Map<string, number>();
const RATE_LIMIT_MS = 5_000;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const last = lastRequestTime.get(userId) ?? 0;
  if (now - last < RATE_LIMIT_MS) return false;
  lastRequestTime.set(userId, now);
  return true;
}

// ─── Prompt builders ──────────────────────────────────────────────────────────

function buildSummaryPrompt(
  resume: ResumeData,
  jobTitle: string,
  companyName?: string
): string {
  return `You are a professional CV writer. Write a concise, compelling professional summary for a CV.

Candidate details:
- Name: ${resume.full_name}
- Target job title: ${jobTitle}
${companyName ? `- Target company: ${companyName}` : ""}
- Current skills: ${resume.skills || "not provided"}
- Work experience (brief): ${resume.work_experience?.slice(0, 400) || "not provided"}
- Education: ${resume.education?.slice(0, 200) || "not provided"}

Requirements:
- 3–4 sentences maximum
- Start with a strong opening statement
- Mention the target job title naturally
- Highlight key strengths and value proposition
- Professional, confident tone
- Do NOT use "I" — write in third person or omit the subject
- Do NOT include headers or labels — just the summary text itself`;
}

function buildWorkExperiencePrompt(
  resume: ResumeData,
  jobTitle: string,
  companyName?: string
): string {
  return `You are a professional CV writer. Rewrite and improve the work experience section below.

Target job title: ${jobTitle}
${companyName ? `Target company: ${companyName}` : ""}

Current work experience to improve:
${resume.work_experience || "No work experience provided."}

Requirements:
- Keep all the same roles and companies — do NOT invent new ones
- Rewrite each bullet point to be stronger and more impactful
- Start every bullet with a strong action verb (Led, Built, Designed, Delivered, etc.)
- Add metrics or outcomes where they can be reasonably inferred
- Tailor language to be relevant to the target job title
- Keep the same structure: "Role — Company (dates)" followed by bullet points
- Do NOT add roles that were not in the original
- Output only the improved work experience text, no labels or headers`;
}

function buildCoverLetterPrompt(
  resume: ResumeData,
  jobTitle: string,
  companyName?: string
): string {
  const company = companyName || "the company";
  return `You are a professional career coach. Write a compelling, personalised cover letter.

Candidate details:
- Name: ${resume.full_name}
- Email: ${resume.email}
- Phone: ${resume.phone}
- Location: ${resume.location}
- Target job title: ${jobTitle}
- Target company: ${company}
- Summary: ${resume.summary?.slice(0, 300) || "not provided"}
- Skills: ${resume.skills?.slice(0, 200) || "not provided"}
- Work experience: ${resume.work_experience?.slice(0, 500) || "not provided"}
- Education: ${resume.education?.slice(0, 200) || "not provided"}

Requirements:
- Professional business letter format
- 3–4 paragraphs: opening, value/experience, cultural fit/motivation, closing call to action
- Personalised to ${company} and the ${jobTitle} role
- Confident but not arrogant
- No clichés like "I am writing to apply for"
- End with a clear call to action
- Output only the letter body (no "Subject:" line or metadata)
- Keep it under 350 words`;
}

// ─── Core generate function ───────────────────────────────────────────────────

async function generateWithOpenAI(prompt: string): Promise<string> {
  const openai = getOpenAIClient();

  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",       // fast + cost-effective for CV tasks
    max_tokens: 800,
    temperature: 0.7,
    messages: [
      {
        role: "system",
        content:
          "You are an expert CV and cover letter writer with 15 years of experience helping candidates land jobs at top companies. Your writing is clear, professional, and tailored to the specific role.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) throw new Error("OpenAI returned an empty response.");
  return content;
}

// ─── Main server action ───────────────────────────────────────────────────────

export async function generateAiContent(
  feature: AiFeature,
  jobTitle: string,
  companyName: string
): Promise<AiGenerateResult> {
  // 1. Auth check — user must be logged in
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "You must be logged in to use AI features." };
  }

  // 2. Rate limit check
  if (!checkRateLimit(user.id)) {
    return {
      success: false,
      error: "Please wait a few seconds before generating again.",
    };
  }

  // 2b. Plan & kullanım kontrolü
  // Şu an yumuşak kontrol — engellemez, sadece uyarır.
  // OpenAI entegre edilince canUseAI() false dönünce hard block eklenecek.
  const profile = await getOrCreateProfile();
  if (profile && !canUseAI(profile.plan, profile.ai_usage_count)) {
    return {
      success: false,
      error: "Aylık ücretsiz AI kullanım limitine ulaştınız. Pro plana geçerek sınırsız kullanabilirsiniz.",
    };
  }

  // 3. Input validation
  if (!jobTitle?.trim()) {
    return { success: false, error: "Please enter a target job title first." };
  }

  // 4. Fetch resume data from DB (always use server-side data, not client payload)
  const { data: resume, error: resumeError } = await supabase
    .from("resumes")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (resumeError || !resume) {
    return {
      success: false,
      error: "Please save your CV data first before generating AI content.",
    };
  }

  // 5. Build the right prompt
  let prompt: string;
  try {
    switch (feature) {
      case "summary":
        prompt = buildSummaryPrompt(resume as ResumeData, jobTitle, companyName);
        break;
      case "work_experience":
        prompt = buildWorkExperiencePrompt(resume as ResumeData, jobTitle, companyName);
        break;
      case "cover_letter":
        prompt = buildCoverLetterPrompt(resume as ResumeData, jobTitle, companyName);
        break;
      default:
        return { success: false, error: "Unknown AI feature requested." };
    }
  } catch {
    return { success: false, error: "Failed to build prompt." };
  }

  // 6. Call OpenAI
  try {
    const content = await generateWithOpenAI(prompt);
    // Başarılı üretimde kullanım sayısını artır (hata olsa da devam et)
    await incrementAiUsage().catch((e) => console.error("incrementAiUsage hatası:", e));
    return { success: true, content };
  } catch (err) {
    console.error("OpenAI error:", err);

    // Surface a friendly message — never leak raw API errors to client
    const message =
      err instanceof Error && err.message.includes("API key")
        ? "OpenAI API key is not configured. Please check your .env.local file."
        : "AI generation failed. Please try again in a moment.";

    return { success: false, error: message };
  }
}

// ─── Optional: apply AI content directly to saved resume ─────────────────────
// Called only when the user clicks "Apply to CV" in the UI.

export async function applyAiToResume(
  field: "summary" | "work_experience",
  content: string
): Promise<AiGenerateResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "You must be logged in." };
  }

  if (!content?.trim()) {
    return { success: false, error: "No content to apply." };
  }

  const { error } = await supabase
    .from("resumes")
    .update({
      [field]: content.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (error) {
    return { success: false, error: "Failed to apply content to your CV." };
  }

  return { success: true, content: "Applied successfully." };
}
