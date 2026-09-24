import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  ChartNoAxesColumn,
  Download,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";

export type DashboardStat = {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  accent: string;
};

export type DashboardActivity = {
  id: string;
  title: string;
  time: string;
  kind: "add" | "create" | "update";
};

export type DashboardPerson = {
  id: string;
  firstName: string;
  lastName: string;
  gender: "male" | "female" | "other" | "unknown";
  birthDate?: string | null;
  deathDate?: string | null;
  avatarUrl?: string | null;
};

const planMeta = {
  free: {
    label: "Gratuit",
    chip: "bg-slate-100 text-slate-700 ring-slate-200",
    accent: "from-slate-600 to-slate-500",
    description: "Idéal pour commencer votre arbre et organiser votre famille principale.",
    features: ["Arbre familial de base", "Jusqu’à 50 membres", "Stockage limité"],
  },
  plus: {
    label: "Plus",
    chip: "bg-blue-100 text-blue-700 ring-blue-200",
    accent: "from-blue-600 to-indigo-600",
    description: "Pour les familles qui veulent enrichir leur arbre et mieux suivre la lignée.",
    features: ["Jusqu’à 500 membres", "Export GEDCOM", "Invitations et médias"],
  },
  premium: {
    label: "Premium",
    chip: "bg-gradient-to-r from-amber-200 to-orange-200 text-orange-800 ring-orange-300",
    accent: "from-amber-500 to-orange-500",
    description: "Pour les familles complètes, les lignées longues et la gestion avancée.",
    features: ["Illimité", "Arbres multiples", "Support prioritaire"],
  },
} as const;

