"use client";

import { Users, Search, Plus, Filter } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { useState } from "react";

interface Person {
  id: string;
  firstName: string;
  lastName: string;
  gender: string;
  birthDate: string | null;
  deathDate: string | null;
  isLiving: boolean;
  occupation: string | null;
  placeOfBirth: string | null;
}

interface Relationship {
  id: string;
  personId1: string;
  personId2: string;
  type: string;
}

export function MembersClient({
  persons,
  relationships,
}: {
  persons: Person[];
  relationships: Relationship[];
}) {
  const [search, setSearch] = useState("");
  const [filterGender, setFilterGender] = useState<string>("all");

  const filtered = persons.filter((p) => {
    const matchSearch =
      !search ||
      `${p.firstName} ${p.lastName}`
        .toLowerCase()
        .includes(search.toLowerCase());
    const matchGender =
      filterGender === "all" || p.gender === filterGender;
    return matchSearch && matchGender;
  });

  const genderLabel: Record<string, string> = {
    male: "Homme",
    female: "Femme",
    other: "Autre",
    unknown: "Inconnu",
  };

  const genderBadge: Record<string, "info" | "success" | "warning" | "default"> = {
    male: "info",
    female: "success",
    other: "warning",
    unknown: "default",
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-slate-900">Membres</h1>
          <Badge variant="info">{persons.length} personnes</Badge>
        </div>
      </div>

      {/* Search & filter */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un membre..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          {["all", "male", "female", "other"].map((g) => (
            <button
              key={g}
              onClick={() => setFilterGender(g)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filterGender === g
                  ? "bg-blue-100 text-blue-700"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {g === "all" ? "Tous" : genderLabel[g]}
            </button>
          ))}
        </div>
      </div>

      {/* Members grid */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <Users className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-4 text-slate-500">
            {search ? "Aucun résultat" : "Aucun membre dans cette famille"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((person) => {
            const relCount = relationships.filter(
              (r) => r.personId1 === person.id || r.personId2 === person.id
            ).length;

            return (
              <Card key={person.id} className="hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                      person.gender === "male"
                        ? "bg-blue-100 text-blue-700"
                        : person.gender === "female"
                        ? "bg-pink-100 text-pink-700"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {person.firstName[0]}
                    {person.lastName[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-slate-900">
                      {person.firstName} {person.lastName}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge variant={genderBadge[person.gender] ?? "default"}>
                        {genderLabel[person.gender] ?? "Inconnu"}
                      </Badge>
                      {person.isLiving ? (
                        <Badge variant="success">Vivant(e)</Badge>
                      ) : (
                        <Badge variant="default">Décédé(e)</Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
                  {person.birthDate && (
                    <div>
                      <span className="text-slate-400">Naissance:</span>{" "}
                      {new Date(person.birthDate).getFullYear()}
                    </div>
                  )}
                  {person.deathDate && (
                    <div>
                      <span className="text-slate-400">Décès:</span>{" "}
                      {new Date(person.deathDate).getFullYear()}
                    </div>
                  )}
                  {person.occupation && (
                    <div className="col-span-2">
                      <span className="text-slate-400">Prof.:</span>{" "}
                      {person.occupation}
                    </div>
                  )}
                  <div>
                    <span className="text-slate-400">Relations:</span> {relCount}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
