import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, profiles, families, familyMembers } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import type { SessionUser } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe requis" },
        { status: 400 }
      );
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()));

    if (!user) {
      return NextResponse.json(
        { error: "Identifiants invalides" },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Identifiants invalides" },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "Compte désactivé" },
        { status: 403 }
      );
    }

    // Update last login
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    // Get profile
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, user.id));

    // Get family memberships
    const memberships = await db
      .select({
        familyId: familyMembers.familyId,
        role: familyMembers.role,
        familyName: families.name,
        familySlug: families.slug,
        plan: families.plan,
      })
      .from(familyMembers)
      .innerJoin(families, eq(familyMembers.familyId, families.id))
      .where(eq(familyMembers.userId, user.id));

    const sessionUser: SessionUser = {
      id: user.id,
      email: user.email,
      systemRole: user.systemRole,
      profile: {
        firstName: profile?.firstName ?? null,
        lastName: profile?.lastName ?? null,
        avatarUrl: profile?.avatarUrl ?? null,
      },
      families: memberships,
    };

    const token = await createSessionToken(sessionUser);
    await setSessionCookie(token);

    await logAudit({
      userId: user.id,
      action: "login",
      entityType: "user",
      entityId: user.id,
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
    });

    return NextResponse.json({ success: true, user: sessionUser });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
