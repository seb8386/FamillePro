import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import type { SessionUser, AuthSession } from "@/types";

const configuredJwtSecret = process.env.JWT_SECRET;
if (process.env.NODE_ENV === "production" && (!configuredJwtSecret || configuredJwtSecret.length < 32)) {
  throw new Error("JWT_SECRET must be set and contain at least 32 characters in production");
}

const JWT_SECRET = new TextEncoder().encode(
  configuredJwtSecret ?? "dev-secret-change-in-production-min-32-chars!"
);

const SESSION_COOKIE = "genea_session";
const FAMILY_COOKIE = "genea_current_family";

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload.user as SessionUser;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) return null;

  const tokenUser = await verifySessionToken(token);
  if (!tokenUser) return null;

  const [currentUser] = await db
    .select({ id: users.id, email: users.email, systemRole: users.systemRole, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, tokenUser.id))
    .limit(1);

  if (!currentUser?.isActive) return null;

  const user: SessionUser = {
    ...tokenUser,
    email: currentUser.email,
    systemRole: currentUser.systemRole,
  };

  const currentFamilyId = cookieStore.get(FAMILY_COOKIE)?.value ?? null;

  const currentFamily = user.families.find((f) => f.familyId === currentFamilyId);
  const currentFamilyRole = currentFamily?.role ?? null;

  return {
    user,
    currentFamilyId,
    currentFamilyRole,
  };
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

export async function setCurrentFamilyCookie(familyId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(FAMILY_COOKIE, familyId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(FAMILY_COOKIE);
}

export function isSuperAdmin(user: SessionUser): boolean {
  return user.systemRole === "super_admin";
}

export async function resolveSelectedFamily(
  session: AuthSession,
  requestedFamilyId?: string | null
): Promise<{ familyId: string | null; currentFamilyRole: "admin" | "editor" | "contributor" | "reader" | null }> {
  const allowedIds = new Set(session.user.families.map((family) => family.familyId));

  const familyId =
    requestedFamilyId && allowedIds.has(requestedFamilyId)
      ? requestedFamilyId
      : session.currentFamilyId && allowedIds.has(session.currentFamilyId)
        ? session.currentFamilyId
        : session.user.families[0]?.familyId ?? null;

  const currentFamily = session.user.families.find((family) => family.familyId === familyId) ?? null;

  return {
    familyId,
    currentFamilyRole: currentFamily?.role ?? null,
  };
}
