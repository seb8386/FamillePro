import { db } from "@/db";
import { persons, relationships } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession, resolveSelectedFamily } from "@/lib/auth";
import { MembersClient } from "./MembersClient";

export const dynamic = "force-dynamic";

export default async function MembersPage({
  searchParams,
}: {
  searchParams?: Promise<{ familyId?: string }>;
}) {
  const session = await getSession();
  if (!session) {
    return <div className="p-8 text-center"><a href="/login" className="text-blue-600">Se connecter</a></div>;
  }

  const params = searchParams ? await searchParams : {};
  const { familyId } = await resolveSelectedFamily(session, params.familyId);
  if (!familyId) {
    return <div className="p-8 text-center text-slate-500">Aucune famille sélectionnée.</div>;
  }

  const familyPersons = await db
    .select()
    .from(persons)
    .where(eq(persons.familyId, familyId));

  const familyRelationships = await db
    .select()
    .from(relationships)
    .where(eq(relationships.familyId, familyId));

  return (
    <MembersClient
      persons={familyPersons.map((p) => ({
        ...p,
        birthDate: p.birthDate ? p.birthDate.toISOString() : null,
        deathDate: p.deathDate ? p.deathDate.toISOString() : null,
      }))}
      relationships={familyRelationships}
    />
  );
}
