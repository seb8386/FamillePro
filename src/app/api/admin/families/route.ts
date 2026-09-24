import { NextRequest, NextResponse } from "next/server";
import { sql, eq, count } from "drizzle-orm";
import { db } from "@/db";
import { families, familyMembers, users } from "@/db/schema";
import { getSession, isSuperAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !isSuperAdmin(session.user)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const rows = await db
      .select({
        id: families.id,
        name: families.name,
        plan: families.plan,
        isActive: families.isActive,
        createdAt: families.createdAt,
        ownerId: families.ownerId,
      })
      .from(families)
      .orderBy(families.createdAt);

    const owners = await db
      .select({ id: users.id, email: users.email })
      .from(users);

    const ownerMap = new Map(owners.map((owner) => [owner.id, owner.email]));

    const members = await db
      .select({ familyId: familyMembers.familyId, count: count() })
      .from(familyMembers)
      .groupBy(familyMembers.familyId);

    const memberMap = new Map(members.map((member) => [member.familyId, Number(member.count)]));

    return NextResponse.json(
      rows.map((row) => ({
        id: row.id,
        name: row.name,
        owner: ownerMap.get(row.ownerId) ?? "Inconnu",
        members: memberMap.get(row.id) ?? 0,
        plan: row.plan,
        status: row.isActive ? "active" : "paused",
      }))
    );
  } catch (error) {
    console.error("Admin get families error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isSuperAdmin(session.user)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await request.json();
    const { name, ownerId, plan } = body;

    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: "Nom requis" }, { status: 400 });
    }

    const owner = ownerId ?? session.user.id;
    const safeSlug = `${String(name).trim().toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 48)}-${Math.random().toString(36).slice(2, 8)}`;

    const [family] = await db
      .insert(families)
      .values({
        name: String(name).trim(),
        slug: safeSlug,
        ownerId: owner,
        plan: (plan ?? "free") as "free" | "plus" | "premium",
        isActive: true,
      })
      .returning();

    await db.insert(familyMembers).values({
      familyId: family.id,
      userId: owner,
      role: "admin",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin create family error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isSuperAdmin(session.user)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const body = await request.json();
    const { name, plan, status } = body;

    await db
      .update(families)
      .set({
        ...(name ? { name: String(name).trim() } : {}),
        ...(plan ? { plan: plan as "free" | "plus" | "premium" } : {}),
        ...(status !== undefined ? { isActive: status === "active" } : {}),
        updatedAt: new Date(),
      })
      .where(eq(families.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin update family error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isSuperAdmin(session.user)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    await db.delete(families).where(eq(families.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin delete family error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
