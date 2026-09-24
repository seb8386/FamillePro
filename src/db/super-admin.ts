import bcrypt from "bcryptjs";
import { db } from "@/db";
import { profiles, users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function ensureSuperAdmin(email?: string, password?: string) {
  const targetEmail = (email ?? process.env.SUPER_ADMIN_EMAIL)?.trim().toLowerCase();
  const targetPassword = password ?? process.env.SUPER_ADMIN_PASSWORD;

  if (!targetEmail || !targetPassword) {
    throw new Error("SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD are required");
  }

  if (targetPassword.length < 12) {
    throw new Error("SUPER_ADMIN_PASSWORD must contain at least 12 characters");
  }

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, targetEmail))
    .limit(1);

  if (existing) {
    if (existing.systemRole !== "super_admin") {
      await db
        .update(users)
        .set({ systemRole: "super_admin", isActive: true, updatedAt: new Date() })
        .where(eq(users.id, existing.id));
    }

    return {
      email: existing.email,
      systemRole: existing.systemRole,
      created: false,
    };
  }

  const passwordHash = await bcrypt.hash(targetPassword, 10);
  const [createdUser] = await db
    .insert(users)
    .values({
      email: targetEmail,
      passwordHash,
      systemRole: "super_admin",
      emailVerified: true,
      isActive: true,
    })
    .returning();

  await db.insert(profiles).values({
    userId: createdUser.id,
    firstName: "Super",
    lastName: "Admin",
    locale: "fr",
  }).onConflictDoNothing();

  return {
    email: createdUser.email,
    systemRole: createdUser.systemRole,
    created: true,
  };
}

async function main() {
  const result = await ensureSuperAdmin();
  console.log(result);
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Super admin bootstrap failed:", error);
    process.exit(1);
  });
}
