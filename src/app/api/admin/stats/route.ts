import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, families, persons, subscriptions, payments } from "@/db/schema";
import { sql, count, sum } from "drizzle-orm";
import { getSession, isSuperAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !isSuperAdmin(session.user)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // Global stats
    const [userCount] = await db
      .select({ count: count() })
      .from(users);

    const [familyCount] = await db
      .select({ count: count() })
      .from(families);

    const [personCount] = await db
      .select({ count: count() })
      .from(persons);

    const [subCount] = await db
      .select({ count: count() })
      .from(subscriptions)
      .where(sql`status = 'active'`);

    const [revenue] = await db
      .select({ total: sum(payments.amount) })
      .from(payments)
      .where(sql`status = 'completed'`);

    // Plan distribution
    const planDistribution = await db
      .select({
        plan: families.plan,
        count: count(),
      })
      .from(families)
      .groupBy(families.plan);

    // Recent signups (last 30 days)
    const recentSignups = await db
      .select({ count: count() })
      .from(users)
      .where(
        sql`created_at > now() - interval '30 days'`
      );

    return NextResponse.json({
      users: userCount?.count ?? 0,
      families: familyCount?.count ?? 0,
      persons: personCount?.count ?? 0,
      activeSubscriptions: subCount?.count ?? 0,
      totalRevenue: revenue?.total ?? 0,
      planDistribution,
      recentSignups: recentSignups[0]?.count ?? 0,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
