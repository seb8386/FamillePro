import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  jsonb,
  pgEnum,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ──────────────────────────────────────────────
// ENUMS
// ──────────────────────────────────────────────

export const systemRoleEnum = pgEnum("system_role", [
  "super_admin",
  "admin",
  "editor",
  "contributor",
  "reader",
]);

export const familyRoleEnum = pgEnum("family_role", [
  "admin",
  "editor",
  "contributor",
  "reader",
]);

export const genderEnum = pgEnum("gender", ["male", "female", "other", "unknown"]);

export const relationshipTypeEnum = pgEnum("relationship_type", [
  "parent",
  "child",
  "spouse",
  "sibling",
  "adoptive_parent",
  "adoptive_child",
  "step_parent",
  "step_child",
]);

export const planEnum = pgEnum("plan", ["free", "plus", "premium"]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "past_due",
  "canceled",
  "trialing",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "completed",
  "failed",
  "refunded",
]);

export const paymentProviderEnum = pgEnum("payment_provider", [
  "flexpay",
  "paystack",
  "maxicash",
  "stripe",
]);

export const mediaTypeEnum = pgEnum("media_type", [
  "photo",
  "document",
  "video",
  "audio",
]);

export const invitationStatusEnum = pgEnum("invitation_status", [
  "pending",
  "accepted",
  "expired",
  "revoked",
]);

export const proposalStatusEnum = pgEnum("proposal_status", [
  "pending",
  "approved",
  "rejected",
]);

// ──────────────────────────────────────────────
// USERS & PROFILES
// ──────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    systemRole: systemRoleEnum("system_role").default("admin").notNull(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("users_email_idx").on(table.email),
  ]
);

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull()
      .unique(),
    firstName: varchar("first_name", { length: 100 }),
    lastName: varchar("last_name", { length: 100 }),
    avatarUrl: text("avatar_url"),
    phone: varchar("phone", { length: 30 }),
    locale: varchar("locale", { length: 10 }).default("fr"),
    bio: text("bio"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("profiles_user_idx").on(table.userId),
  ]
);

// ──────────────────────────────────────────────
// FAMILIES (TENANTS)
// ──────────────────────────────────────────────

export const families = pgTable(
  "families",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    description: text("description"),
    avatarUrl: text("avatar_url"),
    coverUrl: text("cover_url"),
    ownerId: uuid("owner_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    plan: planEnum("plan").default("free").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    settings: jsonb("settings").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("families_slug_idx").on(table.slug),
    index("families_owner_idx").on(table.ownerId),
  ]
);

// ──────────────────────────────────────────────
// FAMILY MEMBERS (RBAC JUNCTION)
// ──────────────────────────────────────────────

export const familyMembers = pgTable(
  "family_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    familyId: uuid("family_id")
      .references(() => families.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    role: familyRoleEnum("role").default("reader").notNull(),
    invitedBy: uuid("invited_by").references(() => users.id),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("family_members_unique_idx").on(table.familyId, table.userId),
    index("family_members_family_idx").on(table.familyId),
    index("family_members_user_idx").on(table.userId),
  ]
);

// ──────────────────────────────────────────────
// PERSONS (INDIVIDUALS IN FAMILY TREE)
// ──────────────────────────────────────────────

export const persons = pgTable(
  "persons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    familyId: uuid("family_id")
      .references(() => families.id, { onDelete: "cascade" })
      .notNull(),
    firstName: varchar("first_name", { length: 100 }).notNull(),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    maidenName: varchar("maiden_name", { length: 100 }),
    birthDate: timestamp("birth_date", { withTimezone: true }),
    deathDate: timestamp("death_date", { withTimezone: true }),
    gender: genderEnum("gender").default("unknown").notNull(),
    bio: text("bio"),
    avatarUrl: text("avatar_url"),
    isLiving: boolean("is_living").default(true).notNull(),
    placeOfBirth: varchar("place_of_birth", { length: 200 }),
    placeOfDeath: varchar("place_of_death", { length: 200 }),
    occupation: varchar("occupation", { length: 200 }),
    nationality: varchar("nationality", { length: 100 }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdBy: uuid("created_by")
      .references(() => users.id)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("persons_family_idx").on(table.familyId),
    index("persons_created_by_idx").on(table.createdBy),
  ]
);

// ──────────────────────────────────────────────
// RELATIONSHIPS
// ──────────────────────────────────────────────

export const relationships = pgTable(
  "relationships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    familyId: uuid("family_id")
      .references(() => families.id, { onDelete: "cascade" })
      .notNull(),
    personId1: uuid("person_id_1")
      .references(() => persons.id, { onDelete: "cascade" })
      .notNull(),
    personId2: uuid("person_id_2")
      .references(() => persons.id, { onDelete: "cascade" })
      .notNull(),
    type: relationshipTypeEnum("type").notNull(),
    startDate: timestamp("start_date", { withTimezone: true }),
    endDate: timestamp("end_date", { withTimezone: true }),
    isCurrent: boolean("is_current").default(true).notNull(),
    notes: text("notes"),
    createdBy: uuid("created_by")
      .references(() => users.id)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("relationships_family_idx").on(table.familyId),
    index("relationships_person1_idx").on(table.personId1),
    index("relationships_person2_idx").on(table.personId2),
  ]
);

