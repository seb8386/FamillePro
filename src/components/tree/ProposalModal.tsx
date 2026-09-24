"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

interface Person {
  id: string;
  firstName: string;
  lastName: string;
  bio?: string | null;
  occupation?: string | null;
}

export function ProposalModal({
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
  const [bio, setBio] = useState("");
  const [occupation, setOccupation] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!person) return;
    setLoading(true);
    setMessage(null);
    const response = await fetch("/api/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ familyId, personId: person.id, changes: { bio: bio || null, occupation: occupation || null } }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(payload.error ?? "Proposition impossible");
      setLoading(false);
      return;
    }
    setMessage("Votre proposition est envoyée à l’administrateur.");
    setBio("");
    setOccupation("");
    setLoading(false);
  }

  return (
    <Modal open={open} onClose={onClose} title="Proposer une modification" size="md">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-slate-600">Fiche concernée : <strong>{person?.firstName} {person?.lastName}</strong></p>
        {message && <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">{message}</p>}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Biographie ou souvenir</label>
          <textarea value={bio} onChange={(event) => setBio(event.target.value)} rows={4} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Ajoutez une information vérifiable..." />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Profession</label>
          <input value={occupation} onChange={(event) => setOccupation(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
          <Button type="submit" disabled={loading || (!bio && !occupation)}>{loading ? "Envoi..." : "Soumettre"}</Button>
        </div>
      </form>
    </Modal>
  );
}
