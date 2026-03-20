import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error("Supabase servis anahtarları eksik.");
  return createClient(url, key);
}

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "İmza eksik." }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook imza doğrulama hatası:", err);
    return NextResponse.json({ error: "Geçersiz imza." }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  try {
    switch (event.type) {

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;

        // Önce subscription metadata'dan user id'yi dene
        let userId = sub.metadata?.supabase_user_id;

        // Yoksa stripe_customer_id üzerinden user_profiles tablosundan bul
        if (!userId && sub.customer) {
          const { data } = await supabase
            .from("user_profiles")
            .select("id")
            .eq("stripe_customer_id", sub.customer as string)
            .single();
          userId = data?.id;
        }

        if (!userId) {
          console.warn("Webhook: kullanıcı bulunamadı.", sub.id);
          break;
        }

        const isActive = sub.status === "active" || sub.status === "trialing";
        const priceId = sub.items.data[0]?.price?.id ?? null;
        const periodEnd = sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null;

        await supabase
          .from("user_profiles")
          .update({
            plan: isActive ? "pro" : "free",
            stripe_subscription_id: sub.id,
            stripe_price_id: priceId,
            subscription_status: sub.status,
            current_period_end: periodEnd,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        console.log(`Abonelik güncellendi: user=${userId} status=${sub.status} plan=${isActive ? "pro" : "free"}`);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;

        let userId = sub.metadata?.supabase_user_id;

        if (!userId && sub.customer) {
          const { data } = await supabase
            .from("user_profiles")
            .select("id")
            .eq("stripe_customer_id", sub.customer as string)
            .single();
          userId = data?.id;
        }

        if (!userId) break;

        await supabase
          .from("user_profiles")
          .update({
            plan: "free",
            stripe_subscription_id: null,
            stripe_price_id: null,
            subscription_status: "canceled",
            current_period_end: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        console.log(`Abonelik iptal edildi: user=${userId}`);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`Ödeme başarılı: customer=${invoice.customer}`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.warn(`Ödeme başarısız: customer=${invoice.customer}`);
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("Webhook işleme hatası:", err);
    return NextResponse.json({ error: "Sunucu hatası." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
