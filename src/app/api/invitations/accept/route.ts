import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { familyMembers, invitations } from "@/db/schema";
import { getSession, setCurrentFamilyCookie } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });

  const { token } = await request.json();
  if (!token) return NextResponse.json({ error: "Token requis" }, { status: 400 });

  const [invitation] = await db
    .select()
    .from(invitations)
    .where(eq(invitations.token, token));

  if (!invitation || invitation.status !== "pending" || invitation.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invitation invalide ou expirée" }, { status: 400 });
  }

  const [existing] = await db
    .select({ id: familyMembers.id })
    .from(familyMembers)
    .where(and(eq(familyMembers.familyId, invitation.familyId), eq(familyMembers.userId, session.user.id)));

  if (!existing) {
    await db.insert(familyMembers).values({
      familyId: invitation.familyId,
      userId: session.user.id,
      role: invitation.role,
      invitedBy: invitation.invitedBy,
    });
  }

  await db.update(invitations).set({ status: "accepted", usedAt: new Date() }).where(eq(invitations.id, invitation.id));
  await setCurrentFamilyCookie(invitation.familyId);
  await logAudit({ familyId: invitation.familyId, userId: session.user.id, action: "accept_invitation", entityType: "invitation", entityId: invitation.id });

  return NextResponse.json({ success: true, familyId: invitation.familyId, personId: invitation.personId });
}
