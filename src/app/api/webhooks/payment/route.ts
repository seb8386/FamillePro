import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { families, subscriptions, payments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { logAudit } from "@/lib/audit";
import { getEnv } from "@/lib/env";
import type { PaymentProvider, Plan } from "@/types";
import Stripe from "stripe";

const stripeSecretKey = getEnv("STRIPE_SECRET_KEY");
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, { apiVersion: "2026-08-26.dahlia" }) : null;

const WEBHOOK_SECRETS: Record<string, string> = {
  flexpay: process.env.FLEXPAY_WEBHOOK_SECRET ?? "",
  paystack: process.env.PAYSTACK_WEBHOOK_SECRET ?? "",
  maxicash: process.env.MAXICASH_WEBHOOK_SECRET ?? "",
  stripe: process.env.STRIPE_WEBHOOK_SECRET ?? "",
};

const PROVIDER_PLAN_MAP: Record<string, Plan> = {
  free: "free",
  plus: "plus",
  premium: "premium",
  basic: "plus",
  pro: "premium",
};

function verifySignature(provider: string, body: string, signature: string): boolean {
  const secret = WEBHOOK_SECRETS[provider];
  if (!secret) return false;

  if (provider === "stripe") {
    if (!stripe) return false;
    try {
      const event = stripe.webhooks.constructEvent(body, signature, secret);
      return Boolean(event);
    } catch {
      return false;
    }
  }

  return signature === secret || process.env.NODE_ENV === "development";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const provider = (request.headers.get("x-payment-provider") ?? "stripe") as PaymentProvider;
    const signature = request.headers.get("x-webhook-signature") ?? "";

    if (!provider || !["flexpay", "paystack", "maxicash", "stripe"].includes(provider)) {
      return NextResponse.json({ error: "Provider non supporté" }, { status: 400 });
    }

    if (!verifySignature(provider, body, signature)) {
      return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
    }

    let payload: any;
    if (provider === "stripe") {
      if (!stripe || !WEBHOOK_SECRETS.stripe) {
        return NextResponse.json({ error: "Webhook Stripe non configuré" }, { status: 500 });
      }
      payload = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRETS.stripe);
    } else {
      payload = JSON.parse(body);
    }

    const event = payload.type;
    const data = provider === "stripe" ? payload.data.object : payload.data;

    const familyId =
      data.metadata?.familyId ??
      data.familyId ??
      payload?.familyId ??
      null;

    if (!familyId) {
      return NextResponse.json({ error: "Famille manquante dans le payload" }, { status: 400 });
    }

    switch (event) {
      case "checkout.session.completed": {
        const session = data;
        const amount = Number(session.amount_total ?? 0);
        const plan =
          (session.metadata?.plan ? PROVIDER_PLAN_MAP[session.metadata.plan] : undefined) ?? "plus";

        const [family] = await db.select().from(families).where(eq(families.id, familyId));
        if (!family) {
          return NextResponse.json({ error: "Famille non trouvée" }, { status: 404 });
        }

        const [payment] = await db
          .insert(payments)
          .values({
            familyId,
            amount,
            currency: (session.currency ?? "usd").toUpperCase(),
            provider: "stripe",
            providerPaymentId: session.id,
            status: "completed",
            webhookData: session,
            processedAt: new Date(),
          })
          .returning();

        const now = new Date();
        const periodEnd = new Date();
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);

        const [sub] = await db
          .insert(subscriptions)
          .values({
            familyId,
            plan,
            status: "active",
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            provider: "stripe",
            providerSubscriptionId: session.subscription ?? session.id,
          })
          .onConflictDoNothing()
          .returning();

        if (sub) {
          await db.update(payments).set({ subscriptionId: sub.id }).where(eq(payments.id, payment.id));
        }

        await db.update(families).set({ plan, updatedAt: now }).where(eq(families.id, familyId));

        await logAudit({
          familyId,
          action: "payment_success",
          entityType: "payment",
          entityId: payment.id,
          metadata: { amount, plan, provider: "stripe" },
        });

        break;
      }
      case "invoice.payment_failed":
      case "checkout.session.async_payment_failed": {
        await db
          .insert(payments)
          .values({
            familyId,
            amount: Number(data.amount_total ?? 0),
            currency: (data.currency ?? "usd").toUpperCase(),
            provider: "stripe",
            providerPaymentId: data.id,
            status: "failed",
            webhookData: data,
          });

        await logAudit({
          familyId,
          action: "payment_failed",
          entityType: "payment",
          metadata: { amount: Number(data.amount_total ?? 0), provider: "stripe", reference: data.id },
        });
        break;
      }
      case "customer.subscription.deleted": {
        await db.update(subscriptions)
          .set({ status: "canceled", cancelAtPeriodEnd: true, updatedAt: new Date() })
          .where(eq(subscriptions.familyId, familyId));

        await db.update(families)
          .set({ plan: "free", updatedAt: new Date() })
          .where(eq(families.id, familyId));
        break;
      }
      default:
        console.log(`Unhandled webhook event: ${event}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Erreur de traitement du webhook" }, { status: 500 });
  }
}

