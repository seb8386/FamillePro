import { getSession } from "@/lib/auth";
import { MediaClient } from "./MediaClient";

export const dynamic = "force-dynamic";

export default async function MediaPage() {
  const session = await getSession();
  if (!session) {
    return <div className="p-8 text-center"><a href="/login" className="text-blue-600">Se connecter</a></div>;
  }

  return <MediaClient />;
}
