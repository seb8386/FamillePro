import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { invitations, families, familyMembers, users, profiles, persons } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { hasPermission, type FamilyRole, type FamilyMember } from "@/types";
import { nanoid } from "nanoid";
import { logAudit } from "@/lib/audit";
import { createSessionToken, setSessionCookie } from "@/lib/auth";

// GET /api/invitations?familyId=xxx
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

    const invs = await db
      .select()
      .from(invitations)
      .where(eq(invitations.familyId, familyId));

    return NextResponse.json({ invitations: invs });
  } catch (error) {
    console.error("Get invitations error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST /api/invitations — Create invitation
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { familyId, personId, email, role: invitedRole, message } = await request.json();

    if (!familyId) {
      return NextResponse.json({ error: "familyId requis" }, { status: 400 });
    }

    const membership = session.user.families.find(
      (f) => f.familyId === familyId
    );
    if (!membership && session.user.systemRole !== "super_admin") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const role = (membership?.role ?? "admin") as FamilyRole;
    if (session.user.systemRole !== "super_admin" && !hasPermission(role, "invitation:create")) {
      return NextResponse.json(
        { error: "Permission insuffisante" },
        { status: 403 }
      );
    }

    if (personId) {
      const [person] = await db
        .select({ id: persons.id })
        .from(persons)
        .where(and(eq(persons.id, personId), eq(persons.familyId, familyId)));
      if (!person) {
        return NextResponse.json({ error: "La personne ciblée n'appartient pas à cette famille" }, { status: 400 });
      }
    }

    // Check feature flag: invite by link
    const plan = membership?.plan ?? "premium";
    if (session.user.systemRole !== "super_admin" && plan === "free") {
      return NextResponse.json(
        {
          error:
            "Les invitations par lien sont disponibles à partir du plan Plus",
          upgradeRequired: true,
        },
        { status: 402 }
      );
    }

    const token = nanoid(32);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const [invitation] = await db
      .insert(invitations)
      .values({
        familyId,
        personId: personId ?? null,
        token,
        email: email ?? null,
        role: invitedRole ?? "reader",
        invitedBy: session.user.id,
        status: "pending",
        expiresAt,
        message: message ?? null,
      })
      .returning();

    await logAudit({
      familyId,
      userId: session.user.id,
      action: "create_invitation",
      entityType: "invitation",
      entityId: invitation.id,
      metadata: { email, role: invitedRole },
    });

    // Return shareable link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const inviteLink = `${baseUrl}/invite/${token}`;

    return NextResponse.json({ invitation, inviteLink }, { status: 201 });
  } catch (error) {
    console.error("Create invitation error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
