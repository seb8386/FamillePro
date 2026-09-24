import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { and, count, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { users, profiles, families, familyMembers } from "@/db/schema";
import { getSession, isSuperAdmin } from "@/lib/auth";

function normalizeUserRole(role: string): "super_admin" | "admin" | "editor" | "contributor" | "reader" {
  return ["super_admin", "admin", "editor", "contributor", "reader"].includes(role)
    ? (role as "super_admin" | "admin" | "editor" | "contributor" | "reader")
    : "reader";
}

function buildDisplayName(firstName?: string | null, lastName?: string | null) {
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  return fullName || "Utilisateur";
}

async function hasAnotherSuperAdmin(userId: string) {
  const [result] = await db
    .select({ total: count() })
    .from(users)
    .where(and(
      eq(users.systemRole, "super_admin"),
      eq(users.isActive, true),
      ne(users.id, userId),
    ));

  return (result?.total ?? 0) > 0;
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !isSuperAdmin(session.user)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        systemRole: users.systemRole,
        isActive: users.isActive,
        createdAt: users.createdAt,
        firstName: profiles.firstName,
        lastName: profiles.lastName,
      })
      .from(users)
      .leftJoin(profiles, eq(users.id, profiles.userId))
      .orderBy(users.createdAt);

    const memberships = await db
      .select({
        userId: familyMembers.userId,
        familyId: familyMembers.familyId,
        role: familyMembers.role,
        familyName: families.name,
        plan: families.plan,
      })
      .from(familyMembers)
      .leftJoin(families, eq(familyMembers.familyId, families.id));

    const byUser = new Map<string, { familyName: string; plan: "free" | "plus" | "premium"; role: string }>();
    for (const membership of memberships) {
      byUser.set(membership.userId, {
        familyName: membership.familyName ?? "Aucune",
        plan: (membership.plan ?? "free") as "free" | "plus" | "premium",
        role: membership.role ?? "reader",
      });
    }

    return NextResponse.json(
      rows.map((row) => {
        const membership = byUser.get(row.id);
        return {
          id: row.id,
          name: buildDisplayName(row.firstName, row.lastName),
          email: row.email,
          role: row.systemRole,
          status: row.isActive ? "actif" : "inactif",
          family: membership?.familyName ?? "Aucune",
          plan: membership?.plan ?? "free",
        };
      })
    );
  } catch (error) {
    console.error("Admin get users error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isSuperAdmin(session.user)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await request.json();
    const { email, password, firstName, lastName, family, role, status, plan } = body;

    if (!email || !String(email).trim()) {
      return NextResponse.json({ error: "Email requis" }, { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const passwordHash = await bcrypt.hash(String(password ?? "Temp123!"), 12);

    const [user] = await db
      .insert(users)
      .values({
        email: normalizedEmail,
        passwordHash,
        systemRole: normalizeUserRole(role ?? "admin"),
        isActive: status === "inactif" ? false : true,
      })
      .returning();

    await db.insert(profiles).values({
      userId: user.id,
      firstName: firstName ?? null,
      lastName: lastName ?? null,
    });

    const familyName = String(family ?? "").trim();
    if (familyName) {
      const normalizedSlug = `${familyName.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 48)}-${Math.random().toString(36).slice(2, 8)}`;
      const [newFamily] = await db
        .insert(families)
        .values({
          name: familyName,
          slug: normalizedSlug,
          ownerId: user.id,
          plan: (plan ?? "free") as "free" | "plus" | "premium",
          isActive: true,
        })
        .returning();

      await db.insert(familyMembers).values({
        familyId: newFamily.id,
        userId: user.id,
        role: "admin",
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin create user error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isSuperAdmin(session.user)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const body = await request.json();
    const { email, firstName, lastName, role, status, familyName } = body;
    const [targetUser] = await db
      .select({ id: users.id, systemRole: users.systemRole })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!targetUser) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    const nextRole = role ? normalizeUserRole(role) : targetUser.systemRole;
    const isDeactivating = status === "inactif";
    if (targetUser.systemRole === "super_admin" && nextRole !== "super_admin" ||
        targetUser.systemRole === "super_admin" && isDeactivating) {
      if (!(await hasAnotherSuperAdmin(id))) {
        return NextResponse.json(
          { error: "Le dernier super-administrateur ne peut pas être rétrogradé ou désactivé" },
          { status: 409 }
        );
      }
    }

    await db
      .update(users)
      .set({
        ...(email ? { email: String(email).trim().toLowerCase() } : {}),
        ...(role ? { systemRole: normalizeUserRole(role) } : {}),
        ...(status ? { isActive: status !== "inactif" } : {}),
      })
      .where(eq(users.id, id));

    if (firstName !== undefined || lastName !== undefined) {
      const [profile] = await db.select().from(profiles).where(eq(profiles.userId, id));
      if (profile) {
        await db
          .update(profiles)
          .set({
            firstName: firstName ?? profile.firstName,
            lastName: lastName ?? profile.lastName,
          })
          .where(eq(profiles.userId, id));
      }
    }

    if (familyName) {
      const [family] = await db
        .select()
        .from(families)
        .where(sql`lower(name) = lower(${familyName})`)
        .limit(1);

      if (family) {
        const [membership] = await db
          .select()
          .from(familyMembers)
          .where(and(eq(familyMembers.userId, id), eq(familyMembers.familyId, family.id)));

        if (!membership) {
          await db.insert(familyMembers).values({ familyId: family.id, userId: id, role: "reader" });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin update user error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !isSuperAdmin(session.user)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    if (id === session.user.id) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas supprimer votre propre compte super-administrateur" },
        { status: 409 }
      );
    }

    const [targetUser] = await db
      .select({ systemRole: users.systemRole })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!targetUser) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    if (targetUser.systemRole === "super_admin" && !(await hasAnotherSuperAdmin(id))) {
      return NextResponse.json(
        { error: "Le dernier super-administrateur ne peut pas être supprimé" },
        { status: 409 }
      );
    }

    await db.delete(users).where(eq(users.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin delete user error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
