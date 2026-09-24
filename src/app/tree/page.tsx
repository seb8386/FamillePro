import { db } from "@/db";
import { persons, relationships, familyMembers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession, resolveSelectedFamily } from "@/lib/auth";
import { hasPermission, type FamilyRole } from "@/types";
import { FamilyTreeClient } from "./FamilyTreeClient";

export const dynamic = "force-dynamic";

export default async function TreePage({
  searchParams,
}: {
  searchParams?: Promise<{ familyId?: string }>;
}) {
  const session = await getSession();

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <a
          href="/login"
          className="rounded-xl bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
        >
          Se connecter
        </a>
      </div>
    );
  }

  const params = searchParams ? await searchParams : {};
  const { familyId } = await resolveSelectedFamily(session, params.familyId);

  if (!familyId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-500">
          Aucune famille. Créez-en une pour commencer.
        </p>
      </div>
    );
  }

  const membership = session.user.families.find(
    (f) => f.familyId === familyId
  );
  const role = (membership?.role ?? "reader") as FamilyRole;
  const isSuperAdmin = session.user.systemRole === "super_admin";
  const canEdit = isSuperAdmin || hasPermission(role, "tree:edit");
  const canInvite = isSuperAdmin || hasPermission(role, "invitation:create");

  const familyPersons = await db
    .select()
    .from(persons)
    .where(eq(persons.familyId, familyId));

  const familyRelationships = await db
    .select()
    .from(relationships)
    .where(eq(relationships.familyId, familyId));

  const serializedPersons = familyPersons.map((p) => ({
    ...p,
    birthDate: p.birthDate ? p.birthDate.toISOString() : null,
    deathDate: p.deathDate ? p.deathDate.toISOString() : null,
  }));

  return (
    <FamilyTreeClient
      persons={serializedPersons}
      relationships={familyRelationships}
      familyId={familyId}
      canEdit={canEdit}
      canInvite={canInvite}
    />
  );
}
