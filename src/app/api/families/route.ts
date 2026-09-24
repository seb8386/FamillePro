import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { families, familyMembers, invitations, persons } from "@/db/schema";
import { eq, and, count } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/types";
import { canAddMember } from "@/lib/feature-flags";
import { nanoid } from "nanoid";
import { logAudit } from "@/lib/audit";

// GET /api/families — List user's families
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    return NextResponse.json({
      families: session.user.families,
      currentFamilyId: session.currentFamilyId,
    });
  } catch (error) {
    console.error("Get families error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST /api/families — Create a new family
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { name } = await request.json();
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Le nom de la famille est requis" },
        { status: 400 }
      );
    }

    const slug = `${name.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 50)}-${nanoid(6)}`;

    const [family] = await db
      .insert(families)
      .values({
        name: name.trim(),
        slug,
        ownerId: session.user.id,
        plan: "free",
        isActive: true,
      })
      .returning();

    // Add creator as admin
    await db.insert(familyMembers).values({
      familyId: family.id,
      userId: session.user.id,
      role: "admin",
    });

    await logAudit({
      familyId: family.id,
      userId: session.user.id,
      action: "create_family",
      entityType: "family",
      entityId: family.id,
    });

    return NextResponse.json({ family }, { status: 201 });
  } catch (error) {
    console.error("Create family error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
