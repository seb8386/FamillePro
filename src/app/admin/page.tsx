import { db } from "@/db";
import { users, families, persons, subscriptions } from "@/db/schema";
import { sql, count } from "drizzle-orm";
import { getSession, isSuperAdmin } from "@/lib/auth";
import { AdminDashboardClient } from "./AdminDashboardClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getSession();
  if (!session || !isSuperAdmin(session.user)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500">Accès réservé aux super-administrateurs</p>
          <a href="/login" className="mt-4 inline-block text-blue-600 hover:underline">
            Se connecter
          </a>
        </div>
      </div>
    );
  }

  // Global stats
  const [userCount] = await db.select({ count: count() }).from(users);
  const [familyCount] = await db.select({ count: count() }).from(families);
  const [personCount] = await db.select({ count: count() }).from(persons);

  const planDistribution = await db
    .select({
      plan: families.plan,
      count: count(),
    })
    .from(families)
    .groupBy(families.plan);

  return (
    <AdminDashboardClient
      stats={{
        users: userCount?.count ?? 0,
        families: familyCount?.count ?? 0,
        persons: personCount?.count ?? 0,
        planDistribution,
      }}
    />
  );
}