// ──────────────────────────────────────────────
// MEDIA
// ──────────────────────────────────────────────

export const media = pgTable(
  "media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    familyId: uuid("family_id")
      .references(() => families.id, { onDelete: "cascade" })
      .notNull(),
    personId: uuid("person_id").references(() => persons.id, { onDelete: "cascade" }),
    type: mediaTypeEnum("type").notNull(),
    url: text("url").notNull(),
    filename: varchar("filename", { length: 255 }).notNull(),
    mimeType: varchar("mime_type", { length: 100 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    title: varchar("title", { length: 255 }),
    description: text("description"),
    isProfilePhoto: boolean("is_profile_photo").default(false).notNull(),
    uploadedBy: uuid("uploaded_by")
      .references(() => users.id)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("media_family_idx").on(table.familyId),
    index("media_person_idx").on(table.personId),
  ]
);

// ──────────────────────────────────────────────
// INVITATIONS
// ──────────────────────────────────────────────

export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    familyId: uuid("family_id")
      .references(() => families.id, { onDelete: "cascade" })
      .notNull(),
    personId: uuid("person_id").references(() => persons.id, { onDelete: "set null" }),
    token: varchar("token", { length: 64 }).notNull().unique(),
    email: varchar("email", { length: 255 }),
    role: familyRoleEnum("role").default("reader").notNull(),
    invitedBy: uuid("invited_by")
      .references(() => users.id)
      .notNull(),
    status: invitationStatusEnum("status").default("pending").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    message: text("message"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("invitations_token_idx").on(table.token),
    index("invitations_family_idx").on(table.familyId),
    index("invitations_email_idx").on(table.email),
  ]
);

// ──────────────────────────────────────────────
// COLLABORATIVE PROPOSALS
// ──────────────────────────────────────────────

export const personProposals = pgTable(
  "person_proposals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    familyId: uuid("family_id")
      .references(() => families.id, { onDelete: "cascade" })
      .notNull(),
    personId: uuid("person_id")
      .references(() => persons.id, { onDelete: "cascade" })
      .notNull(),
    proposedBy: uuid("proposed_by")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    changes: jsonb("changes").$type<Record<string, string | null>>().notNull(),
    status: proposalStatusEnum("status").default("pending").notNull(),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewNote: text("review_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("person_proposals_family_idx").on(table.familyId),
    index("person_proposals_person_idx").on(table.personId),
    index("person_proposals_status_idx").on(table.status),
  ]
);

// ──────────────────────────────────────────────
// SUBSCRIPTIONS
// ──────────────────────────────────────────────

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    familyId: uuid("family_id")
      .references(() => families.id, { onDelete: "cascade" })
      .notNull(),
    plan: planEnum("plan").notNull(),
    status: subscriptionStatusEnum("status").default("active").notNull(),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }).notNull(),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }).notNull(),
    provider: paymentProviderEnum("provider").notNull(),
    providerSubscriptionId: varchar("provider_subscription_id", { length: 255 }),
    trialEnd: timestamp("trial_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("subscriptions_family_idx").on(table.familyId),
  ]
);

// ──────────────────────────────────────────────
// PAYMENTS
// ──────────────────────────────────────────────

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    familyId: uuid("family_id")
      .references(() => families.id, { onDelete: "cascade" })
      .notNull(),
    subscriptionId: uuid("subscription_id").references(() => subscriptions.id),
    amount: integer("amount").notNull(), // in cents
    currency: varchar("currency", { length: 3 }).default("USD").notNull(),
    provider: paymentProviderEnum("provider").notNull(),
    providerPaymentId: varchar("provider_payment_id", { length: 255 }),
    status: paymentStatusEnum("status").default("pending").notNull(),
    webhookData: jsonb("webhook_data").$type<Record<string, unknown>>(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("payments_family_idx").on(table.familyId),
    index("payments_subscription_idx").on(table.subscriptionId),
  ]
);

// ──────────────────────────────────────────────
// FEATURE LIMITS (per plan)
// ──────────────────────────────────────────────

export const featureLimits = pgTable("feature_limits", {
  id: uuid("id").primaryKey().defaultRandom(),
  plan: planEnum("plan").notNull(),
  featureKey: varchar("feature_key", { length: 100 }).notNull(),
  limitValue: integer("limit_value").notNull(), // -1 = unlimited
  description: text("description"),
});

// ──────────────────────────────────────────────
// AUDIT LOGS
// ──────────────────────────────────────────────

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    familyId: uuid("family_id").references(() => families.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id),
    action: varchar("action", { length: 100 }).notNull(),
    entityType: varchar("entity_type", { length: 50 }).notNull(),
    entityId: uuid("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ipAddress: varchar("ip_address", { length: 45 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("audit_logs_family_idx").on(table.familyId),
    index("audit_logs_user_idx").on(table.userId),
    index("audit_logs_created_at_idx").on(table.createdAt),
  ]
);

// ──────────────────────────────────────────────
// WAITLIST
// ──────────────────────────────────────────────

export const waitlist = pgTable("waitlist", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  referredBy: uuid("referred_by"),
  position: integer("position").notNull(),
  notifiedAt: timestamp("notified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
