"use client";

import { useState } from "react";
import {
  Check,
  Zap,
  Users,
  Image,
  HardDrive,
  Sparkles,
  Download,
  Link2,
  Brain,
  Palette,
  Headset,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { Plan, FeatureFlagConfig } from "@/types";

const plans: {
  plan: Plan;
  name: string;
  price: string;
  period: string;
  description: string;
  popular?: boolean;
}[] = [
  {
    plan: "free",
    name: "Gratuit",
    price: "0",
    period: "/mois",
    description: "Pour découvrir et créer un petit arbre familial",
  },
  {
    plan: "plus",
    name: "Plus",
    price: "9,99",
    period: "/mois",
    description: "Pour les familles qui veulent aller plus loin",
    popular: true,
  },
  {
    plan: "premium",
    name: "Premium",
    price: "24,99",
    period: "/mois",
    description: "Tout débloqué pour les généalogistes passionnés",
  },
];

const featureList: {
  key: keyof FeatureFlagConfig;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  type: "number" | "boolean";
}[] = [
  { key: "maxMembers", label: "Membres", icon: Users, type: "number" },
  { key: "maxMedia", label: "Médias", icon: Image, type: "number" },
  { key: "maxMediaStorageMb", label: "Stockage", icon: HardDrive, type: "number" },
  { key: "canColorizePhotos", label: "Colorisation IA", icon: Sparkles, type: "boolean" },
  { key: "canExportGedcom", label: "Export GEDCOM", icon: Download, type: "boolean" },
  { key: "canInviteByLink", label: "Invitations par lien", icon: Link2, type: "boolean" },
  { key: "canUseAiSuggestions", label: "Suggestions IA", icon: Brain, type: "boolean" },
  { key: "canCreateMultipleTrees", label: "Arbres multiples", icon: Palette, type: "boolean" },
  { key: "customThemes", label: "Thèmes personnalisés", icon: Palette, type: "boolean" },
  { key: "prioritySupport", label: "Support prioritaire", icon: Headset, type: "boolean" },
];

import { PLAN_FEATURES } from "@/types";

export function BillingClient({
  currentPlan,
  usage,
  features,
  currentFamilyId,
}: {
  currentPlan: Plan;
  usage: { members: number; media: number; storageMb: number };
  features: FeatureFlagConfig;
  currentFamilyId: string;
  subscriptions: unknown[];
  recentPayments: unknown[];
}) {
  const [isLoading, setIsLoading] = useState<string | null>(null);

  async function subscribe(plan: Plan) {
    setIsLoading(plan);
    try {
      const response = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ familyId: currentFamilyId, plan }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Paiement impossible");
      }

      if (payload.url) {
        window.location.href = payload.url;
        return;
      }

      throw new Error("Aucune URL de paiement renvoyée");
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Paiement impossible");
    } finally {
      setIsLoading(null);
    }
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-slate-900">Abonnement</h1>
        <p className="mt-1 text-sm text-slate-500">
          Gérez votre plan et vos fonctionnalités
        </p>
      </div>

      {/* Current plan status */}
      <Card className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-slate-900">
                Plan actuel :{" "}
                {plans.find((p) => p.plan === currentPlan)?.name ?? currentPlan}
              </h3>
              {currentPlan !== "free" && (
                <Badge variant="success">Actif</Badge>
              )}
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Utilisation : {usage.members} membres, {usage.media} médias
            </p>
          </div>
          {currentPlan !== "premium" && (
            <Button onClick={() => subscribe("premium")} disabled={isLoading !== null}>
              {isLoading === "premium" ? "Redirection..." : "Passer à Premium"}
            </Button>
          )}
        </div>

        {/* Usage bars */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Membres</span>
              <span className="font-medium text-slate-700">
                {usage.members} / {features.maxMembers === -1 ? "∞" : features.maxMembers}
              </span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-500"
                style={{
                  width: `${features.maxMembers === -1 ? 10 : Math.min(100, (usage.members / features.maxMembers) * 100)}%`,
                }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Médias</span>
              <span className="font-medium text-slate-700">
                {usage.media} / {features.maxMedia === -1 ? "∞" : features.maxMedia}
              </span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{
                  width: `${features.maxMedia === -1 ? 10 : Math.min(100, (usage.media / features.maxMedia) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Plan comparison */}
      <h2 className="mb-4 text-lg font-semibold text-slate-900">
        Comparer les plans
      </h2>
      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((p) => {
          const planFeatures = PLAN_FEATURES[p.plan];
          const isCurrent = p.plan === currentPlan;

          return (
            <Card
              key={p.plan}
              className={`relative ${isCurrent ? "ring-2 ring-blue-500" : ""} ${p.popular ? "ring-2 ring-amber-400" : ""}`}
            >
              {p.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="premium">
                    <Zap className="mr-1 h-3 w-3" />
                    Populaire
                  </Badge>
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-lg font-semibold text-slate-900">
                  {p.name}
                </h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-slate-900">
                    {p.price} DOLLARS
                  </span>
                  <span className="text-sm text-slate-500">{p.period}</span>
                </div>
                <p className="mt-2 text-sm text-slate-500">{p.description}</p>
              </div>

              <div className="space-y-3">
                {featureList.map((f) => {
                  const value = planFeatures[f.key];
                  return (
                    <div
                      key={f.key}
                      className="flex items-center gap-2 text-sm"
                    >
                      {f.type === "boolean" && value ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : f.type === "boolean" ? (
                        <div className="h-4 w-4 rounded-full bg-slate-200" />
                      ) : (
                        <f.icon className="h-4 w-4 text-slate-400" />
                      )}
                      <span className="text-slate-600">{f.label}</span>
                      {f.type === "number" && (
                        <span className="ml-auto text-xs font-medium text-slate-500">
                          {value === -1 ? "∞" : String(value)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-6">
                {isCurrent ? (
                  <Button variant="secondary" className="w-full" disabled>
                    Plan actuel
                  </Button>
                ) : (
                  <Button
                    variant={p.popular ? "primary" : "outline"}
                    className="w-full"
                    onClick={() => subscribe(p.plan)}
                    disabled={isLoading !== null}
                  >
                    {isLoading === p.plan
                      ? "Redirection..."
                      : currentPlan === "free"
                      ? "Souscrire"
                      : p.plan === "free"
                      ? "Rétrograder"
                      : "Passer à " + p.name}
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
