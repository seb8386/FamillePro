import { redirect } from "next/navigation";
import { CalendarDays, MapPin, Users, type LucideIcon } from "lucide-react";
import { db } from "@/db";
import { auditLogs, invitations, persons } from "@/db/schema";
import { and, count, desc, eq } from "drizzle-orm";
import { getSession, resolveSelectedFamily } from "@/lib/auth";
import { GenealogyDashboard, type DashboardActivity, type DashboardStat } from "@/components/dashboard/GenealogyDashboard";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CollaborationInbox } from "@/components/dashboard/CollaborationInbox";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { familyId } = await resolveSelectedFamily(session);
  if (!familyId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Aucune famille disponible</h1>
          <p className="mt-2 text-sm text-slate-500">Créez votre premier espace familial pour démarrer votre arbre.</p>
          <a href="/register" className="mt-5 inline-flex rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white">
            Créer une famille
          </a>
        </div>
      </div>
    );
  }

  const [personCountResult] = await db
    .select({ count: count() })
    .from(persons)
    .where(eq(persons.familyId, familyId));

  const [pendingInvitationResult] = await db
    .select({ count: count() })
    .from(invitations)
    .where(and(eq(invitations.familyId, familyId), eq(invitations.status, "pending")));

  const familyCount = session.user.families.length;

  const familyPeople = await db
    .select()
    .from(persons)
    .where(eq(persons.familyId, familyId))
    .limit(6);

  const genderBreakdown = familyPeople.reduce(
    (acc, person) => {
      if (person.gender === "male") acc.male += 1;
      else if (person.gender === "female") acc.female += 1;
      else acc.unknown += 1;
      return acc;
    },
    { male: 0, female: 0, unknown: 0 }
  );

  const locationCount = new Set(
    familyPeople
      .map((person) => person.placeOfBirth ?? person.placeOfDeath)
      .filter(Boolean)
  ).size;

  const recentActivities = await db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.familyId, familyId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(5);

  const userName = [session.user.profile?.firstName, session.user.profile?.lastName]
    .filter(Boolean)
    .join(" ") || session.user.email.split("@")[0];

  const currentFamily = session.user.families.find((item) => item.familyId === familyId);
  const familyName = currentFamily?.familyName ?? "Famille";

  const activityItems: DashboardActivity[] = recentActivities.map((activity) => ({
    id: activity.id,
    title:
      activity.action === "create_family"
        ? "Famille créée"
        : activity.action === "add_person"
          ? "Personne ajoutée"
          : activity.action === "register"
            ? "Compte créé"
            : "Activité mise à jour",
    time: "Activité récente",
    kind: activity.action === "create_family" ? "create" : activity.action === "add_person" ? "add" : "update",
  }));

  const stats: DashboardStat[] = [
    {
      label: "Personnes",
      value: String(personCountResult.count),
      detail: "+2 ce mois",
      icon: Users,
      accent: "bg-blue-100 text-blue-700",
    },
    {
      label: "Familles",
      value: String(familyCount),
      detail: "+1 ce mois",
      icon: Users,
      accent: "bg-violet-100 text-violet-700",
    },
    {
      label: "Événements",
      value: "0",
      detail: "Aucun ce mois",
      icon: CalendarDays,
      accent: "bg-amber-100 text-amber-700",
    },
    {
      label: "Lieux",
      value: String(locationCount),
      detail: "Aucun ce mois",
      icon: MapPin,
      accent: "bg-emerald-100 text-emerald-700",
    },
  ];

  const monthLabels = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin"];
  const chartData = monthLabels.map((label, index) => ({
    label,
    persons: Math.max(1, Math.round((personCountResult.count * (index + 1)) / (monthLabels.length + 1))),
    families: Math.max(1, Math.round((familyCount * (index + 1)) / (monthLabels.length + 1))),
    events: index === 0 ? 0 : 1,
  }));

  return (
    <DashboardLayout
      userName={userName}
      families={session.user.families}
      currentFamilyId={familyId}
      systemRole={session.user.systemRole}
    >
      <GenealogyDashboard
        userName={userName}
        familyName={familyName}
        currentPlan={session.user.systemRole === "super_admin" ? "premium" : ((currentFamily?.plan ?? "free") as "free" | "plus" | "premium")}
        stats={stats}
        people={familyPeople.map((person) => ({
          id: person.id,
          firstName: person.firstName,
          lastName: person.lastName,
          gender: person.gender,
          birthDate: person.birthDate ? person.birthDate.toISOString() : null,
          deathDate: person.deathDate ? person.deathDate.toISOString() : null,
        }))}
        genderBreakdown={genderBreakdown}
        chartData={chartData}
        recentActivities={activityItems.length > 0 ? activityItems : [
          { id: "empty-1", title: "Aucune activité récente", time: "À l’instant", kind: "update" },
        ]}
        storageUsedMb={4.2}
        storageLimitMb={10}
      />
      <CollaborationInbox
        familyId={familyId}
        canReview={session.user.systemRole === "super_admin" || currentFamily?.role === "admin"}
        pendingInvitationCount={pendingInvitationResult.count}
      />
    </DashboardLayout>
  );
}
