"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Printer } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { getPeriodes, PERIODE_LIBELLE } from "@/lib/data";
import { DrapeauSenegal, MinistereLogo } from "@/components/official-logos";

interface Classe {
  id: string;
  nom: string;
  etape: number;
  cycle: { nom: string };
}

interface StatData {
  classe: string;
  cycle: string;
  anneeLibelle: string;
  effectif: { garcons: number; filles: number; total: number };
  ontCompose: { garcons: number; filles: number; total: number };
  ontEuLaMoyenne: { garcons: number; filles: number; total: number };
  tauxReussite: number;
  statsDomaine: {
    matiereId: string;
    domaine: string;
    activite: string;
    garcons: number;
    filles: number;
    total: number;
    ayantMoyenne: number;
    moyenne: number;
    pourcentage: number;
  }[];
}

const DOMAINE_LIBELLE: Record<string, string> = {
  LC: "LC",
  MATHS: "MATHS",
  ESVS: "E.S.V.S",
  EPSA: "E.P.S.A",
  ED_RELIG: "Ed.Relig",
  ANGLAIS: "ANGLAIS",
};

export function StatistiquesView() {
  const anneeCouranteId = useAppStore((s) => s.anneeCouranteId);
  const cycleCourant = useAppStore((s) => s.cycleCourant);
  const [classeId, setClasseId] = useState<string>("");

  const periodes = getPeriodes(cycleCourant);
  const [periode, setPeriode] = useState<string>(periodes[0] ?? "T1");

  const { data: etab } = useQuery({
    queryKey: ["etablissement"],
    queryFn: async () => {
      const r = await fetch("/api/etablissement");
      const j = await r.json();
      return j.data;
    },
  });

  const { data: classes } = useQuery({
    queryKey: ["classes-stat", anneeCouranteId, cycleCourant],
    queryFn: async () => {
      const r = await fetch(
        `/api/classes?anneeId=${anneeCouranteId ?? ""}&cycle=${cycleCourant}`
      );
      const j = await r.json();
      return j.data as Classe[];
    },
    enabled: !!anneeCouranteId,
  });

  const currentClasseId = classeId || classes?.[0]?.id || "";
  if (classes && classes.length > 0 && !classeId) {
    setClasseId(classes[0].id);
  }

  const { data: stats, isLoading } = useQuery({
    queryKey: ["stat-classe", currentClasseId, periode, anneeCouranteId],
    queryFn: async () => {
      const r = await fetch(
        `/api/statistiques/classe?classeId=${currentClasseId}&periode=${periode}&anneeId=${anneeCouranteId}`
      );
      const j = await r.json();
      return j.data as StatData;
    },
    enabled: !!currentClasseId && !!anneeCouranteId,
  });

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Statistiques"
        description="Statistiques de réussite par classe"
        backTo="dashboard"
        actions={
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" />
            Imprimer
          </Button>
        }
      />

      {/* Filtres */}
      <Card className="mb-4 no-print">
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Classe
            </label>
            <Select value={currentClasseId} onValueChange={setClasseId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                {classes?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {periodes.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Période
              </label>
              <Select value={periode} onValueChange={setPeriode}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periodes.map((p) => (
                    <SelectItem key={p} value={p}>
                      {PERIODE_LIBELLE[p] ?? p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {isLoading && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Chargement...
        </p>
      )}

      {stats && (
        <div className="print-area">
          {/* Document A4 portrait */}
          <div className="bg-white border border-border rounded-lg p-6 sm:p-8 space-y-4">
            {/* En-tête officielle */}
            <div className="flex items-start justify-between gap-4 border-b-2 border-primary pb-3">
              <DrapeauSenegal className="h-16 w-16 flex-shrink-0" />
              <div className="text-center flex-1">
                <p className="font-bold text-sm">République du Sénégal</p>
                <p className="italic text-xs text-muted-foreground">
                  Un peuple — Un but — Une foi
                </p>
                <p className="font-semibold text-sm mt-1">
                  Ministère de l&apos;Éducation Nationale
                </p>
              </div>
              <MinistereLogo className="h-16 w-16 flex-shrink-0" />
            </div>

            {/* IA / IEF / École */}
            <div className="text-center text-sm space-y-0.5">
              <p>Inspection d&apos;Académie de <span className="font-semibold">{etab?.ia ?? "..."}</span></p>
              <p>Inspection de l&apos;Éducation et de la Formation de <span className="font-semibold">{etab?.ief ?? "..."}</span></p>
              <p className="font-semibold">École {stats.cycle === "ELEMENTAIRE" ? "Élémentaire" : stats.cycle.charAt(0) + stats.cycle.slice(1).toLowerCase()} — {etab?.nom ?? "..."}</p>
            </div>

            {/* Classe / Année */}
            <div className="flex items-center justify-between text-sm border-y border-border py-2">
              <p>Classe: <span className="font-bold">{stats.classe}</span></p>
              <p>Année scolaire: <span className="font-bold">{stats.anneeLibelle}</span></p>
            </div>

            {/* Titre */}
            <h2 className="text-center font-bold text-base underline">
              Statistiques de réussite
            </h2>

            {/* Tableau stats globales */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-primary text-primary-foreground">
                    <th className="border border-border px-3 py-2 text-left"></th>
                    <th className="border border-border px-3 py-2 text-center">Garçons</th>
                    <th className="border border-border px-3 py-2 text-center">Filles</th>
                    <th className="border border-border px-3 py-2 text-center">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <StatRow label="Effectif" data={stats.effectif} />
                  <StatRow label="Ont composé" data={stats.ontCompose} />
                  <StatRow label="Ont eu la moyenne" data={stats.ontEuLaMoyenne} />
                  <tr className="bg-primary/10 font-bold">
                    <td className="border border-border px-3 py-2">Taux de réussite</td>
                    <td className="border border-border px-3 py-2 text-center">
                      {stats.ontCompose.garcons > 0
                        ? Math.round((stats.ontEuLaMoyenne.garcons / stats.ontCompose.garcons) * 100)
                        : 0}%
                    </td>
                    <td className="border border-border px-3 py-2 text-center">
                      {stats.ontCompose.filles > 0
                        ? Math.round((stats.ontEuLaMoyenne.filles / stats.ontCompose.filles) * 100)
                        : 0}%
                    </td>
                    <td className="border border-border px-3 py-2 text-center font-bold">
                      {stats.tauxReussite}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Stats par domaine */}
            <h3 className="font-bold text-sm mt-4">
              Statistiques de réussite par domaine
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-muted">
                    <th className="border border-border px-2 py-1 text-left">Activités</th>
                    <th className="border border-border px-2 py-1 text-center">Garçons</th>
                    <th className="border border-border px-2 py-1 text-center">Filles</th>
                    <th className="border border-border px-2 py-1 text-center">Total</th>
                    <th className="border border-border px-2 py-1 text-center">Ayant moy.</th>
                    <th className="border border-border px-2 py-1 text-center">Moyenne</th>
                    <th className="border border-border px-2 py-1 text-center">Pourcentage</th>
                  </tr>
                </thead>
                <tbody>
                  {groupStatsByDomaine(stats.statsDomaine).map(
                    (group, gi) => (
                      <>
                        <tr key={`d-${gi}`} className="bg-primary/5 font-semibold">
                          <td className="border border-border px-2 py-1" colSpan={7}>
                            {DOMAINE_LIBELLE[group.domaine] ?? group.domaine}
                          </td>
                        </tr>
                        {group.activites.map((a) => (
                          <tr key={a.matiereId}>
                            <td className="border border-border px-2 py-1 pl-4">{a.activite}</td>
                            <td className="border border-border px-2 py-1 text-center">{a.garcons}</td>
                            <td className="border border-border px-2 py-1 text-center">{a.filles}</td>
                            <td className="border border-border px-2 py-1 text-center">{a.total}</td>
                            <td className="border border-border px-2 py-1 text-center">{a.ayantMoyenne}</td>
                            <td className="border border-border px-2 py-1 text-center">{a.moyenne.toFixed(2)}</td>
                            <td className="border border-border px-2 py-1 text-center">{a.pourcentage}%</td>
                          </tr>
                        ))}
                      </>
                    )
                  )}
                  {stats.statsDomaine.length === 0 && (
                    <tr>
                      <td colSpan={7} className="border border-border px-2 py-4 text-center text-muted-foreground">
                        Aucune matière évaluée pour cette classe.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-3 gap-4 pt-8 text-sm">
              <div className="text-center">
                <p>Le Maître(esse)</p>
              </div>
              <div className="text-center">
                <p>Le Directeur</p>
              </div>
              <div className="text-center">
                <p>L&apos;Inspecteur</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatRow({
  label,
  data,
}: {
  label: string;
  data: { garcons: number; filles: number; total: number };
}) {
  return (
    <tr>
      <td className="border border-border px-3 py-2 font-medium">{label}</td>
      <td className="border border-border px-3 py-2 text-center">{data.garcons}</td>
      <td className="border border-border px-2 py-2 text-center">{data.filles}</td>
      <td className="border border-border px-3 py-2 text-center font-bold">{data.total}</td>
    </tr>
  );
}

function groupStatsByDomaine(
  stats: StatData["statsDomaine"]
): { domaine: string; activites: StatData["statsDomaine"] }[] {
  const map = new Map<string, StatData["statsDomaine"]>();
  stats.forEach((s) => {
    const arr = map.get(s.domaine) ?? [];
    arr.push(s);
    map.set(s.domaine, arr);
  });
  return Array.from(map.entries()).map(([domaine, activites]) => ({
    domaine,
    activites,
  }));
}
