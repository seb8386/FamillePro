import { db } from "@/db";
import { invitations, families, users, profiles, persons } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { InviteClient } from "./InviteClient";

export const dynamic = "force-dynamic";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const [invitation] = await db
    .select()
    .from(invitations)
    .where(eq(invitations.token, token));

  if (!invitation) {
    return <InviteClient status="invalid" />;
  }

  if (invitation.status !== "pending") {
    return <InviteClient status={invitation.status} />;
  }

  if (invitation.expiresAt < new Date()) {
    return <InviteClient status="expired" />;
  }

  const [family] = await db
    .select()
    .from(families)
    .where(eq(families.id, invitation.familyId));

  const [targetPerson] = invitation.personId
    ? await db
        .select({ firstName: persons.firstName, lastName: persons.lastName })
        .from(persons)
        .where(eq(persons.id, invitation.personId))
    : [];

  const [inviter] = await db
    .select({
      firstName: profiles.firstName,
      lastName: profiles.lastName,
    })
    .from(users)
    .innerJoin(profiles, eq(users.id, profiles.userId))
    .where(eq(users.id, invitation.invitedBy));

  return (
    <InviteClient
      status="valid"
      familyName={family?.name ?? "Famille"}
      inviterName={`${inviter?.firstName ?? ""} ${inviter?.lastName ?? ""}`.trim()}
      role={invitation.role}
      targetPersonName={targetPerson ? `${targetPerson.firstName} ${targetPerson.lastName}` : undefined}
      token={token}
    />
  );
}
