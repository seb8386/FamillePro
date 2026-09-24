"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Users,
  TreePine,
  UserPlus,
  Shield,
  Activity,
  DollarSign,
  Crown,
  Search,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Check,
  ArrowUpRight,
  Filter,
  Loader2,
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface PlanDistribution {
  plan: string;
  count: number;
}

interface UserRow {
  id: number;
  name: string;
  email: string;
  role: "super_admin" | "admin" | "editor" | "reader";
  family: string;
  status: "actif" | "inactif" | "attente";
  plan: "free" | "plus" | "premium";
}

interface FamilyRow {
  id: number;
  name: string;
  owner: string;
  members: number;
  plan: "free" | "plus" | "premium";
  status: "active" | "paused";
}

interface BillingRow {
  id: number;
  family: string;
  amount: number;
  plan: "free" | "plus" | "premium";
  status: "payé" | "échoué" | "en attente";
  date: string;
}

type PlanValue = "free" | "plus" | "premium";
type UserRole = "super_admin" | "admin" | "editor" | "reader";
type UserStatusValue = "actif" | "inactif" | "attente";
type FamilyStatusValue = "active" | "paused";

const planLabels: Record<string, string> = { free: "Gratuit", plus: "Plus", premium: "Premium" };
const planColors: Record<string, string> = { free: "bg-slate-200 text-slate-700", plus: "bg-blue-100 text-blue-700", premium: "bg-amber-100 text-amber-700" };

