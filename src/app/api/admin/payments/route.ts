import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { payments, families } from "@/db/schema";
import { getSession, isSuperAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !isSuperAdmin(session.user)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const rows = await db
      .select({
        id: payments.id,
        familyId: payments.familyId,
        amount: payments.amount,
        currency: payments.currency,
        status: payments.status,
        provider: payments.provider,
        createdAt: payments.createdAt,
      })
      .from(payments)
      .orderBy(desc(payments.createdAt))
      .limit(50);

    const familiesRows = await db.select({ id: families.id, name: families.name, plan: families.plan }).from(families);
    const familyMap = new Map(familiesRows.map((f) => [f.id, { name: f.name, plan: f.plan }]));

    return NextResponse.json(
      rows.map((row) => ({
        id: row.id,
        family: familyMap.get(row.familyId)?.name ?? "Famille inconnue",
        amount: Number((row.amount ?? 0) / 100),
        plan: familyMap.get(row.familyId)?.plan ?? "free",
        status: row.status,
        date: row.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error("Admin get payments error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
