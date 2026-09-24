"use client";

import { TreePine, Check, X, Clock, AlertTriangle, LogIn } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useState } from "react";

type InviteStatus = "valid" | "invalid" | "expired" | "accepted" | "revoked" | "pending";

export function InviteClient({
  status,
  familyName,
  inviterName,
  role,
  targetPersonName,
  token,
}: {
  status: InviteStatus;
  familyName?: string;
  inviterName?: string;
  role?: string;
  targetPersonName?: string;
  token?: string;
}) {
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const roleLabel: Record<string, string> = {
    admin: "Administrateur",
    editor: "Éditeur",
    contributor: "Contributeur",
    reader: "Lecteur",
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/30">
            <TreePine className="h-7 w-7 text-white" />
          </div>
        </div>

        {status === "valid" ? (
          <div className="rounded-2xl bg-white p-8 shadow-xl ring-1 ring-slate-200/60">
            <h2 className="text-center text-lg font-semibold text-slate-900">
              Invitation à rejoindre
            </h2>
            <p className="mt-2 text-center text-xl font-bold text-blue-600">
              {familyName}
            </p>

            {inviterName && (
              <p className="mt-2 text-center text-sm text-slate-500">
                Invité(e) par {inviterName}
              </p>
            )}

            {role && (
              <p className="mt-4 text-center text-sm text-slate-600">
                Votre rôle :{" "}
                <span className="font-medium">
                  {roleLabel[role] ?? role}
                </span>
              </p>
            )}

            {targetPersonName && (
              <p className="mt-4 rounded-lg bg-blue-50 p-3 text-center text-sm text-blue-800">
                Cette invitation est liée à la fiche de <strong>{targetPersonName}</strong>.
              </p>
            )}

            <div className="mt-6 flex flex-col gap-3">
              {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
              <Button className="w-full" disabled={accepting} onClick={async () => {
                setAccepting(true);
                setError(null);
                const response = await fetch("/api/invitations/accept", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ token }),
                });
                if (response.status === 401) {
                  window.location.href = `/register?invite=${encodeURIComponent(token ?? "")}`;
                  return;
                }
                if (!response.ok) {
                  const payload = await response.json().catch(() => ({}));
                  setError(payload.error ?? "Invitation impossible à accepter");
                  setAccepting(false);
                  return;
                }
                window.location.href = "/tree";
              }}>
                <LogIn className="h-4 w-4" />
                {accepting ? "Connexion à la famille..." : "Accepter l&apos;invitation"}
              </Button>
              <Button variant="outline" className="w-full">
                Refuser
              </Button>
            </div>
          </div>
        ) : status === "invalid" ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-xl">
            <X className="mx-auto h-12 w-12 text-red-400" />
            <h2 className="mt-4 text-lg font-semibold text-slate-900">
              Invitation invalide
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Ce lien d&apos;invitation n&apos;existe pas ou a été désactivé.
            </p>
          </div>
        ) : status === "expired" ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-xl">
            <Clock className="mx-auto h-12 w-12 text-amber-400" />
            <h2 className="mt-4 text-lg font-semibold text-slate-900">
              Invitation expirée
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Ce lien d&apos;invitation a expiré. Demandez un nouveau lien.
            </p>
          </div>
        ) : status === "accepted" ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-xl">
            <Check className="mx-auto h-12 w-12 text-emerald-400" />
            <h2 className="mt-4 text-lg font-semibold text-slate-900">
              Déjà acceptée
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Vous avez déjà rejoint cette famille.
            </p>
            <Button className="mt-4" onClick={() => (window.location.href = "/tree")}>
              Aller à l&apos;arbre
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl bg-white p-8 text-center shadow-xl">
            <AlertTriangle className="mx-auto h-12 w-12 text-slate-400" />
            <h2 className="mt-4 text-lg font-semibold text-slate-900">
              Invitation non disponible
            </h2>
          </div>
        )}
      </div>
    </div>
  );
}