export function AdminDashboardClient({ stats }: { stats: { users: number; families: number; persons: number; planDistribution: PlanDistribution[]; }; }) {
  const [tab, setTab] = useState<"overview" | "users" | "families" | "billing" | "settings">("overview");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [families, setFamilies] = useState<FamilyRow[]>([]);
  const [billing, setBilling] = useState<BillingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUserForm, setShowUserForm] = useState(false);
  const [showFamilyForm, setShowFamilyForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editingFamilyId, setEditingFamilyId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState<"all" | UserStatusValue>("all");
  const [planFilter, setPlanFilter] = useState<"all" | PlanValue>("all");
  const [systemControls, setSystemControls] = useState({
    maintenance: false,
    invites: true,
    payments: true,
    autoBackup: true,
  });

  const planCounts: Record<string, number> = useMemo(() => {
    const base: Record<string, number> = { free: 0, plus: 0, premium: 0 };
    for (const pd of stats.planDistribution) base[pd.plan] = pd.count;
    return base;
  }, [stats.planDistribution]);

  const totalRevenue = useMemo(
    () => billing.reduce((sum, item) => sum + (item.status === "payé" ? item.amount : 0), 0),
    [billing]
  );

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch = [user.name, user.email, user.family].join(" ").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = userStatusFilter === "all" || user.status === userStatusFilter;
      const matchesPlan = planFilter === "all" || user.plan === planFilter;
      return matchesSearch && matchesStatus && matchesPlan;
    });
  }, [users, searchQuery, userStatusFilter, planFilter]);

  const filteredFamilies = useMemo(() => {
    return families.filter((family) => {
      const matchesSearch = [family.name, family.owner].join(" ").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPlan = planFilter === "all" || family.plan === planFilter;
      return matchesSearch && matchesPlan;
    });
  }, [families, searchQuery, planFilter]);

  const filteredBilling = useMemo(() => {
    return billing.filter((row) => {
      const matchesSearch = [row.family, row.status].join(" ").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPlan = planFilter === "all" || row.plan === planFilter;
      return matchesSearch && matchesPlan;
    });
  }, [billing, searchQuery, planFilter]);

  const [userForm, setUserForm] = useState<UserRow>({
    id: 0,
    name: "",
    email: "",
    role: "editor",
    family: "",
    status: "actif",
    plan: "plus",
  });
  const [familyForm, setFamilyForm] = useState<FamilyRow>({
    id: 0,
    name: "",
    owner: "",
    members: 12,
    plan: "plus",
    status: "active",
  });

  useEffect(() => {
    async function loadAdminData() {
      try {
        const [usersRes, familiesRes, paymentsRes] = await Promise.all([
          fetch("/api/admin/users"),
          fetch("/api/admin/families"),
          fetch("/api/admin/payments"),
        ]);

        const usersData = usersRes.ok ? await usersRes.json() : [];
        const familiesData = familiesRes.ok ? await familiesRes.json() : [];
        const paymentsData = paymentsRes.ok ? await paymentsRes.json() : [];

        setUsers(usersData);
        setFamilies(familiesData);
        setBilling(paymentsData);
      } catch (error) {
        console.error("Admin data load error:", error);
      } finally {
        setLoading(false);
      }
    }

    loadAdminData();
  }, []);

  const statCards = [
    { label: "Utilisateurs", value: stats.users, icon: Users, tone: "bg-blue-50 text-blue-600" },
    { label: "Familles", value: stats.families, icon: TreePine, tone: "bg-emerald-50 text-emerald-600" },
    { label: "Personnes", value: stats.persons, icon: UserPlus, tone: "bg-violet-50 text-violet-600" },
    { label: "Revenus", value: `${totalRevenue.toFixed(2)} DOLLARS`, icon: DollarSign, tone: "bg-amber-50 text-amber-600" },
  ];

  const activityFeed = [
    { label: "3 nouvelles familles actives", color: "bg-emerald-500" },
    { label: "6 invitations envoyées aujourd’hui", color: "bg-blue-500" },
    { label: "2 paiements en attente", color: "bg-amber-500" },
    { label: "1 anomalie de sécurité détectée", color: "bg-rose-500" },
  ];

  const systemAlerts = [
    { title: "API de paiement", status: "OK" },
    { title: "Webhook Stripe", status: "OK" },
    { title: "Base PostgreSQL", status: "Stable" },
    { title: "PWA offline", status: "Actif" },
  ];

  async function handleUserSave() {
    if (!userForm.name || !userForm.email) return;

    const payload = {
      email: userForm.email,
      firstName: userForm.name.split(" ")[0] ?? userForm.name,
      lastName: userForm.name.split(" ").slice(1).join(" ") || userForm.name,
      role: userForm.role,
      status: userForm.status,
      family: userForm.family,
      plan: userForm.plan,
    };

    const url = editingUserId !== null ? `/api/admin/users?id=${editingUserId}` : "/api/admin/users";
    const method = editingUserId !== null ? "PATCH" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const refreshed = await fetch("/api/admin/users");
      const data = await refreshed.json();
      setUsers(data);
    }

    setUserForm({ id: 0, name: "", email: "", role: "editor", family: "", status: "actif", plan: "plus" });
    setEditingUserId(null);
    setShowUserForm(false);
  }

  function exportCsv(rows: Array<Record<string, string | number>>, filename: string) {
    const headers = Object.keys(rows[0] ?? {});
    const csv = [headers.join(","), ...rows.map((row) => headers.map((header) => `"${String(row[header] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  async function handleFamilySave() {
    if (!familyForm.name || !familyForm.owner) return;

    const payload = {
      name: familyForm.name,
      owner: familyForm.owner,
      ownerId: undefined,
      plan: familyForm.plan,
      status: familyForm.status,
    };

    const url = editingFamilyId !== null ? `/api/admin/families?id=${editingFamilyId}` : "/api/admin/families";
    const method = editingFamilyId !== null ? "PATCH" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const refreshed = await fetch("/api/admin/families");
      const data = await refreshed.json();
      setFamilies(data);
    }

    setFamilyForm({ id: 0, name: "", owner: "", members: 12, plan: "plus", status: "active" });
    setEditingFamilyId(null);
    setShowFamilyForm(false);
  }

  const tabs = [
    { id: "overview", label: "Vue d’ensemble" },
    { id: "users", label: "Utilisateurs" },
    { id: "families", label: "Familles" },
    { id: "billing", label: "Paiements" },
    { id: "settings", label: "Paramètres" },
  ] as const;

  const quickActions = [
    { label: "Créer un utilisateur", target: "users" },
    { label: "Créer une famille", target: "families" },
    { label: "Voir paiements", target: "billing" },
    { label: "Configurer la plateforme", target: "settings" },
  ] as const;

  async function deleteUser(id: number) {
    const response = await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" });
    if (response.ok) {
      setUsers((current) => current.filter((user) => user.id !== id));
    }
  }

  async function deleteFamily(id: number) {
    const response = await fetch(`/api/admin/families?id=${id}`, { method: "DELETE" });
    if (response.ok) {
      setFamilies((current) => current.filter((family) => family.id !== id));
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center gap-3 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        Chargement du dashboard...
      </div>
    );
  }

  return (
    <div className="max-w-7xl">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 shadow-lg shadow-violet-500/20">
          <Shield className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard Super Utilisateur</h1>
          <p className="text-sm text-slate-500">Gestion centrale de la plateforme</p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        {tabs.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              tab === item.id ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {statCards.map((card) => (
              <Card key={card.label} className="overflow-hidden">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">{card.label}</p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">{card.value}</p>
                  </div>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${card.tone}`}>
                    <card.icon className="h-5 w-5" />
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-slate-400" />
                    <CardTitle>Répartition des plans</CardTitle>
                  </div>
                  <Badge variant="info">Live</Badge>
                </div>
              </CardHeader>

              <div className="space-y-5">
                {(["free", "plus", "premium"] as const).map((plan) => {
                  const count = planCounts[plan] ?? 0;
                  const pct = stats.families ? (count / stats.families) * 100 : 0;

                  return (
                    <div key={plan}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700">{planLabels[plan]}</span>
                        <span className="text-slate-500">{count} familles · {Math.round(pct)}%</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-slate-100">
                        <div className={`h-full rounded-full ${plan === "free" ? "bg-slate-500" : plan === "plus" ? "bg-blue-500" : "bg-amber-500"}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-amber-500" />
                    <CardTitle>Actions rapides</CardTitle>
                  </div>
                </div>
              </CardHeader>

              <div className="space-y-3">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => setTab(action.target)}
                    className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white"
                  >
                    <span>{action.label}</span>
                    <ArrowUpRight className="h-4 w-4 text-slate-400" />
                  </button>
                ))}
              </div>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-slate-400" />
                    <CardTitle>Activité de plateforme</CardTitle>
                  </div>
                  <Badge variant="success">Realtime</Badge>
                </div>
              </CardHeader>

              <div className="space-y-3">
                {activityFeed.map((item) => (
                  <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                    <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                    <span className="text-sm text-slate-700">{item.label}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-slate-400" />
                    <CardTitle>État système</CardTitle>
                  </div>
                </div>
              </CardHeader>

              <div className="space-y-3">
                {systemAlerts.map((alert) => (
                  <div key={alert.title} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                    <span className="text-sm font-medium text-slate-700">{alert.title}</span>
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">{alert.status}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === "users" && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-slate-400" />
                <CardTitle>Utilisateurs</CardTitle>
              </div>

              <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                  <Search className="h-4 w-4" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Rechercher"
                    className="w-36 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                  />
                </div>
                <select
                  value={userStatusFilter}
                  onChange={(event) => setUserStatusFilter(event.target.value as "all" | UserStatusValue)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none"
                >
                  <option value="all">Tous statuts</option>
                  <option value="actif">Actif</option>
                  <option value="inactif">Inactif</option>
                  <option value="attente">En attente</option>
                </select>
                <select
                  value={planFilter}
                  onChange={(event) => setPlanFilter(event.target.value as "all" | PlanValue)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none"
                >
                  <option value="all">Tous plans</option>
                  <option value="free">Gratuit</option>
                  <option value="plus">Plus</option>
                  <option value="premium">Premium</option>
                </select>
                <button
                  onClick={() => exportCsv(filteredUsers.map((user) => ({ name: user.name, email: user.email, role: user.role, family: user.family, plan: user.plan, status: user.status })), "utilisateurs.csv")}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                >
                  Export CSV
                </button>
                <button
                  onClick={() => {
                    setEditingUserId(null);
                    setShowUserForm(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter
                </button>
              </div>
            </CardHeader>

            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nom</th>
                    <th className="px-4 py-3 font-medium">Rôle</th>
                    <th className="px-4 py-3 font-medium">Famille</th>
                    <th className="px-4 py-3 font-medium">Plan</th>
                    <th className="px-4 py-3 font-medium">Statut</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium text-slate-900">{user.name}</div>
                          <div className="text-xs text-slate-500">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{user.role}</td>
                      <td className="px-4 py-3 text-slate-600">{user.family}</td>
                      <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${planColors[user.plan]}`}>{planLabels[user.plan]}</span></td>
                      <td className="px-4 py-3"><Badge variant={user.status === "actif" ? "success" : user.status === "attente" ? "warning" : "default"}>{user.status}</Badge></td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => { setEditingUserId(user.id); setUserForm({ id: user.id, name: user.name, email: user.email, role: user.role, family: user.family, status: user.status, plan: user.plan }); setShowUserForm(true); }} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"><Pencil className="h-4 w-4" /></button>
                          <button onClick={() => deleteUser(user.id)} className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 hover:bg-red-100"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {showUserForm && (
            <Card>
              <CardHeader>
                <CardTitle>{editingUserId ? "Modifier l’utilisateur" : "Créer un utilisateur"}</CardTitle>
              </CardHeader>

              <div className="grid gap-4 md:grid-cols-2">
                <input value={userForm.name} onChange={(e) => setUserForm((current) => ({ ...current, name: e.target.value }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none ring-0 focus:border-blue-400" placeholder="Nom complet" />
                <input value={userForm.email} onChange={(e) => setUserForm((current) => ({ ...current, email: e.target.value }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none ring-0 focus:border-blue-400" placeholder="Email" />
                <select value={userForm.role} onChange={(e) => setUserForm((current) => ({ ...current, role: e.target.value as UserRow["role"] }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400">
                  <option value="super_admin">Super Admin</option>
                  <option value="admin">Admin</option>
                  <option value="editor">Éditeur</option>
                  <option value="reader">Lecteur</option>
                </select>
                <select value={userForm.plan} onChange={(e) => setUserForm((current) => ({ ...current, plan: e.target.value as UserRow["plan"] }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400">
                  <option value="free">Gratuit</option>
                  <option value="plus">Plus</option>
                  <option value="premium">Premium</option>
                </select>
                <input value={userForm.family} onChange={(e) => setUserForm((current) => ({ ...current, family: e.target.value }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 md:col-span-2" placeholder="Famille associée" />
                <select value={userForm.status} onChange={(e) => setUserForm((current) => ({ ...current, status: e.target.value as UserRow["status"] }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 md:col-span-2">
                  <option value="actif">Actif</option>
                  <option value="inactif">Inactif</option>
                  <option value="attente">En attente</option>
                </select>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setShowUserForm(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600">Annuler</button>
                <button onClick={handleUserSave} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">{editingUserId ? "Enregistrer" : "Créer"}</button>
              </div>
            </Card>
          )}
        </div>
      )}

      {tab === "families" && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <TreePine className="h-5 w-5 text-slate-400" />
                <CardTitle>Familles</CardTitle>
              </div>
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                  <Search className="h-4 w-4" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Filtrer familles"
                    className="w-36 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                  />
                </div>
                <select
                  value={planFilter}
                  onChange={(event) => setPlanFilter(event.target.value as "all" | PlanValue)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none"
                >
                  <option value="all">Tous plans</option>
                  <option value="free">Gratuit</option>
                  <option value="plus">Plus</option>
                  <option value="premium">Premium</option>
                </select>
                <button
                  onClick={() => exportCsv(filteredFamilies.map((family) => ({ name: family.name, owner: family.owner, members: family.members, plan: family.plan, status: family.status })), "familles.csv")}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                >
                  Export CSV
                </button>
                <button onClick={() => { setEditingFamilyId(null); setShowFamilyForm(true); }} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-2 text-sm font-medium text-white">
                  <Plus className="h-4 w-4" />
                  Ajouter une famille
                </button>
              </div>
            </CardHeader>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredFamilies.map((family) => (
                <div key={family.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{family.name}</h3>
                      <p className="text-sm text-slate-500">Propriétaire : {family.owner}</p>
                    </div>
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${planColors[family.plan]}`}>{planLabels[family.plan]}</span>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
                    <span>{family.members} membres</span>
                    <Badge variant={family.status === "active" ? "success" : "warning"}>{family.status === "active" ? "Active" : "Suspendue"}</Badge>
                  </div>

                  <div className="mt-5 flex justify-end gap-2">
                    <button onClick={() => { setEditingFamilyId(family.id); setFamilyForm({ id: family.id, name: family.name, owner: family.owner, members: family.members, plan: family.plan, status: family.status }); setShowFamilyForm(true); }} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => deleteFamily(family.id)} className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {showFamilyForm && (
            <Card>
              <CardHeader>
                <CardTitle>{editingFamilyId ? "Modifier la famille" : "Créer une famille"}</CardTitle>
              </CardHeader>

              <div className="grid gap-4 md:grid-cols-2">
                <input value={familyForm.name} onChange={(e) => setFamilyForm((current) => ({ ...current, name: e.target.value }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-400" placeholder="Nom de la famille" />
                <input value={familyForm.owner} onChange={(e) => setFamilyForm((current) => ({ ...current, owner: e.target.value }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-400" placeholder="Propriétaire" />
                <input type="number" value={familyForm.members} onChange={(e) => setFamilyForm((current) => ({ ...current, members: Number(e.target.value) }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-400" placeholder="Membres" />
                <select value={familyForm.plan} onChange={(e) => setFamilyForm((current) => ({ ...current, plan: e.target.value as FamilyRow["plan"] }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-400">
                  <option value="free">Gratuit</option>
                  <option value="plus">Plus</option>
                  <option value="premium">Premium</option>
                </select>
                <select value={familyForm.status} onChange={(e) => setFamilyForm((current) => ({ ...current, status: e.target.value as FamilyRow["status"] }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-400 md:col-span-2">
                  <option value="active">Active</option>
                  <option value="paused">Suspendue</option>
                </select>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setShowFamilyForm(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600">Annuler</button>
                <button onClick={handleFamilySave} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white">{editingFamilyId ? "Enregistrer" : "Créer"}</button>
              </div>
            </Card>
          )}
        </div>
      )}

      {tab === "billing" && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-slate-400" />
                <CardTitle>Paiements et abonnements</CardTitle>
              </div>
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                  <Search className="h-4 w-4" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Filtrer paiements"
                    className="w-36 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                  />
                </div>
                <select
                  value={planFilter}
                  onChange={(event) => setPlanFilter(event.target.value as "all" | PlanValue)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none"
                >
                  <option value="all">Tous plans</option>
                  <option value="free">Gratuit</option>
                  <option value="plus">Plus</option>
                  <option value="premium">Premium</option>
                </select>
                <button
                  onClick={() => exportCsv(filteredBilling.map((item) => ({ family: item.family, plan: item.plan, amount: `${item.amount.toFixed(2)} DOLLARS`, status: item.status, date: item.date })), "paiements.csv")}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                >
                  Export CSV
                </button>
              </div>
            </CardHeader>

            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Famille</th>
                    <th className="px-4 py-3 font-medium">Plan</th>
                    <th className="px-4 py-3 font-medium">Montant</th>
                    <th className="px-4 py-3 font-medium">Statut</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredBilling.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{item.family}</td>
                      <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${planColors[item.plan]}`}>{planLabels[item.plan]}</span></td>
                      <td className="px-4 py-3 text-slate-700">{item.amount.toFixed(2)} DOLLARS</td>
                      <td className="px-4 py-3"><Badge variant={item.status === "payé" ? "success" : item.status === "échoué" ? "danger" : "warning"}>{item.status}</Badge></td>
                      <td className="px-4 py-3 text-slate-500">{item.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {tab === "settings" && (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-slate-400" />
                <CardTitle>Paramètres de la plateforme</CardTitle>
              </div>
            </CardHeader>
            <div className="space-y-4">
              {[
                ["Paiements", "Stripe + webhooks actifs", "payments"],
                ["Sécurité", "2FA activée sur les comptes admin", "security"],
                ["Réseau", "PWA + cache offline disponibles", "network"],
                ["Audit", "Traçabilité des actions renforcée", "audit"],
              ].map(([label, value, key]) => (
                <div key={label} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <span className="text-sm font-medium text-slate-700">{label}</span>
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                    <Check className="h-3.5 w-3.5" />
                    {value}
                  </div>
                  <span className="sr-only">{key}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-slate-400" />
                <CardTitle>Contrôles système</CardTitle>
              </div>
            </CardHeader>
            <div className="space-y-4">
              {Object.entries(systemControls).map(([key, enabled]) => (
                <div key={key} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <span className="text-sm font-medium text-slate-700">
                    {key === "maintenance" && "Mode maintenance"}
                    {key === "invites" && "Invitations ouvertes"}
                    {key === "payments" && "Paiements actifs"}
                    {key === "autoBackup" && "Sauvegardes automatiques"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSystemControls((current) => ({ ...current, [key]: !current[key as keyof typeof current] }))}
                    className={`relative h-7 w-12 rounded-full transition ${enabled ? "bg-emerald-500" : "bg-slate-300"}`}
                    aria-label={`Toggle ${key}`}
                  >
                    <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${enabled ? "left-6" : "left-1"}`} />
                  </button>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-slate-400" />
                <CardTitle>Vérification</CardTitle>
              </div>
            </CardHeader>
            <div className="space-y-3 text-sm text-slate-600">
              <p>• Vérification de la santé des API</p>
              <p>• Contrôle des permissions par rôle</p>
              <p>• Segmentation multi-familles activée</p>
              <p>• Logs d’audit et monitoring de base</p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