export function GenealogyDashboard({
  userName,
  familyName,
  stats,
  people,
  genderBreakdown,
  chartData,
  recentActivities,
  storageUsedMb,
  storageLimitMb,
  currentPlan = "free",
}: {
  userName: string;
  familyName: string;
  stats: DashboardStat[];
  people: DashboardPerson[];
  genderBreakdown: { male: number; female: number; unknown: number };
  chartData: Array<{ label: string; persons: number; families: number; events: number }>;
  recentActivities: DashboardActivity[];
  storageUsedMb: number;
  storageLimitMb: number;
  currentPlan?: "free" | "plus" | "premium";
}) {
  const totalGender = Math.max(genderBreakdown.male + genderBreakdown.female + genderBreakdown.unknown, 1);
  const malePercent = Math.round((genderBreakdown.male / totalGender) * 100);
  const femalePercent = Math.round((genderBreakdown.female / totalGender) * 100);
  const otherPercent = 100 - malePercent - femalePercent;

  const maxMetric = Math.max(
    ...chartData.flatMap((item) => [item.persons, item.families, item.events]),
    1
  );

  const plan = planMeta[currentPlan];

  const lineageGroups = [
    {
      title: "Ancêtres",
      items: people.slice(0, 2),
      tone: "bg-amber-50 text-amber-700 border-amber-200",
    },
    {
      title: "Parents",
      items: people.slice(2, 4),
      tone: "bg-violet-50 text-violet-700 border-violet-200",
    },
    {
      title: "Frères & sœurs",
      items: people.slice(4, 6),
      tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    {
      title: "Descendants",
      items: people.slice(6, 8),
      tone: "bg-blue-50 text-blue-700 border-blue-200",
    },
  ].filter((group) => group.items.length > 0);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">Abonnement</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">Votre plan actuel : {plan.label}</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">{plan.description}</p>
          </div>
          <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ${plan.chip}`}>
            {plan.label}
          </span>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {(["free", "plus", "premium"] as const).map((key) => {
            const meta = planMeta[key];
            const isCurrent = key === currentPlan;
            return (
              <div
                key={key}
                className={`rounded-2xl border p-4 transition ${
                  isCurrent
                    ? "border-blue-200 bg-blue-50 shadow-sm shadow-blue-100"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className={`mb-3 inline-flex rounded-full bg-gradient-to-r ${meta.accent} px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white`}>
                  {meta.label}
                </div>
                <ul className="space-y-2 text-sm text-slate-600">
                  {meta.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {currentPlan !== "premium" && (
          <div className="mt-5 flex justify-start">
            <Link href="/billing" className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 transition hover:opacity-95">
              <Sparkles className="h-4 w-4" />
              Passer en Premium
            </Link>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Tableau de bord</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            Bienvenue, {userName} 👋
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Voici un aperçu de votre arbre généalogique pour {familyName}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/members" className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50">
            <Search className="h-4 w-4" />
            Rechercher
          </Link>
          <Link href="/members" className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:opacity-95">
            <Plus className="h-4 w-4" />
            Ajouter une personne
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
              <div className="flex items-center justify-between">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${stat.accent}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                  {stat.detail}
                </span>
              </div>

              <div className="mt-5">
                <div className="text-3xl font-bold tracking-tight text-slate-900">{stat.value}</div>
                <div className="mt-1 text-sm font-medium text-slate-600">{stat.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_360px]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Aperçu de l’arbre</h2>
              <p className="mt-1 text-sm text-slate-500">Visualisation rapide de votre arbre généalogique, ses racines et sa lignée.</p>
            </div>

            <div className="flex items-center gap-2">
              <button className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm text-slate-600 hover:bg-slate-100">-</button>
              <button className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm text-slate-600 hover:bg-slate-100">+</button>
              <button className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm text-slate-600 hover:bg-slate-100">Centrer</button>
              <button className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm text-slate-600 hover:bg-slate-100">Plein écran</button>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4">
            {people.length === 0 ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/70 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-800">Votre arbre est encore vide</h3>
                <p className="mt-2 max-w-md text-sm text-slate-500">Commencez par ajouter votre première personne pour construire votre généalogie.</p>
                <Link href="/members" className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">
                  <Plus className="h-4 w-4" />
                  Ajouter une personne
                </Link>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {people.slice(0, 4).map((person) => (
                    <div key={person.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-sm font-bold text-white">
                          {person.firstName?.[0]?.toUpperCase() ?? "P"}
                          {person.lastName?.[0]?.toUpperCase() ?? ""}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-900">{person.firstName} {person.lastName}</div>
                          <div className="text-xs text-slate-500">
                            {person.birthDate ? new Date(person.birthDate).getFullYear() : "-"}
                            {person.deathDate ? ` - ${new Date(person.deathDate).getFullYear()}` : ""}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Lignée familiale</h3>
                    <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">Dynamique</span>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {lineageGroups.map((group) => (
                      <div key={group.title} className={`rounded-2xl border p-3 ${group.tone}`}>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em]">{group.title}</p>
                        <div className="space-y-2">
                          {group.items.map((person) => (
                            <div key={person.id} className="rounded-xl bg-white/70 px-2.5 py-2 text-sm font-medium text-slate-700 shadow-sm">
                              {person.firstName} {person.lastName}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">Répartition par genre</h2>
            <span className="rounded-full bg-violet-50 px-2 py-1 text-[10px] font-semibold text-violet-700">Live</span>
          </div>

          <div className="mt-6 flex items-center justify-center">
            <div
              className="relative flex h-40 w-40 items-center justify-center rounded-full"
              style={{
                background: `conic-gradient(#4f46e5 0 ${malePercent}%, #ec4899 ${malePercent}% ${malePercent + femalePercent}%, #cbd5e1 ${malePercent + femalePercent}% 100%)`,
              }}
            >
              <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white text-center">
                <span className="text-2xl font-bold text-slate-900">{malePercent + femalePercent}%</span>
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Mixte</span>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                <span className="text-slate-600">Hommes</span>
              </div>
              <span className="font-semibold text-slate-900">{malePercent}%</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-pink-500" />
                <span className="text-slate-600">Femmes</span>
              </div>
              <span className="font-semibold text-slate-900">{femalePercent}%</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                <span className="text-slate-600">Autres</span>
              </div>
              <span className="font-semibold text-slate-900">{otherPercent}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.75fr)_380px]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Statistiques détaillées</h2>
              <p className="mt-1 text-sm text-slate-500">Suivi de l’évolution de votre généalogie.</p>
            </div>
            <button className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
              6 derniers mois
            </button>
          </div>

          <div className="mt-6 flex h-52 items-end gap-3">
            {chartData.map((item) => (
              <div key={item.label} className="flex flex-1 flex-col items-center gap-3">
                <div className="flex h-40 w-full items-end justify-center gap-1">
                  <div
                    className="w-2 rounded-t-xl bg-blue-500"
                    style={{ height: `${(item.persons / maxMetric) * 100}%` }}
                    title={`Personnes: ${item.persons}`}
                  />
                  <div
                    className="w-2 rounded-t-xl bg-violet-500"
                    style={{ height: `${(item.families / maxMetric) * 100}%` }}
                    title={`Familles: ${item.families}`}
                  />
                  <div
                    className="w-2 rounded-t-xl bg-emerald-500"
                    style={{ height: `${(item.events / maxMetric) * 100}%` }}
                    title={`Événements: ${item.events}`}
                  />
                </div>
                <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">Actions rapides</h2>
              <ArrowUpRight className="h-4 w-4 text-slate-400" />
            </div>

            <div className="mt-4 space-y-2">
              {[
                { label: "Ajouter une personne", href: "/members", icon: Plus },
                { label: "Ajouter une famille", href: "/settings", icon: Users },
                { label: "Ajouter un événement", href: "/tree", icon: CalendarDays },
                { label: "Importer un fichier GEDCOM", href: "/media", icon: Download },
              ].map((action) => {
                const Icon = action.icon;

                return (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-left text-sm font-medium text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {action.label}
                    </span>
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">Activités récentes</h2>
              <button className="text-xs font-semibold text-blue-600">Voir toutes les activités</button>
            </div>

            <div className="mt-4 space-y-3">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm">
                    {activity.kind === "create" ? <Sparkles className="h-4 w-4" /> : activity.kind === "update" ? <Workflow className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700">{activity.title}</p>
                    <p className="mt-1 text-xs text-slate-400">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-violet-600 to-blue-600 p-5 text-white shadow-[0_12px_30px_rgba(79,70,229,0.3)]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Sauvegardez votre arbre</h2>
                <p className="mt-2 text-sm text-violet-100">Effectuez des sauvegardes régulières pour ne jamais perdre vos données.</p>
              </div>
              <ShieldCheck className="h-8 w-8 text-violet-200" />
            </div>

            <button className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-violet-700 shadow-md">
              <ChartNoAxesColumn className="h-4 w-4" />
              Sauvegarder maintenant
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Santé du dossier</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">Score familial</h2>
            </div>
            <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">Excellent</span>
          </div>

          <div className="mt-5 flex items-center gap-5">
            <div
              className="relative flex h-20 w-20 items-center justify-center rounded-full"
              style={{
                background: "conic-gradient(#2563eb 0 86%, #e2e8f0 86% 100%)",
              }}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-lg font-bold text-slate-900">86%</div>
            </div>

            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex items-center justify-between gap-3">
                <span>Profil complété</span>
                <span className="font-semibold text-slate-900">86%</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Relations</span>
                <span className="font-semibold text-slate-900">92%</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Photos</span>
                <span className="font-semibold text-slate-900">71%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">Tâches prioritaires</h2>
            <span className="text-xs font-medium text-blue-600">3 en cours</span>
          </div>

          <div className="mt-4 space-y-3">
            {[
              { title: "Valider les liens entre cousins", tag: "Relation" },
              { title: "Ajouter les données de naissance", tag: "Données" },
              { title: "Importer les photos de famille", tag: "Médias" },
            ].map((task) => (
              <div key={task.title} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                  <span className="text-sm font-medium text-slate-700">{task.title}</span>
                </div>
                <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-slate-500">{task.tag}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white shadow-[0_12px_35px_rgba(15,23,42,0.22)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Insights</p>
              <h2 className="mt-2 text-xl font-semibold">Recommandations</h2>
            </div>
            <Sparkles className="h-5 w-5 text-violet-300" />
          </div>

          <ul className="mt-5 space-y-3 text-sm text-slate-200">
            <li className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">Ajoutez 3 nouveaux membres pour compléter la génération suivante.</li>
            <li className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">Le profil de famille est bien rempli : continuez sur cette dynamique.</li>
            <li className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">Des photos manquent encore à la branche paternelle.</li>
          </ul>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Espace de stockage</h2>
            <p className="mt-1 text-sm text-slate-500">{storageUsedMb} Go / {storageLimitMb} Go utilisés</p>
          </div>
          <button className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Mettre à niveau</button>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-violet-600" style={{ width: `${Math.min((storageUsedMb / storageLimitMb) * 100, 100)}%` }} />
        </div>
      </div>
    </div>
  );
}
