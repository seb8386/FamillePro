"use client";

import { TreePine, WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-200">
          <WifiOff className="h-8 w-8 text-slate-400" />
        </div>
        <h1 className="text-xl font-semibold text-slate-900">
          Vous êtes hors-ligne
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Vérifiez votre connexion internet et réessayez.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}
