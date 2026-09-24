"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  Link2,
  Heart,
  Baby,
  Users,
  ZoomIn,
  ZoomOut,
  Maximize,
  UserPlus,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { ProposalModal } from "@/components/tree/ProposalModal";

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

interface FamilyTreeProps {
  persons: Person[];
  relationships: Relationship[];
  familyId: string;
  canEdit: boolean;
  canInvite: boolean;
}

type BranchKey = "all" | "direct" | "paternal" | "maternal" | "spouse";

function formatYear(dateStr: string | null): string {
  if (!dateStr) return "?";
  return new Date(dateStr).getFullYear().toString();
}

export function FamilyTree({
  persons,
  relationships,
  familyId,
  canEdit,
  canInvite,
}: FamilyTreeProps) {
  const [zoom, setZoom] = useState(1);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [relateModalOpen, setRelateModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [proposalModalOpen, setProposalModalOpen] = useState(false);
  const [activeBranch, setActiveBranch] = useState<BranchKey>("all");

  const branchData = useMemo(() => {
    if (persons.length === 0 || activeBranch === "all") {
      return { persons, relationships };
    }

    const root = persons[0];
    const parentLinks = relationships.flatMap((relationship) => {
      if (["parent", "adoptive_parent"].includes(relationship.type)) return [{ parent: relationship.personId1, child: relationship.personId2 }];
      if (["child", "adoptive_child"].includes(relationship.type)) return [{ parent: relationship.personId2, child: relationship.personId1 }];
      return [];
    });
    const addConnected = (startIds: string[], allowedTypes?: string[]) => {
      const ids = new Set(startIds);
      const queue = [...startIds];
      while (queue.length > 0) {
        const current = queue.shift()!;
        relationships.forEach((relationship) => {
          if (allowedTypes && !allowedTypes.includes(relationship.type)) return;
          if (relationship.personId1 !== current && relationship.personId2 !== current) return;
          const next = relationship.personId1 === current ? relationship.personId2 : relationship.personId1;
          if (!ids.has(next)) {
            ids.add(next);
            queue.push(next);
          }
        });
      }
      return ids;
    };

    let selectedIds = new Set<string>([root.id]);
    if (activeBranch === "spouse") {
      const spouseIds = relationships.filter((relationship) => relationship.type === "spouse" && (relationship.personId1 === root.id || relationship.personId2 === root.id)).map((relationship) => relationship.personId1 === root.id ? relationship.personId2 : relationship.personId1);
      selectedIds = addConnected([root.id, ...spouseIds], ["spouse", "parent", "child", "adoptive_parent", "adoptive_child"]);
    } else if (activeBranch === "direct") {
      selectedIds = addConnected([root.id], ["parent", "child", "adoptive_parent", "adoptive_child"]);
    } else {
      const rootParents = parentLinks.filter((link) => link.child === root.id).map((link) => link.parent);
      const gender = activeBranch === "paternal" ? "male" : "female";
      const branchParents = rootParents.filter((id) => persons.find((person) => person.id === id)?.gender === gender);
      selectedIds = addConnected(branchParents.length > 0 ? branchParents : rootParents, ["parent", "child", "adoptive_parent", "adoptive_child"]);
      selectedIds.add(root.id);
    }

    return {
      persons: persons.filter((person) => selectedIds.has(person.id)),
      relationships: relationships.filter((relationship) => selectedIds.has(relationship.personId1) && selectedIds.has(relationship.personId2)),
    };
  }, [activeBranch, persons, relationships]);

  const layout = useMemo(() => {
    const NODE_W = 180;
    const NODE_H = 80;
    const H_GAP = 42;
    const V_GAP = 150;
    const parentToChild = branchData.relationships.flatMap((relationship) => {
      if (["parent", "adoptive_parent"].includes(relationship.type)) {
        return [{ from: relationship.personId1, to: relationship.personId2 }];
      }
      if (["child", "adoptive_child"].includes(relationship.type)) {
        return [{ from: relationship.personId2, to: relationship.personId1 }];
      }
      return [];
    });
    const childrenByParent = new Map<string, string[]>();
    const parentsByChild = new Map<string, string[]>();
    for (const edge of parentToChild) {
      childrenByParent.set(edge.from, [...(childrenByParent.get(edge.from) ?? []), edge.to]);
      parentsByChild.set(edge.to, [...(parentsByChild.get(edge.to) ?? []), edge.from]);
    }

    const generation = new Map<string, number>();
    const queue = branchData.persons.filter((person) => !parentsByChild.has(person.id)).map((person) => person.id);
    if (queue.length === 0 && branchData.persons[0]) queue.push(branchData.persons[0].id);
    while (queue.length > 0) {
      const personId = queue.shift()!;
      const currentGeneration = generation.get(personId) ?? 0;
      for (const childId of childrenByParent.get(personId) ?? []) {
        generation.set(childId, Math.max(generation.get(childId) ?? 0, currentGeneration + 1));
        if (!queue.includes(childId)) queue.push(childId);
      }
    }
    branchData.persons.forEach((person) => {
      if (!generation.has(person.id)) generation.set(person.id, 0);
    });

    const spouses = new Map<string, string[]>();
    branchData.relationships.filter((relationship) => relationship.type === "spouse").forEach((relationship) => {
      spouses.set(relationship.personId1, [...(spouses.get(relationship.personId1) ?? []), relationship.personId2]);
      spouses.set(relationship.personId2, [...(spouses.get(relationship.personId2) ?? []), relationship.personId1]);
      const sharedGeneration = Math.max(generation.get(relationship.personId1) ?? 0, generation.get(relationship.personId2) ?? 0);
      generation.set(relationship.personId1, sharedGeneration);
      generation.set(relationship.personId2, sharedGeneration);
    });

    const groups = new Map<number, string[]>();
    const placed = new Set<string>();
    branchData.persons.forEach((person) => {
      if (placed.has(person.id)) return;
      const group = [person.id, ...(spouses.get(person.id) ?? [])].filter((id, index, ids) => ids.indexOf(id) === index);
      group.forEach((id) => placed.add(id));
      const level = generation.get(person.id) ?? 0;
      groups.set(level, [...(groups.get(level) ?? []), ...group]);
    });

    const nodes: (Person & { x: number; y: number; gen: number })[] = [];
    [...groups.entries()].sort(([left], [right]) => left - right).forEach(([level, ids]) => {
      ids.forEach((id, index) => {
        const person = branchData.persons.find((item) => item.id === id);
        if (person) nodes.push({ ...person, x: 30 + index * (NODE_W + H_GAP), y: 30 + level * V_GAP, gen: level });
      });
    });

    return {
      nodes,
      edges: [
        ...branchData.relationships.filter((relationship) => relationship.type === "spouse").map((relationship) => ({ from: relationship.personId1, to: relationship.personId2, type: "spouse" })),
        ...parentToChild.map((edge) => ({ ...edge, type: "parent" })),
      ],
      NODE_W,
      NODE_H,
    };
  }, [branchData]);

  const genderColors: Record<string, string> = {
    male: "bg-blue-100 border-blue-300 text-blue-800",
    female: "bg-pink-100 border-pink-300 text-pink-800",
    other: "bg-purple-100 border-purple-300 text-purple-800",
    unknown: "bg-slate-100 border-slate-300 text-slate-700",
  };

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-slate-900">
            Arbre Généalogique
          </h2>
          <Badge variant="info">{branchData.persons.length} personnes</Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs text-slate-500 w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setZoom(Math.min(2, zoom + 0.1))}
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setZoom(1)}
          >
            <Maximize className="h-3.5 w-3.5" />
          </Button>

          {canEdit && (
            <>
              <div className="mx-2 h-6 w-px bg-slate-200" />
              <Button size="sm" onClick={() => setAddModalOpen(true)}>
                <UserPlus className="h-3.5 w-3.5" />
                Ajouter
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRelateModalOpen(true)}
              >
                <Link2 className="h-3.5 w-3.5" />
                Relier
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="mb-4 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1">
        <div className="flex min-w-max gap-1" role="tablist" aria-label="Branches de la famille">
          {([
            ["all", "Tout l’arbre"],
            ["direct", "Famille directe"],
            ["paternal", "Branche paternelle"],
            ["maternal", "Branche maternelle"],
            ["spouse", "Famille du conjoint"],
          ] as [BranchKey, string][]).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={activeBranch === key}
              onClick={() => setActiveBranch(key)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${activeBranch === key ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tree canvas */}
      <div className="flex-1 overflow-auto rounded-xl border border-slate-200 bg-slate-50/50">
        {branchData.persons.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Users className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-4 text-lg font-medium text-slate-600">
                Aucun membre dans l&apos;arbre
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                Commencez par ajouter le premier membre de votre famille
              </p>
              {canEdit && (
                <Button
                  className="mt-4"
                  onClick={() => setAddModalOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  Ajouter un membre
                </Button>
              )}
            </div>
          </div>
        ) : (
          <svg
            width={Math.max(800, (Math.max(...layout.nodes.map((node) => node.x), 0) + layout.NODE_W + 80) * zoom)}
            height={Math.max(400, ((Math.max(...layout.nodes.map((node) => node.gen), 0) + 1) * 150 + 120) * zoom)}
            className="block min-w-full bg-slate-50"
          >
            <g transform={`scale(${zoom})`}>
              {/* Edges */}
              {layout.edges.map((edge) => {
                const from = layout.nodes.find((n) => n.id === edge.from);
                const to = layout.nodes.find((n) => n.id === edge.to);
                if (!from || !to) return null;

                const isSpouse = edge.type === "spouse";
                const x1 = from.x + layout.NODE_W / 2;
                const y1 = from.y + layout.NODE_H;
                const x2 = to.x + layout.NODE_W / 2;
                const y2 = to.y;

                return (
                  <g key={`${edge.from}-${edge.to}`}>
                    {isSpouse ? (
                      <line
                        x1={from.x + layout.NODE_W}
                        y1={from.y + layout.NODE_H / 2}
                        x2={to.x}
                        y2={to.y + layout.NODE_H / 2}
                        stroke="#e11d48"
                        strokeWidth={3}
                      />
                    ) : (
                      <path
                        d={`M ${x1} ${y1} C ${x1} ${y1 + 35}, ${x2} ${y2 - 35}, ${x2} ${y2}`}
                        fill="none"
                        stroke="#64748b"
                        strokeWidth={3}
                      />
                    )}
                    {isSpouse && (
                      <text
                        x={(from.x + 180 + to.x) / 2}
                        y={from.y + 32}
                        textAnchor="middle"
                        fill="#e11d48"
                        fontSize="16"
                      >
                        ❤
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Nodes */}
              {layout.nodes.map((node) => (
                <g
                  key={node.id}
                  onClick={() => setSelectedPerson(node)}
                    className="cursor-pointer"
                    aria-label={`${node.firstName} ${node.lastName}`}
                >
                  <rect
                    x={node.x}
                    y={node.y}
                    width={layout.NODE_W}
                    height={layout.NODE_H}
                    rx={12}
                    fill={node.gender === "female" ? "#fce7f3" : node.gender === "male" ? "#dbeafe" : "#f1f5f9"}
                    stroke={selectedPerson?.id === node.id ? "#0f766e" : node.gender === "female" ? "#f9a8d4" : node.gender === "male" ? "#93c5fd" : "#cbd5e1"}
                    strokeWidth={selectedPerson?.id === node.id ? 4 : 2}
                  />
                  <text
                    x={node.x + 90}
                    y={node.y + 28}
                    textAnchor="middle"
                    fill="#0f172a"
                    fontSize="13"
                    fontWeight="700"
                  >
                    {node.firstName} {node.lastName}
                  </text>
                  <text
                    x={node.x + 90}
                    y={node.y + 48}
                    textAnchor="middle"
                    fill="#475569"
                    fontSize="11"
                  >
                    {formatYear(node.birthDate)}
                    {node.deathDate ? ` — ${formatYear(node.deathDate)}` : ""}
                  </text>
                  {node.occupation && (
                    <text
                      x={node.x + 90}
                      y={node.y + 64}
                      textAnchor="middle"
                      fill="#64748b"
                      fontSize="10"
                    >
                      {node.occupation.length > 20
                        ? node.occupation.slice(0, 20) + "…"
                        : node.occupation}
                    </text>
                  )}
                </g>
              ))}
            </g>
          </svg>
        )}
      </div>

      {/* Person detail modal */}
      <Modal
        open={!!selectedPerson}
        onClose={() => setSelectedPerson(null)}
        title="Détails de la personne"
      >
        {selectedPerson && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-bold ${
                  genderColors[selectedPerson.gender]
                }`}
              >
                {selectedPerson.firstName[0]}
                {selectedPerson.lastName[0]}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {selectedPerson.firstName} {selectedPerson.lastName}
                </h3>
                <p className="text-sm text-slate-500">
                  {selectedPerson.gender === "male"
                    ? "Homme"
                    : selectedPerson.gender === "female"
                    ? "Femme"
                    : "Autre"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500">Naissance</p>
                <p className="font-medium text-slate-900">
                  {selectedPerson.birthDate
                    ? new Date(selectedPerson.birthDate).toLocaleDateString("fr-FR")
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Décès</p>
                <p className="font-medium text-slate-900">
                  {selectedPerson.deathDate
                    ? new Date(selectedPerson.deathDate).toLocaleDateString("fr-FR")
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Statut</p>
                <p className="font-medium text-slate-900">
                  {selectedPerson.isLiving ? "Vivant(e)" : "Décédé(e)"}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Profession</p>
                <p className="font-medium text-slate-900">
                  {selectedPerson.occupation ?? "—"}
                </p>
              </div>
            </div>

            {canInvite && (
              <div className="grid gap-2 sm:grid-cols-2">
                <Button variant="outline" onClick={() => setInviteModalOpen(true)}>
                  <UserPlus className="h-4 w-4" />
                  Inviter ce proche
                </Button>
                <Button variant="outline" onClick={() => setProposalModalOpen(true)}>
                  Proposer une modification
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Add person modal */}
      <AddPersonModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        familyId={familyId}
        persons={persons}
      />

      {/* Add relationship modal */}
      <AddRelationshipModal
        open={relateModalOpen}
        onClose={() => setRelateModalOpen(false)}
        familyId={familyId}
        persons={persons}
      />
      <InvitePersonModal
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        familyId={familyId}
        person={selectedPerson}
      />
      <ProposalModal
        open={proposalModalOpen}
        onClose={() => setProposalModalOpen(false)}
        familyId={familyId}
        person={selectedPerson}
      />
    </div>
  );
}

// ──────────────────────────────────────────────
// Add Person Modal
// ──────────────────────────────────────────────

function AddPersonModal({
  open,
  onClose,
  familyId,
  persons,
}: {
  open: boolean;
  onClose: () => void;
  familyId: string;
  persons: Person[];
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    gender: "unknown",
    birthDate: "",
    deathDate: "",
    occupation: "",
    relationType: "",
    relatedPersonId: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, familyId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Erreur");
      }

      if (form.relationType && form.relatedPersonId) {
        const isChild = form.relationType === "child";
        const relationResponse = await fetch("/api/relationships", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            familyId,
            personId1: isChild ? form.relatedPersonId : data.person.id,
            personId2: isChild ? data.person.id : form.relatedPersonId,
            type: isChild ? "parent" : form.relationType,
          }),
        });
        if (!relationResponse.ok) {
          throw new Error("La personne est enregistrée, mais la relation n’a pas pu être créée");
        }
      }

      setForm({
        firstName: "",
        lastName: "",
        gender: "unknown",
        birthDate: "",
        deathDate: "",
        occupation: "",
        relationType: "",
        relatedPersonId: "",
      });
      onClose();
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Ajouter une personne" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Prénom *
            </label>
            <input
              type="text"
              value={form.firstName}
              onChange={(e) =>
                setForm({ ...form, firstName: e.target.value })
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Nom *
            </label>
            <input
              type="text"
              value={form.lastName}
              onChange={(e) =>
                setForm({ ...form, lastName: e.target.value })
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              required
            />
          </div>
        </div>

        {persons.length > 0 && (
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
            <p className="mb-3 text-sm font-semibold text-blue-900">La relier maintenant (facultatif)</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                value={form.relationType}
                onChange={(e) => setForm({ ...form, relationType: e.target.value })}
                className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">Aucune relation pour l’instant</option>
                <option value="parent">Cette personne est le parent de</option>
                <option value="child">Cette personne est l’enfant de</option>
                <option value="spouse">Cette personne est le conjoint de</option>
              </select>
              <select
                value={form.relatedPersonId}
                onChange={(e) => setForm({ ...form, relatedPersonId: e.target.value })}
                disabled={!form.relationType}
                className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
              >
                <option value="">Choisir une personne</option>
                {persons.map((person) => (
                  <option key={person.id} value={person.id}>{person.firstName} {person.lastName}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Genre
            </label>
            <select
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="unknown">Inconnu</option>
              <option value="male">Homme</option>
              <option value="female">Femme</option>
              <option value="other">Autre</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Profession
            </label>
            <input
              type="text"
              value={form.occupation}
              onChange={(e) =>
                setForm({ ...form, occupation: e.target.value })
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Date de naissance
            </label>
            <input
              type="date"
              value={form.birthDate}
              onChange={(e) =>
                setForm({ ...form, birthDate: e.target.value })
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Date de décès
            </label>
            <input
              type="date"
              value={form.deathDate}
              onChange={(e) =>
                setForm({ ...form, deathDate: e.target.value })
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" type="button" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Ajout..." : "Ajouter"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ──────────────────────────────────────────────
// Add Relationship Modal
// ──────────────────────────────────────────────

function AddRelationshipModal({
  open,
  onClose,
  familyId,
  persons,
}: {
  open: boolean;
  onClose: () => void;
  familyId: string;
  persons: Person[];
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    personId1: "",
    personId2: "",
    type: "parent",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, familyId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erreur");
      }

      onClose();
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  const relTypeLabels: Record<string, string> = {
    parent: "Parent → Enfant",
    spouse: "Conjoint(e)",
    sibling: "Frère/Sœur",
    adoptive_parent: "Parent adoptif",
    step_parent: "Beau-parent",
  };

  return (
    <Modal open={open} onClose={onClose} title="Créer une relation" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Personne 1
          </label>
          <select
            value={form.personId1}
            onChange={(e) => setForm({ ...form, personId1: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            required
          >
            <option value="">Sélectionner...</option>
            {persons.map((p) => (
              <option key={p.id} value={p.id}>
                {p.firstName} {p.lastName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Type de relation
          </label>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            {Object.entries(relTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Personne 2
          </label>
          <select
            value={form.personId2}
            onChange={(e) => setForm({ ...form, personId2: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            required
          >
            <option value="">Sélectionner...</option>
            {persons
              .filter((p) => p.id !== form.personId1)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName}
                </option>
              ))}
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" type="button" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" disabled={loading || !form.personId1 || !form.personId2}>
            {loading ? "Création..." : "Relier"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function InvitePersonModal({
  open,
  onClose,
  familyId,
  person,
}: {
  open: boolean;
  onClose: () => void;
  familyId: string;
  person: Person | null;
}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  async function createInvitation(event: React.FormEvent) {
    event.preventDefault();
    if (!person) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ familyId, personId: person.id, email, role: "contributor" }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Invitation impossible");
      setInviteLink(payload.inviteLink);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Invitation impossible");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Inviter un proche" size="md">
      <form onSubmit={createInvitation} className="space-y-4">
        <p className="text-sm text-slate-600">
          Cette invitation donnera accès à la fiche de <strong>{person?.firstName} {person?.lastName}</strong>.
        </p>
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {!inviteLink ? (
          <>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email du proche (facultatif)"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
              <Button type="submit" disabled={loading}>{loading ? "Génération..." : "Générer l’invitation"}</Button>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">Lien à partager</label>
            <div className="flex gap-2">
              <input readOnly value={inviteLink} className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs" />
              <Button type="button" variant="outline" onClick={() => void navigator.clipboard.writeText(inviteLink)} aria-label="Copier le lien">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-slate-500">Le lien est valable 7 jours. Vous pouvez le partager par WhatsApp, SMS ou email.</p>
            <Button type="button" className="w-full" onClick={onClose}>Terminer</Button>
          </div>
        )}
      </form>
    </Modal>
  );
}
