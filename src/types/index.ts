import type {
  users,
  profiles,
  families,
  familyMembers,
  persons,
  relationships,
  media,
  invitations,
  subscriptions,
  payments,
  featureLimits,
  auditLogs,
} from "@/db/schema";

// ──────────────────────────────────────────────
// Database Row Types
// ──────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type Family = typeof families.$inferSelect;
export type NewFamily = typeof families.$inferInsert;
export type FamilyMember = typeof familyMembers.$inferSelect;
export type NewFamilyMember = typeof familyMembers.$inferInsert;
export type Person = typeof persons.$inferSelect;
export type NewPerson = typeof persons.$inferInsert;
export type Relationship = typeof relationships.$inferSelect;
export type NewRelationship = typeof relationships.$inferInsert;
export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;
export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type FeatureLimit = typeof featureLimits.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;

// ──────────────────────────────────────────────
// Enums
// ──────────────────────────────────────────────

export type SystemRole = "super_admin" | "admin" | "editor" | "contributor" | "reader";
export type FamilyRole = "admin" | "editor" | "contributor" | "reader";
export type Gender = "male" | "female" | "other" | "unknown";
export type RelationshipType =
  | "parent"
  | "child"
  | "spouse"
  | "sibling"
  | "adoptive_parent"
  | "adoptive_child"
  | "step_parent"
  | "step_child";
export type Plan = "free" | "plus" | "premium";
export type SubscriptionStatus = "active" | "past_due" | "canceled" | "trialing";
export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";
export type PaymentProvider = "flexpay" | "paystack" | "maxicash" | "stripe";
export type MediaType = "photo" | "document" | "video" | "audio";
export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";

// ──────────────────────────────────────────────
// Application Types
// ──────────────────────────────────────────────

export interface SessionUser {
  id: string;
  email: string;
  systemRole: SystemRole;
  profile?: {
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
  };
  families: {
    familyId: string;
    familyName: string;
    familySlug: string;
    role: FamilyRole;
    plan: Plan;
  }[];
}

export interface AuthSession {
  user: SessionUser;
  currentFamilyId: string | null;
  currentFamilyRole: FamilyRole | null;
}

// ──────────────────────────────────────────────
// Feature Flags
// ──────────────────────────────────────────────

export interface FeatureFlagConfig {
  maxMembers: number; // -1 = unlimited
  maxMedia: number;
  maxMediaStorageMb: number;
  canColorizePhotos: boolean;
  canExportGedcom: boolean;
  canInviteByLink: boolean;
  canUseAiSuggestions: boolean;
  canCreateMultipleTrees: boolean;
  customThemes: boolean;
  prioritySupport: boolean;
}

export const PLAN_FEATURES: Record<Plan, FeatureFlagConfig> = {
  free: {
    maxMembers: 50,
    maxMedia: 100,
    maxMediaStorageMb: 50,
    canColorizePhotos: false,
    canExportGedcom: false,
    canInviteByLink: false,
    canUseAiSuggestions: false,
    canCreateMultipleTrees: false,
    customThemes: false,
    prioritySupport: false,
  },
  plus: {
    maxMembers: 500,
    maxMedia: 1000,
    maxMediaStorageMb: 500,
    canColorizePhotos: true,
    canExportGedcom: true,
    canInviteByLink: true,
    canUseAiSuggestions: true,
    canCreateMultipleTrees: false,
    customThemes: false,
    prioritySupport: false,
  },
  premium: {
    maxMembers: -1,
    maxMedia: -1,
    maxMediaStorageMb: -1,
    canColorizePhotos: true,
    canExportGedcom: true,
    canInviteByLink: true,
    canUseAiSuggestions: true,
    canCreateMultipleTrees: true,
    customThemes: true,
    prioritySupport: true,
  },
};

// ──────────────────────────────────────────────
// RBAC Permission Map
// ──────────────────────────────────────────────

export type Permission =
  | "tree:view"
  | "tree:edit"
  | "tree:delete"
  | "member:view"
  | "member:invite"
  | "member:remove"
  | "member:change_role"
  | "media:upload"
  | "media:delete"
  | "settings:view"
  | "settings:edit"
  | "billing:view"
  | "billing:manage"
  | "invitation:create"
  | "invitation:revoke";

const ROLE_PERMISSIONS: Record<FamilyRole, Permission[]> = {
  admin: [
    "tree:view", "tree:edit", "tree:delete",
    "member:view", "member:invite", "member:remove", "member:change_role",
    "media:upload", "media:delete",
    "settings:view", "settings:edit",
    "billing:view", "billing:manage",
    "invitation:create", "invitation:revoke",
  ],
  editor: [
    "tree:view", "tree:edit",
    "member:view",
    "media:upload", "media:delete",
    "settings:view",
    "billing:view",
  ],
  contributor: [
    "tree:view", "tree:edit",
    "member:view",
    "media:upload",
    "settings:view",
  ],
  reader: [
    "tree:view",
    "member:view",
    "settings:view",
  ],
};

export function hasPermission(role: FamilyRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function getPermissions(role: FamilyRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

// ──────────────────────────────────────────────
// Tree Visualization Types
// ──────────────────────────────────────────────

export interface TreeNode {
  person: Person;
  relations: {
    type: RelationshipType;
    person: Person;
  }[];
  media: Media[];
}

export interface TreeLayout {
  nodes: TreeLayoutNode[];
  edges: TreeLayoutEdge[];
}

export interface TreeLayoutNode {
  id: string;
  x: number;
  y: number;
  person: Person;
  isRoot: boolean;
  generation: number;
}

export interface TreeLayoutEdge {
  from: string;
  to: string;
  type: RelationshipType;
  label?: string;
}

// ──────────────────────────────────────────────
// Payment Webhook Types
// ──────────────────────────────────────────────

export interface PaymentWebhookPayload {
  event: string;
  data: {
    reference: string;
    amount: number;
    currency: string;
    status: string;
    provider: PaymentProvider;
    familyId: string;
    subscriptionId?: string;
    metadata?: Record<string, unknown>;
  };
}
