"use client";

import { Settings, User, Bell, Shield, LogOut, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useState } from "react";

export function SettingsClient({
  user,
  families,
}: {
  user: { email: string; firstName: string; lastName: string; systemRole: string };
  families: { familyId: string; familyName: string; familySlug: string; role: string; plan: string }[];
}) {
  const [name, setName] = useState(`${user.firstName} ${user.lastName}`.trim());

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-xl font-semibold text-slate-900">Paramètres</h1>

      {/* Profile */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-slate-400" />
            <CardTitle>Profil</CardTitle>
          </div>
        </CardHeader>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Nom complet
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Rôle système
            </label>
            <Badge variant={user.systemRole === "super_admin" ? "premium" : "default"}>
              {user.systemRole}
            </Badge>
          </div>

          <Button size="sm">
            <Save className="h-3.5 w-3.5" />
            Sauvegarder
          </Button>
        </div>
      </Card>

      {/* Families */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-slate-400" />
            <CardTitle>Mes Familles</CardTitle>
          </div>
        </CardHeader>

        <div className="space-y-3">
          {families.map((f) => (
            <div
              key={f.familyId}
              className="flex items-center justify-between rounded-lg border border-slate-200 p-3"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {f.familyName}
                </p>
                <p className="text-xs text-slate-500">
                  Rôle : {f.role} · Plan : {f.plan}
                </p>
              </div>
              <Badge variant={f.plan === "premium" ? "premium" : f.plan === "plus" ? "info" : "default"}>
                {f.plan}
              </Badge>
            </div>
          ))}

          {families.length === 0 && (
            <p className="text-sm text-slate-500">
              Vous n&apos;êtes membre d&apos;aucune famille.
            </p>
          )}
        </div>
      </Card>

      {/* Danger zone */}
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Zone dangereuse</CardTitle>
        </CardHeader>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-700">Supprimer mon compte</p>
            <p className="text-xs text-slate-500">
              Cette action est irréversible
            </p>
          </div>
          <Button variant="danger" size="sm">
            Supprimer
          </Button>
        </div>
      </Card>
    </div>
  );
}
