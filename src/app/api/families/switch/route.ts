import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth";

const FAMILY_COOKIE = "genea_current_family";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const familyId = body?.familyId;

    if (!familyId || !session.user.families.some((family) => family.familyId === familyId)) {
      return NextResponse.json({ error: "Famille inconnue ou non autorisée" }, { status: 403 });
    }

    const cookieStore = await cookies();
    cookieStore.set(FAMILY_COOKIE, familyId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });

    return NextResponse.json({ success: true, familyId });
  } catch (error) {
    console.error("Switch family error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
