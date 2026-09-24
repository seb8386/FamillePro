import { db } from "./index";
import { featureLimits } from "./schema";

async function seed() {
  console.log("Seeding feature_limits...");

  const limits = [
    // Free plan
    { plan: "free" as const, featureKey: "max_members", limitValue: 50, description: "Maximum de membres dans l'arbre" },
    { plan: "free" as const, featureKey: "max_media", limitValue: 100, description: "Maximum de fichiers médias" },
    { plan: "free" as const, featureKey: "max_media_storage_mb", limitValue: 50, description: "Stockage maximum en MB" },
    { plan: "free" as const, featureKey: "can_colorize", limitValue: 0, description: "Colorisation IA" },
    { plan: "free" as const, featureKey: "can_export_gedcom", limitValue: 0, description: "Export GEDCOM" },
    { plan: "free" as const, featureKey: "can_invite_by_link", limitValue: 0, description: "Invitations par lien" },
    // Plus plan
    { plan: "plus" as const, featureKey: "max_members", limitValue: 500, description: "Maximum de membres dans l'arbre" },
    { plan: "plus" as const, featureKey: "max_media", limitValue: 1000, description: "Maximum de fichiers médias" },
    { plan: "plus" as const, featureKey: "max_media_storage_mb", limitValue: 500, description: "Stockage maximum en MB" },
    { plan: "plus" as const, featureKey: "can_colorize", limitValue: 1, description: "Colorisation IA" },
    { plan: "plus" as const, featureKey: "can_export_gedcom", limitValue: 1, description: "Export GEDCOM" },
    { plan: "plus" as const, featureKey: "can_invite_by_link", limitValue: 1, description: "Invitations par lien" },
    // Premium plan
    { plan: "premium" as const, featureKey: "max_members", limitValue: -1, description: "Maximum de membres (illimité)" },
    { plan: "premium" as const, featureKey: "max_media", limitValue: -1, description: "Maximum de médias (illimité)" },
    { plan: "premium" as const, featureKey: "max_media_storage_mb", limitValue: -1, description: "Stockage (illimité)" },
    { plan: "premium" as const, featureKey: "can_colorize", limitValue: 1, description: "Colorisation IA" },
    { plan: "premium" as const, featureKey: "can_export_gedcom", limitValue: 1, description: "Export GEDCOM" },
    { plan: "premium" as const, featureKey: "can_invite_by_link", limitValue: 1, description: "Invitations par lien" },
  ];

  await db.insert(featureLimits).values(limits).onConflictDoNothing();
  console.log("Seed complete!");
}

seed().catch(console.error);
