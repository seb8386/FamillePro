import { redirect } from "next/navigation";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import {
  TreePine,
  Users,
  Sparkles,
  Shield,
  Smartphone,
  Globe,
  ArrowRight,
  Check,
  Heart,
  GitBranchPlus,
} from "lucide-react";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession();
  if (session) {
    redirect(session.user.systemRole === "super_admin" ? "/admin" : "/dashboard");
  }

  // Verify DB connection
  await db.execute(sql`select 1`);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMyNTYzZWIiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />

        <div className="relative mx-auto max-w-6xl px-6 py-24 md:py-32">
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-xl shadow-blue-600/30">
              <TreePine className="h-8 w-8 text-white" />
            </div>

            <h1 className="text-4xl font-bold leading-tight text-white md:text-6xl md:leading-tight">
              Votre histoire familiale,
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                magnifiquement organisée
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300 md:text-xl">
              GénéaPro est l&apos;application de généalogie nouvelle génération.
              Créez votre arbre, collaborez en famille, colorisez vos photos
              anciennes avec l&apos;IA.
            </p>

            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <a
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-colors"
              >
                Commencer gratuitement
                <ArrowRight className="h-5 w-5" />
              </a>
              <a
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-8 py-4 text-base font-semibold text-white hover:bg-white/10 transition-colors"
              >
                Se connecter
              </a>
            </div>

            <p className="mt-4 text-sm text-slate-400">
              Gratuit · Sans carte bancaire · Jusqu&apos;à 50 membres
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-slate-900">
              Tout pour votre généalogie
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Des fonctionnalités pensées pour les généalogistes modernes
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: GitBranchPlus,
                title: "Arbre dynamique",
                desc: "Créez des arbres complexes avec relations multiples : parents, conjoints, adoptions, familles recomposées.",
                color: "bg-blue-50 text-blue-600",
              },
              {
                icon: Users,
                title: "Collaboration familiale",
                desc: "Invitez votre famille par lien ou WhatsApp. Chacun contribue selon son rôle : admin, éditeur, lecteur.",
                color: "bg-emerald-50 text-emerald-600",
              },
              {
                icon: Sparkles,
                title: "Colorisation IA",
                desc: "Redonnez vie à vos photos anciennes grâce à la colorisation automatique par intelligence artificielle.",
                color: "bg-purple-50 text-purple-600",
              },
              {
                icon: Shield,
                title: "Sécurité multi-tenant",
                desc: "Isolation stricte des données par famille. Chaque famille est complètement séparée et sécurisée.",
                color: "bg-amber-50 text-amber-600",
              },
              {
                icon: Smartphone,
                title: "Application mobile",
                desc: "Installez GénéaPro sur votre téléphone. Fonctionne hors-ligne comme une vraie application native.",
                color: "bg-pink-50 text-pink-600",
              },
              {
                icon: Globe,
                title: "Paiement Mobile Money",
                desc: "Payez avec FlexPay, Paystack ou MaxiCash. Déblocage instantané des fonctionnalités via webhooks.",
                color: "bg-indigo-50 text-indigo-600",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-slate-200/60 bg-white p-8 shadow-[0_2px_12px_rgba(16,24,40,0.04)] hover:shadow-md transition-shadow"
              >
                <div
                  className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${feature.color}`}
                >
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="bg-slate-50 py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-bold text-slate-900">
            Simple et transparent
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Commencez gratuitement, évoluez quand vous êtes prêt
          </p>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                name: "Gratuit",
                price: "0 DOLLARS",
                features: ["50 membres", "100 médias", "1 arbre"],
              },
              {
                name: "Plus",
                price: "9,99 DOLLARS",
                features: [
                  "500 membres",
                  "1 000 médias",
                  "Colorisation IA",
                  "Export GEDCOM",
                  "Invitations par lien",
                ],
                popular: true,
              },
              {
                name: "Premium",
                price: "24,99 DOLLARS",
                features: [
                  "Membres illimités",
                  "Médias illimités",
                  "Toutes les fonctionnalités",
                  "Support prioritaire",
                ],
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl bg-white p-8 shadow-md ${
                  plan.popular
                    ? "ring-2 ring-blue-500 relative"
                    : "ring-1 ring-slate-200"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white">
                    Populaire
                  </div>
                )}
                <h3 className="text-lg font-semibold text-slate-900">
                  {plan.name}
                </h3>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {plan.price}
                  <span className="text-base font-normal text-slate-500">
                    /mois
                  </span>
                </p>
                <ul className="mt-6 space-y-2 text-sm text-slate-600">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-500" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <a
            href="/register"
            className="mt-10 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-4 text-base font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Créer mon arbre gratuitement
            <ArrowRight className="h-5 w-5" />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2">
              <TreePine className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-semibold text-slate-900">
                GénéaPro
              </span>
            </div>
            <p className="text-xs text-slate-500">
              © {new Date().getFullYear()} GénéaPro. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
