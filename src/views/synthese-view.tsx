"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { EvaluationsSubTabs } from "@/components/evaluations-subtabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Printer, ClipboardList } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { getPeriodesActives, PERIODE_LIBELLE } from "@/lib/data";

interface Classe {
  id: string;
  nom: string;
  cycle: { nom: string };
}

interface Matiere {
  id: string;
  domaine: string;
  activite: string;
  sur: number;
}

interface SyntheseRow {
  eleveId: string;
  prenom: string;
  nom: string;
  sexe: string;
  notes: Record<string, { valeur: number; sur: number; appreciation: string }>;
  total: number;
  surTotal: number;
  moyenne: number;
  rang: number;
  effectif: number;
}

interface SyntheseData {
  matieres: Matiere[];
  eleves: SyntheseRow[];
  effectif: number;
  surMaxTotal: number;
  cycleNom: string;
  etape: number;
}

const DOMAINE_LIBELLE: Record<string, string> = {
  LC: "LC",
  MATHS: "Maths",
  ESVS: "E.S.V.S",
  EPSA: "E.P.S.A",
  ED_RELIG: "Ed.Relig",
  ANGLAIS: "Anglais",
};

export function SyntheseView() {
  const anneeCouranteId = useAppStore((s) => s.anneeCouranteId);
  const cycleCourant = useAppStore((s) => s.cycleCourant);
  const periodesActives = useAppStore((s) => s.periodesActives);
  const [classeId, setClasseId] = useState("");
  const periodes = getPeriodesActives(cycleCourant, periodesActives);
  const [periode, setPeriode] = useState<string>(periodes[0] ?? "T1");

  const { data: classes } = useQuery({
    queryKey: ["classes-syn", anneeCouranteId, cycleCourant],
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

  const { data, isLoading } = useQuery({
    queryKey: ["synthese-periode", currentClasseId, periode, anneeCouranteId],
    queryFn: async () => {
      const r = await fetch(
        `/api/notes/synthese?classeId=${currentClasseId}&periode=${periode}&anneeId=${anneeCouranteId}`
      );
      const j = await r.json();
      return j.data as SyntheseData;
    },
    enabled: !!currentClasseId && !!anneeCouranteId,
  });

  // Grouper les matières par domaine
  const matieresByDomaine = new Map<string, Matiere[]>();
  data?.matieres.forEach((m) => {
    const arr = matieresByDomaine.get(m.domaine) ?? [];
    arr.push(m);
    matieresByDomaine.set(m.domaine, arr);
  });

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Synthèse"
        description="Tableau de synthèse par classe (domaines, activités, total, moyenne, rang, appréciations)"
        backTo="evaluations"
        actions={
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" />
            Imprimer
          </Button>
        }
      />

      <EvaluationsSubTabs active="synthese" />

      <Card className="mb-4 no-print">
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Classe</label>
            <Select value={currentClasseId} onValueChange={setClasseId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                {classes?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Période</label>
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
          {data && (
            <div className="ml-auto flex items-center gap-2">
              <Badge variant="outline">Effectif: {data.effectif}</Badge>
              <Badge variant="outline">Sur total: {data.surMaxTotal}</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {cycleCourant === "MATERNEL" && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Pas d&apos;évaluation à la maternelle.
          </CardContent>
        </Card>
      )}

      {cycleCourant !== "MATERNEL" && data && data.matieres.length > 0 && (
        <Card className="print-area">
          <CardContent className="p-0">
            <div className="overflow-x-auto custom-scroll">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow className="bg-primary text-primary-foreground">
                    <TableHead className="text-primary-foreground sticky left-0 bg-primary z-20 min-w-[180px]">
                      Élève
                    </TableHead>
                    {Array.from(matieresByDomaine.entries()).map(
                      ([domaine, mats]) =>
                        mats.map((m, idx) => (
                          <TableHead
                            key={m.id}
                            className="text-center min-w-[70px]"
                          >
                            {idx === 0 && (
                              <div className="font-semibold">
                                {DOMAINE_LIBELLE[domaine] ?? domaine}
                              </div>
                            )}
                            <div className="font-normal text-[10px] text-primary-foreground/80">
                              {m.activite}
                            </div>
                            <div className="text-[10px] text-primary-foreground/60">
                              /{m.sur}
                            </div>
                          </TableHead>
                        ))
                    )}
                    <TableHead className="text-center bg-primary/90">Total</TableHead>
                    <TableHead className="text-center bg-primary/90">Moy/10</TableHead>
                    <TableHead className="text-center bg-primary/90">Rang</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.eleves.map((row) => (
                    <TableRow key={row.eleveId} className="hover:bg-muted/30">
                      <TableCell className="sticky left-0 bg-card z-20 font-medium">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`h-2 w-2 rounded-full ${row.sexe === "M" ? "bg-blue-500" : "bg-rose-400"}`}
                          />
                          <span className="truncate">
                            {row.prenom} {row.nom}
                          </span>
                        </div>
                      </TableCell>
                      {data.matieres.map((m) => {
                        const n = row.notes[m.id];
                        return (
                          <TableCell
                            key={m.id}
                            className="text-center"
                          >
                            {n ? (
                              <span className={n.valeur >= (n.sur / 2) ? "font-semibold text-foreground" : "text-destructive font-semibold"}>
                                {n.valeur}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center font-bold bg-primary/5">
                        {row.total}
                      </TableCell>
                      <TableCell className="text-center font-bold text-primary bg-primary/5">
                        {row.moyenne.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center bg-primary/5">
                        <Badge variant="secondary">
                          {row.rang}e/{row.effectif}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.eleves.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={data.matieres.length + 3}
                        className="text-center text-muted-foreground py-8"
                      >
                        Aucun élève dans cette classe.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section appréciations par élève */}
      {data && data.eleves.length > 0 && (
        <Card className="mt-4">
          <CardContent className="p-0">
            <div className="px-4 py-2 bg-muted/50 border-b">
              <p className="text-sm font-semibold flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" />
                Appréciations
              </p>
            </div>
            <div className="overflow-x-auto custom-scroll">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="min-w-[180px]">Élève</TableHead>
                    {data.matieres.map((m) => (
                      <TableHead key={m.id} className="text-center min-w-[100px]">
                        {m.activite}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.eleves.map((row) => (
                    <TableRow key={row.eleveId}>
                      <TableCell className="font-medium">
                        {row.prenom} {row.nom}
                      </TableCell>
                      {data.matieres.map((m) => (
                        <TableCell key={m.id} className="text-center italic text-muted-foreground">
                          {row.notes[m.id]?.appreciation || "—"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {cycleCourant !== "MATERNEL" && data?.matieres.length === 0 && !isLoading && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Aucune matière active pour ce cycle. Configurez les matières dans
            le module Matières.
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Chargement de la synthèse...
        </p>
      )}
    </div>
  );
}
