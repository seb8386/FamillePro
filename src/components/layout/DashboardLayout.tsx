"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  TreePine,
  Users,
  Image,
  Settings,
  CreditCard,
  LogOut,
  Menu,
  Shield,
  Home,
  ChevronDown,
  Sparkles,
  Bell,
  Search,
  Plus,
} from "lucide-react";

interface Family {
  familyId: string;
  familyName: string;
  familySlug: string;
  role: string;
  plan: string;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  userName: string;
  families: Family[];
  currentFamilyId: string | null;
  systemRole: string;
}

const navItems = [
  { href: "/tree", label: "Arbre", icon: TreePine },
  { href: "/members", label: "Membres", icon: Users },
  { href: "/media", label: "Médias", icon: Image },
  { href: "/settings", label: "Paramètres", icon: Settings },
  { href: "/billing", label: "Abonnement", icon: CreditCard },
];

export function DashboardLayout({
  children,
  userName,
  families,
  currentFamilyId,
  systemRole,
}: DashboardLayoutProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [familyDropdown, setFamilyDropdown] = useState(false);

  const currentFamily = families.find((f) => f.familyId === currentFamilyId);

  const planBadge: Record<string, string> = {
    free: "Gratuit",
    plus: "Plus",
    premium: "Premium",
  };

  const planBadgeColor: Record<string, string> = {
    free: "bg-slate-100 text-slate-600",
    plus: "bg-blue-50 text-blue-700",
    premium: "bg-gradient-to-r from-amber-100 to-orange-100 text-orange-700",
  };

  const initials = userName?.trim()?.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "GU";

  async function handleFamilySwitch(familyId: string) {
    try {
      const response = await fetch("/api/families/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ familyId }),
      });

      if (response.ok) {
        window.location.href = window.location.pathname;
      }
    } catch (error) {
      console.error("Family switch failed:", error);
    }
  }

  async function handleLogout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (response.ok || response.status === 303) {
        window.location.replace("/login");
      }
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {sidebarOpen && (
        <button
          aria-label="Fermer le menu"
          className="fixed inset-0 z-40 bg-slate-900/35 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex min-h-screen">
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-[280px] transform border-r border-slate-200 bg-white/90 shadow-xl shadow-slate-200/60 backdrop-blur-xl transition-transform duration-200 lg:static lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/30">
                  <TreePine className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-base font-bold text-slate-900">GénéaPro</div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Family Suite</div>
                </div>
              </div>
            </div>

            <div className="p-4">
              <div className="relative">
                <button
                  onClick={() => setFamilyDropdown((v) => !v)}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-left shadow-sm transition hover:border-slate-300 hover:bg-slate-100"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                      <Home className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-700">
                        {currentFamily?.familyName ?? "Sélectionner"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {currentFamily && (
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${planBadgeColor[currentFamily.plan] ?? "bg-slate-100 text-slate-600"}`}>
                        {planBadge[currentFamily.plan] ?? currentFamily.plan}
                      </span>
                    )}
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  </div>
                </button>

                {familyDropdown && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                    {families.map((f) => (
                      <button
                        key={f.familyId}
                        type="button"
                        onClick={() => {
                          setFamilyDropdown(false);
                          void handleFamilySwitch(f.familyId);
                        }}
                        className={`flex w-full items-center justify-between px-3 py-3 text-left text-sm transition ${
                          f.familyId === currentFamilyId ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <span className="truncate">{f.familyName}</span>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${planBadgeColor[f.plan] ?? "bg-slate-100 text-slate-600"}`}>
                          {planBadge[f.plan] ?? f.plan}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <nav className="flex-1 space-y-2 px-4 pb-4">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition ${
                      isActive
                        ? "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 ring-1 ring-blue-100"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              {systemRole === "super_admin" && (
                <Link
                  href="/admin"
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition ${
                    pathname.startsWith("/admin")
                      ? "bg-gradient-to-r from-violet-50 to-purple-50 text-violet-700 ring-1 ring-violet-100"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Shield className="h-4 w-4 text-violet-500" />
                  Super Admin
                </Link>
              )}
            </nav>

            <div className="border-t border-slate-200 p-4">
              <div className="rounded-2xl bg-slate-50 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-slate-800 to-slate-600 text-sm font-bold text-white">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{userName}</p>
                    <p className="truncate text-xs text-slate-500">{currentFamily?.role ?? "Membre"}</p>
                  </div>
                  <form onSubmit={handleLogout}>
                    <button
                      type="submit"
                      className="rounded-xl p-2 text-slate-400 transition hover:bg-white hover:text-slate-600"
                      title="Déconnexion"
                    >
                      <LogOut className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur-xl md:px-6 lg:hidden">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setSidebarOpen(true)}
                className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-100"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <TreePine className="h-4 w-4 text-blue-600" />
                GénéaPro
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">Tableau de bord</p>
                <h1 className="mt-2 text-2xl font-bold text-slate-900">Bienvenue, {userName}</h1>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 md:flex">
                  <Search className="h-4 w-4" />
                  Rechercher
                </div>
                <button className="relative rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-600 transition hover:bg-slate-50">
                  <Bell className="h-4 w-4" />
                  <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-rose-500" />
                </button>
                <form onSubmit={handleLogout} className="inline-flex">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Déconnexion
                  </button>
                </form>
                <Link href="/members" className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:opacity-95">
                  <Plus className="h-4 w-4" />
                  Nouveau
                </Link>
              </div>
            </div>

            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
