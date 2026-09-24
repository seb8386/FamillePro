import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, profiles, families, familyMembers, invitations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { nanoid } from "nanoid";
import type { SessionUser } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const { email, password, firstName, lastName, inviteToken } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe requis" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins 8 caractères" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    const [invitation] = inviteToken
      ? await db.select().from(invitations).where(and(eq(invitations.token, inviteToken), eq(invitations.status, "pending")))
      : [];
    if (inviteToken && (!invitation || invitation.expiresAt < new Date())) {
      return NextResponse.json({ error: "Invitation invalide ou expirée" }, { status: 400 });
    }

    // Check if user already exists
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail));

    if (existing) {
      return NextResponse.json(
        { error: "Un compte avec cet email existe déjà" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const [user] = await db
      .insert(users)
      .values({
        email: normalizedEmail,
        passwordHash,
        systemRole: "admin",
        emailVerified: false,
        isActive: true,
      })
      .returning();

    // Create profile
    await db.insert(profiles).values({
      userId: user.id,
      firstName: firstName ?? null,
      lastName: lastName ?? null,
    });

    let family;
    if (invitation) {
      [family] = await db.select().from(families).where(eq(families.id, invitation.familyId));
      if (!family) return NextResponse.json({ error: "Famille introuvable" }, { status: 404 });
      await db.insert(familyMembers).values({
        familyId: family.id,
        userId: user.id,
        role: invitation.role,
        invitedBy: invitation.invitedBy,
      });
      await db.update(invitations).set({ status: "accepted", usedAt: new Date() }).where(eq(invitations.id, invitation.id));
    } else {
      const familySlug = `famille-${nanoid(8)}`;
      [family] = await db.insert(families).values({
        name: lastName ? `Famille ${lastName}` : "Ma Famille",
        slug: familySlug,
        ownerId: user.id,
        plan: "free",
        isActive: true,
      }).returning();
      await db.insert(familyMembers).values({ familyId: family.id, userId: user.id, role: "admin" });
    }

    const sessionUser: SessionUser = {
      id: user.id,
      email: user.email,
      systemRole: user.systemRole,
      profile: {
        firstName: firstName ?? null,
        lastName: lastName ?? null,
        avatarUrl: null,
      },
      families: [
        {
          familyId: family.id,
          familyName: family.name,
          familySlug: family.slug,
          role: "admin",
          plan: "free",
        },
      ],
    };

    const token = await createSessionToken(sessionUser);
    await setSessionCookie(token);

    await logAudit({
      userId: user.id,
      action: "register",
      entityType: "user",
      entityId: user.id,
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
    });

    return NextResponse.json({ success: true, user: sessionUser });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
