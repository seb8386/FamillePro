import { db } from "@/db";
import { families, subscriptions, payments } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession, resolveSelectedFamily } from "@/lib/auth";
import { PLAN_FEATURES, type Plan } from "@/types";
import { getFamilyUsage } from "@/lib/feature-flags";
import { BillingClient } from "./BillingClient";

export const dynamic = "force-dynamic";

export default async function BillingPage({
  searchParams,
}: {
  searchParams?: Promise<{ familyId?: string }>;
}) {
  const session = await getSession();
  if (!session) {
    return <div className="p-8 text-center"><a href="/login" className="text-blue-600">Se connecter</a></div>;
  }

  const params = searchParams ? await searchParams : {};
  const { familyId } = await resolveSelectedFamily(session, params.familyId);
  if (!familyId) {
    return <div className="p-8 text-center text-slate-500">Aucune famille sélectionnée.</div>;
  }

  const [family] = await db.select().from(families).where(eq(families.id, familyId));
  const plan = (family?.plan ?? "free") as Plan;
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

  return (
    <BillingClient
      currentPlan={plan}
      usage={usage}
      features={PLAN_FEATURES[plan]}
      currentFamilyId={familyId}
      subscriptions={subs.map((s) => ({
        ...s,
        currentPeriodStart: s.currentPeriodStart.toISOString(),
        currentPeriodEnd: s.currentPeriodEnd.toISOString(),
        trialEnd: s.trialEnd?.toISOString() ?? null,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      }))}
      recentPayments={recentPayments.map((p) => ({
        ...p,
        processedAt: p.processedAt?.toISOString() ?? null,
        createdAt: p.createdAt.toISOString(),
      }))}
    />
  );
}
