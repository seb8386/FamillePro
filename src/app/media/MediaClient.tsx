"use client";

import { Image, Upload, FolderOpen, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export function MediaClient() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-slate-900">Médias</h1>
          <Badge variant="info">0 fichiers</Badge>
        </div>
        <Button>
          <Upload className="h-4 w-4" />
          Téléverser
        </Button>
      </div>

      {/* Upload area */}
      <Card className="mb-8">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <Upload className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="mt-4 text-sm font-medium text-slate-700">
            Glissez-déposez vos fichiers ici
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            ou cliquez pour sélectionner · JPG, PNG, PDF, MP4
          </p>
          <Button variant="outline" size="sm" className="mt-4">
            Parcourir les fichiers
          </Button>
        </div>
      </Card>

      {/* Placeholder gallery */}
      <div className="py-12 text-center">
        <FolderOpen className="mx-auto h-12 w-12 text-slate-300" />
        <p className="mt-4 text-slate-500">
          Aucun média pour le moment
        </p>
        <p className="mt-1 text-sm text-slate-400">
          Les photos et documents de votre arbre apparaîtront ici
        </p>
      </div>
    </div>
  );
}
