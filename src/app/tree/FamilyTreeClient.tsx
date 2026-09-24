"use client";

import { FamilyTree } from "@/components/tree/FamilyTree";

interface Person {
  id: string;
  firstName: string;
  lastName: string;
  gender: string;
  birthDate: string | null;
  deathDate: string | null;
  isLiving: boolean;
  avatarUrl: string | null;
  occupation: string | null;
}

interface Relationship {
  id: string;
  personId1: string;
  personId2: string;
  type: string;
}

export function FamilyTreeClient({
  persons,
  relationships,
  familyId,
  canEdit,
  canInvite,
}: {
  persons: Person[];
  relationships: Relationship[];
  familyId: string;
  canEdit: boolean;
  canInvite: boolean;
}) {
  return (
    <FamilyTree
      persons={persons}
      relationships={relationships}
      familyId={familyId}
      canEdit={canEdit}
      canInvite={canInvite}
    />
  );
}
