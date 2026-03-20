"use server";

import { redirect } from "next/navigation";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase-server";
import type { ActionResult } from "@/lib/types";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// ─── Stripe Checkout oturumu oluştur ─────────────────────────────────────────

export async function createCheckoutSession(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Ödeme yapmak için giriş yapmanız gerekiyor." };
  }

  // Kullanıcının profil & stripe customer bilgisini al
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("stripe_customer_id, plan")
    .eq("id", user.id)
    .single();

  // Zaten Pro ise yönlendirme
  if (profile?.plan === "pro") {
    return { success: false, error: "Zaten Pro planındasınız." };
  }

  // Mevcut Stripe müşteri id'si varsa kullan, yoksa yeni oluştur
  let customerId = profile?.stripe_customer_id as string | undefined;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;

    // Profilde kaydet
    await supabase
      .from("user_profiles")
      .update({ stripe_customer_id: customerId, updated_at: new Date().toISOString() })
      .eq("id", user.id);
  }

  // Checkout oturumu oluştur
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: process.env.STRIPE_PRO_PRICE_ID!,
        quantity: 1,
      },
    ],
    success_url: `${SITE_URL}/dashboard?upgrade=success`,
    cancel_url: `${SITE_URL}/dashboard?upgrade=cancel`,
    metadata: { supabase_user_id: user.id },
    subscription_data: {
      metadata: { supabase_user_id: user.id },
    },
  });

  if (!session.url) {
    return { success: false, error: "Ödeme sayfası oluşturulamadı." };
  }

  redirect(session.url);
}

// ─── Stripe Customer Portal (abonelik yönetimi) ───────────────────────────────

export async function createPortalSession(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Giriş yapmanız gerekiyor." };
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_customer_id) {
    return { success: false, error: "Stripe hesabı bulunamadı." };
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id as string,
    return_url: `${SITE_URL}/dashboard`,
  });

  redirect(session.url);
}
