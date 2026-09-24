import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { personProposals, persons } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { hasPermission, type FamilyRole } from "@/types";
import { logAudit } from "@/lib/audit";

function membershipFor(session: Awaited<ReturnType<typeof getSession>>, familyId: string) {
  return session?.user.families.find((family) => family.familyId === familyId);
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const familyId = request.nextUrl.searchParams.get("familyId");
  if (!familyId) return NextResponse.json({ error: "familyId requis" }, { status: 400 });
  const membership = membershipFor(session, familyId);
  if (!membership && session.user.systemRole !== "super_admin") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const proposals = await db.select().from(personProposals).where(eq(personProposals.familyId, familyId)).orderBy(desc(personProposals.createdAt));
  return NextResponse.json({ proposals });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { familyId, personId, changes } = await request.json();
  if (!familyId || !personId || !changes || typeof changes !== "object") {
    return NextResponse.json({ error: "familyId, personId et changes sont requis" }, { status: 400 });
  }
  const membership = membershipFor(session, familyId);
  if (!membership && session.user.systemRole !== "super_admin") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  const role = (membership?.role ?? "contributor") as FamilyRole;
  if (session.user.systemRole !== "super_admin" && !hasPermission(role, "tree:edit")) {
    return NextResponse.json({ error: "Permission insuffisante" }, { status: 403 });
  }
  const [person] = await db.select({ id: persons.id }).from(persons).where(and(eq(persons.id, personId), eq(persons.familyId, familyId)));
  if (!person) return NextResponse.json({ error: "Personne introuvable dans cette famille" }, { status: 400 });

  const [proposal] = await db.insert(personProposals).values({
    familyId,
    personId,
    proposedBy: session.user.id,
    changes,
    status: "pending",
  }).returning();
  await logAudit({ familyId, userId: session.user.id, action: "submit_person_proposal", entityType: "person_proposal", entityId: proposal.id });
  return NextResponse.json({ proposal }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { familyId, proposalId, status, reviewNote } = await request.json();
  const membership = familyId ? membershipFor(session, familyId) : null;
  if (!familyId || !proposalId || !["approved", "rejected"].includes(status)) return NextResponse.json({ error: "Données de validation invalides" }, { status: 400 });
  if (session.user.systemRole !== "super_admin" && (!membership || membership.role !== "admin")) return NextResponse.json({ error: "Seul un administrateur peut valider" }, { status: 403 });

  const [proposal] = await db.select().from(personProposals).where(and(eq(personProposals.id, proposalId), eq(personProposals.familyId, familyId), eq(personProposals.status, "pending")));
  if (!proposal) return NextResponse.json({ error: "Proposition introuvable ou déjà traitée" }, { status: 404 });
  const now = new Date();
  if (status === "approved") {
    const safeChanges = proposal.changes;
    await db.update(persons).set({
      firstName: typeof safeChanges.firstName === "string" ? safeChanges.firstName.trim() : undefined,
      lastName: typeof safeChanges.lastName === "string" ? safeChanges.lastName.trim() : undefined,
      bio: typeof safeChanges.bio === "string" ? safeChanges.bio : undefined,
      occupation: typeof safeChanges.occupation === "string" ? safeChanges.occupation : undefined,
      updatedAt: now,
    }).where(and(eq(persons.id, proposal.personId), eq(persons.familyId, familyId)));
  }
  const [updated] = await db.update(personProposals).set({ status, reviewedBy: session.user.id, reviewedAt: now, reviewNote: reviewNote ?? null }).where(eq(personProposals.id, proposal.id)).returning();
  await logAudit({ familyId, userId: session.user.id, action: status === "approved" ? "approve_person_proposal" : "reject_person_proposal", entityType: "person_proposal", entityId: proposal.id });
  return NextResponse.json({ proposal: updated });
}
