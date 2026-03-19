"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import type { ActionResult } from "@/lib/types";

// ─── Sign Up ─────────────────────────────────────────────────────────────────

export async function signUp(formData: FormData): Promise<ActionResult> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // Basic validation
  if (!email || !email.includes("@")) {
    return { success: false, error: "Please enter a valid email address." };
  }
  if (!password || password.length < 6) {
    return { success: false, error: "Password must be at least 6 characters." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // After email confirmation the user lands on /dashboard
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/dashboard`,
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    data: "Account created! Check your email to confirm your address, then log in.",
  };
}

// ─── Log In ──────────────────────────────────────────────────────────────────

export async function logIn(formData: FormData): Promise<ActionResult> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { success: false, error: "Email and password are required." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { success: false, error: "Invalid email or password." };
  }

  redirect("/dashboard");
}

// ─── Log Out ─────────────────────────────────────────────────────────────────

export async function logOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
