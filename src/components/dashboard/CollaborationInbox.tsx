"use client";

import { useEffect, useState } from "react";
import { Check, Clock3, Inbox, X } from "lucide-react";

interface Proposal {
  id: string;
  personId: string;
  changes: Record<string, string | null>;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export function CollaborationInbox({
  familyId,
  canReview,
  pendingInvitationCount,
}: {
  familyId: string;
  canReview: boolean;
  pendingInvitationCount: number;
}) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/proposals?familyId=${encodeURIComponent(familyId)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Impossible de charger les propositions");
        return response.json();
      })
      .then((payload) => {
        if (active) setProposals((payload.proposals ?? []).filter((proposal: Proposal) => proposal.status === "pending"));
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : "Erreur de chargement");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [familyId]);

  async function review(proposalId: string, status: "approved" | "rejected") {
    const response = await fetch("/api/proposals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ familyId, proposalId, status }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.error ?? "Action impossible");
      return;
    }
    setProposals((current) => current.filter((proposal) => proposal.id !== proposalId));
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700"><Inbox className="h-5 w-5" /></div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Collaboration familiale</h2>
            <p className="text-sm text-slate-500">Les changements et invitations de votre espace</p>
          </div>
        </div>
        <div className="flex gap-2 text-xs font-semibold">
          <span className="rounded-full bg-amber-50 px-3 py-1.5 text-amber-700">{proposals.length} proposition{proposals.length > 1 ? "s" : ""}</span>
          <span className="rounded-full bg-blue-50 px-3 py-1.5 text-blue-700">{pendingInvitationCount} invitation{pendingInvitationCount > 1 ? "s" : ""}</span>
        </div>
      </div>

      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading ? <p className="mt-5 text-sm text-slate-500">Chargement des modifications...</p> : proposals.length === 0 ? (
        <div className="mt-5 flex items-center gap-2 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600"><Clock3 className="h-4 w-4 text-slate-400" />Aucune modification en attente.</div>
      ) : (
        <div className="mt-5 space-y-3">
          {proposals.map((proposal) => (
            <div key={proposal.id} className="flex flex-col gap-3 rounded-2xl border border-amber-100 bg-amber-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Modification proposée sur une fiche</p>
                <p className="mt-1 text-xs text-slate-500">{Object.entries(proposal.changes).map(([key, value]) => `${key}: ${value ?? "vide"}`).join(" · ")}</p>
              </div>
              {canReview && <div className="flex gap-2">
                <button type="button" onClick={() => void review(proposal.id, "approved")} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"><Check className="h-3.5 w-3.5" />Approuver</button>
                <button type="button" onClick={() => void review(proposal.id, "rejected")} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"><X className="h-3.5 w-3.5" />Refuser</button>
              </div>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
