import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/db";
import { families, subscriptions, payments } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { PLAN_FEATURES, type Plan } from "@/types";
import { getFamilyUsage } from "@/lib/feature-flags";
import { getEnv } from "@/lib/env";

const stripeSecretKey = getEnv("STRIPE_SECRET_KEY");
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, { apiVersion: "2026-08-26.dahlia" }) : null;

const STRIPE_PRICE_MAP: Record<Plan, string> = {
  free: "",
  plus: getEnv("STRIPE_PRICE_PLUS") ?? "",
  premium: getEnv("STRIPE_PRICE_PREMIUM") ?? "",
};

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const familyId = request.nextUrl.searchParams.get("familyId");
    if (!familyId) {
      return NextResponse.json({ error: "familyId requis" }, { status: 400 });
    }

    const membership = session.user.families.find((f) => f.familyId === familyId);
    if (!membership && session.user.systemRole !== "super_admin") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const [family] = await db.select().from(families).where(eq(families.id, familyId));

    const plan = (family?.plan ?? "free") as Plan;
    const features = PLAN_FEATURES[plan];
    const usage = await getFamilyUsage(familyId);

    const subs = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.familyId, familyId))
      .orderBy(desc(subscriptions.createdAt));

    const recentPayments = await db
      .select()
      .from(payments)
      .where(eq(payments.familyId, familyId))
      .orderBy(desc(payments.createdAt))
      .limit(10);

    return NextResponse.json({
      plan,
      features,
      usage,
      subscriptions: subs,
      recentPayments,
    });
  } catch (error) {
    console.error("Get subscription error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { familyId, plan } = await request.json();
    if (!familyId || !plan) {
      return NextResponse.json({ error: "familyId et plan requis" }, { status: 400 });
    }

    const membership = session.user.families.find((f) => f.familyId === familyId);
    if (!membership && session.user.systemRole !== "super_admin") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const normalizedPlan = plan === "premium" ? "premium" : "plus";
    const priceId = STRIPE_PRICE_MAP[normalizedPlan];
    if (!priceId || !stripe) {
      return NextResponse.json(
        { error: "Paiement Stripe non configuré. Ajoutez STRIPE_SECRET_KEY et STRIPE_PRICE_PLUS/PREMIUM." },
        { status: 400 }
      );
    }

    const checkoutParams: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/billing?status=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/billing?status=cancelled`,
      client_reference_id: familyId,
      metadata: { familyId, plan: normalizedPlan },
      billing_address_collection: "auto",
      allow_promotion_codes: true,
      // Désactive l'obligation du Product Tax Code pour la session Checkout
      managed_payments: {
        enabled: false,
      },
    } as any;

    const checkout = await stripe.checkout.sessions.create(checkoutParams);

    return NextResponse.json({ url: checkout.url });
  } catch (error: any) {
    console.error("Create checkout error:", error?.raw?.message || error?.message || error);
    return NextResponse.json(
      { error: error?.raw?.message || error?.message || "Erreur lors de la création du paiement" },
      { status: 500 }
    );
  }
}