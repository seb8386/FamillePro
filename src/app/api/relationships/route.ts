import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { relationships, persons } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { hasPermission, type FamilyRole, type RelationshipType } from "@/types";
import { logAudit } from "@/lib/audit";

// GET /api/relationships?familyId=xxx
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

    const membership = session.user.families.find(
      (f) => f.familyId === familyId
    );
    if (!membership && session.user.systemRole !== "super_admin") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const rels = await db
      .select()
      .from(relationships)
      .where(eq(relationships.familyId, familyId));

    return NextResponse.json({ relationships: rels });
  } catch (error) {
    console.error("Get relationships error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST /api/relationships — Create a relationship
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { familyId, personId1, personId2, type, startDate, endDate, notes } =
      await request.json();

    if (!familyId || !personId1 || !personId2 || !type) {
      return NextResponse.json(
        { error: "familyId, personId1, personId2 et type sont requis" },
        { status: 400 }
      );
    }

    const membership = session.user.families.find(
      (f) => f.familyId === familyId
    );
    if (!membership && session.user.systemRole !== "super_admin") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const role = (membership?.role ?? "reader") as FamilyRole;
    if (session.user.systemRole !== "super_admin" && !hasPermission(role, "tree:edit")) {
      return NextResponse.json(
        { error: "Permission insuffisante" },
        { status: 403 }
      );
    }

    // Verify both persons belong to this family
    const [p1] = await db
      .select()
      .from(persons)
      .where(and(eq(persons.id, personId1), eq(persons.familyId, familyId)));
    const [p2] = await db
      .select()
      .from(persons)
      .where(and(eq(persons.id, personId2), eq(persons.familyId, familyId)));

    if (!p1 || !p2) {
      return NextResponse.json(
        { error: "Une ou les deux personnes n'appartiennent pas à cette famille" },
        { status: 400 }
      );
    }

    const [relationship] = await db
      .insert(relationships)
      .values({
        familyId,
        personId1,
        personId2,
        type: type as RelationshipType,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        isCurrent: !endDate,
        notes: notes ?? null,
        createdBy: session.user.id,
      })
      .returning();

    await logAudit({
      familyId,
      userId: session.user.id,
      action: "add_relationship",
      entityType: "relationship",
      entityId: relationship.id,
      metadata: { type, personId1, personId2 },
    });

    return NextResponse.json({ relationship }, { status: 201 });
  } catch (error) {
    console.error("Create relationship error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
