"use client";

import { useQuery } from "@tanstack/react-query";
import { DrapeauSenegal, MinistereLogo, EtabLogo } from "@/components/official-logos";

interface PrintOfficialHeaderProps {
  className?: string;
}

/**
 * En-tête officielle République du Sénégal pour tous les documents imprimables.
 * Affiche : drapeau + (République / devise / Ministère / IA / IEF) + logo ministère,
 * puis une bande établissement avec le logo de l'école + son nom.
 */
export function PrintOfficialHeader({ className }: PrintOfficialHeaderProps) {
  const { data: etab } = useQuery({
    queryKey: ["etablissement"],
    queryFn: async () => {
      const r = await fetch("/api/etablissement");
      const j = await r.json();
      return j.data as {
        nom?: string;
        ia?: string;
        ief?: string;
        directeurNom?: string;
        logoPath?: string | null;
        typeEcole?: string;
      } | null;
    },
  });

  return (
    <div className={className ?? ""}>
      {/* Bande officielle République */}
      <div className="flex items-center gap-3 sm:gap-4 border-b-2 border-primary pb-2">
        <DrapeauSenegal className="h-14 w-14 sm:h-16 sm:w-16 flex-shrink-0" />
        <div className="flex-1 text-center min-w-0">
          <p className="font-bold text-sm sm:text-base">République du Sénégal</p>
          <p className="italic text-xs text-primary">Un peuple — Un but — Une foi</p>
          <p className="font-semibold text-sm mt-0.5">
            Ministère de l&apos;Éducation Nationale
          </p>
          <div className="flex items-center justify-center gap-x-2 gap-y-0.5 flex-wrap mt-1 text-xs">
            <span className="text-muted-foreground">
              Inspection d&apos;Académie de{" "}
              <span className="font-bold text-foreground">{etab?.ia ?? "..."}</span>
            </span>
            <span className="text-muted-foreground/40 hidden sm:inline">•</span>
            <span className="text-muted-foreground">
              I.E.F de{" "}
              <span className="font-bold text-foreground">{etab?.ief ?? "..."}</span>
            </span>
          </div>
        </div>
        <MinistereLogo className="h-14 w-14 sm:h-16 sm:w-16 flex-shrink-0" />
      </div>

      {/* Bande établissement avec logo de l'école */}
      <div className="flex items-center gap-3 py-2 mb-3 border-b border-foreground/20">
        <EtabLogo
          className="h-14 w-14 sm:h-16 sm:w-16 rounded-lg flex-shrink-0 border border-foreground/15"
          path={etab?.logoPath}
        />
        <div className="flex-1 min-w-0 text-center">
          <p className="font-bold text-sm sm:text-base uppercase">
            {etab?.nom ?? "Établissement"}
          </p>
          <p className="text-xs text-muted-foreground">
            {etab?.typeEcole === "PRIVEE" ? "École Privée" : "École Publique"}
            {etab?.directeurNom ? ` — Directeur : ${etab.directeurNom}` : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
