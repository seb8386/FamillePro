import type { Plan, FeatureFlagConfig } from "@/types";
import { PLAN_FEATURES } from "@/types";
import { db } from "@/db";
import { persons, media } from "@/db/schema";
import { eq, count, sum } from "drizzle-orm";

/**
 * Get feature configuration for a given plan
 */
export function getFeatureConfig(plan: Plan): FeatureFlagConfig {
  return PLAN_FEATURES[plan];
}

/**
 * Check if a specific feature is available for a plan
 */
export function isFeatureEnabled(
  plan: Plan,
  feature: keyof FeatureFlagConfig
): boolean {
  const config = PLAN_FEATURES[plan];
  const value = config[feature];
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === -1 || value > 0;
  return false;
}

/**
 * Get the current usage for a family (members count, media count, storage)
 */
export async function getFamilyUsage(familyId: string) {
  const [memberCount] = await db
    .select({ count: count() })
    .from(persons)
    .where(eq(persons.familyId, familyId));

  const [mediaCount] = await db
    .select({ count: count() })
    .from(media)
    .where(eq(media.familyId, familyId));

  const [storage] = await db
    .select({ total: sum(media.sizeBytes) })
    .from(media)
    .where(eq(media.familyId, familyId));

  const totalBytes = Number(storage?.total ?? 0);

  return {
    members: Number(memberCount?.count ?? 0),
    media: Number(mediaCount?.count ?? 0),
    storageMb: Math.max(0, Number((totalBytes / 1024 / 1024).toFixed(2))),
  };
}

/**
 * Check if a family can add more members based on their plan
 */
export async function canAddMember(
  familyId: string,
  plan: Plan
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const config = PLAN_FEATURES[plan];
  const usage = await getFamilyUsage(familyId);
  const limit = config.maxMembers;

  return {
    allowed: limit === -1 || usage.members < limit,
    current: usage.members,
    limit,
  };
}

/**
 * Check if a family can upload more media
 */
export async function canUploadMedia(
  familyId: string,
  plan: Plan
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const config = PLAN_FEATURES[plan];
  const usage = await getFamilyUsage(familyId);
  const limit = config.maxMedia;

  return {
    allowed: limit === -1 || usage.media < limit,
    current: usage.media,
    limit,
  };
}
