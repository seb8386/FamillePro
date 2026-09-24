import { getSession } from "@/lib/auth";
import { SettingsClient } from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) {
    return <div className="p-8 text-center"><a href="/login" className="text-blue-600">Se connecter</a></div>;
  }

  return (
    <SettingsClient
      user={{
        email: session.user.email,
        firstName: session.user.profile?.firstName ?? "",
        lastName: session.user.profile?.lastName ?? "",
        systemRole: session.user.systemRole,
      }}
      families={session.user.families}
    />
  );
}
