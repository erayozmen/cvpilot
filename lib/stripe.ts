/**
 * lib/stripe.ts
 * Stripe istemcisini oluşturur. Yalnızca sunucu tarafında çalışır.
 * API anahtarı hiçbir zaman tarayıcıya gönderilmez.
 */

import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY ortam değişkeni tanımlanmamış.");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
  typescript: true,
});
