import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  persons,
  relationships,
  familyMembers,
  users,
  profiles,
  families,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { hasPermission, type FamilyRole } from "@/types";
import { canAddMember } from "@/lib/feature-flags";
import { logAudit } from "@/lib/audit";

// GET /api/members?familyId=xxx — List persons in a family
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const familyId = request.nextUrl.searchParams.get("familyId");
    if (!familyId) {
      return NextResponse.json(
        { error: "familyId est requis" },
        { status: 400 }
      );
    }

    // Verify membership
    const membership = session.user.families.find(
      (f) => f.familyId === familyId
    );
    if (!membership && session.user.systemRole !== "super_admin") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const familyPersons = await db
      .select()
      .from(persons)
      .where(eq(persons.familyId, familyId));

    return NextResponse.json({ persons: familyPersons });
  } catch (error) {
    console.error("Get members error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST /api/members — Add a new person to the family tree
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const {
      familyId,
      firstName,
      lastName,
      gender,
      birthDate,
      deathDate,
      maidenName,
      bio,
      placeOfBirth,
      occupation,
    } = body;

    if (!familyId || !firstName || !lastName) {
      return NextResponse.json(
        { error: "familyId, prénom et nom sont requis" },
        { status: 400 }
      );
    }

    // Verify membership and permission
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

    // Check feature limit
    if (session.user.systemRole !== "super_admin") {
      const check = await canAddMember(familyId, membership?.plan ?? "free");
      if (!check.allowed) {
        return NextResponse.json(
          {
            error: `Limite atteinte : ${check.current}/${check.limit} membres. Passez à un plan supérieur.`,
            limitExceeded: true,
            current: check.current,
            limit: check.limit,
          },
          { status: 402 }
        );
      }
    }

    const normalizedFirstName = firstName.trim().toLowerCase();
    const normalizedLastName = lastName.trim().toLowerCase();
    const existingPeople = await db
      .select({ id: persons.id, firstName: persons.firstName, lastName: persons.lastName, birthDate: persons.birthDate })
      .from(persons)
      .where(eq(persons.familyId, familyId));
    const duplicate = existingPeople.find((existingPerson) =>
      existingPerson.firstName.trim().toLowerCase() === normalizedFirstName &&
      existingPerson.lastName.trim().toLowerCase() === normalizedLastName &&
      birthDate && existingPerson.birthDate &&
      existingPerson.birthDate.getTime() === new Date(birthDate).getTime()
    );
    if (duplicate) {
      return NextResponse.json(
        { error: "Cette personne existe déjà dans l’arbre. Vérifiez la fiche avant de la recréer.", duplicatePersonId: duplicate.id },
        { status: 409 }
      );
    }

    const [person] = await db
      .insert(persons)
      .values({
        familyId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        maidenName: maidenName ?? null,
        gender: gender ?? "unknown",
        birthDate: birthDate ? new Date(birthDate) : null,
        deathDate: deathDate ? new Date(deathDate) : null,
        bio: bio ?? null,
        placeOfBirth: placeOfBirth ?? null,
        occupation: occupation ?? null,
        isLiving: deathDate ? false : true,
        createdBy: session.user.id,
      })
      .returning();

    await logAudit({
      familyId,
      userId: session.user.id,
      action: "add_person",
      entityType: "person",
      entityId: person.id,
    });

    return NextResponse.json({ person }, { status: 201 });
  } catch (error) {
    console.error("Add member error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
