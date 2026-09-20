"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { EvaluationsSubTabs } from "@/components/evaluations-subtabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Save, FileText, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import { getPeriodesActives, PERIODE_LIBELLE } from "@/lib/data";

interface Classe {
  id: string;
  nom: string;
  etape: number;
  cycle: { nom: string };
}

interface Matiere {
  id: string;
  domaine: string;
  activite: string;
  sur: number;
  coefficient: number;
  optionnel: boolean;
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
  cycleNom: string;
}

const DOMAINE_LIBELLE: Record<string, string> = {
  LC: "LC",
  MATHS: "Maths",
  ESVS: "E.S.V.S",
  EPSA: "E.P.S.A",
  ED_RELIG: "Ed.Relig",
  ANGLAIS: "Anglais",
};

export function EvaluationsView() {
  const anneeCouranteId = useAppStore((s) => s.anneeCouranteId);
  const cycleCourant = useAppStore((s) => s.cycleCourant);
  const periodesActives = useAppStore((s) => s.periodesActives);
  const setView = useAppStore((s) => s.setView);
  const qc = useQueryClient();

  const [classeId, setClasseId] = useState<string>("");
  const [periode, setPeriode] = useState<string>(
    getPeriodesActives(cycleCourant, periodesActives)[0] ?? "T1"
  );
  const [editedNotes, setEditedNotes] = useState<
    Record<string, { valeur: string; sur: number; appreciation: string }>
  >({});

  const { data: classes } = useQuery({
    queryKey: ["classes-eval", anneeCouranteId, cycleCourant],
    queryFn: async () => {
      const r = await fetch(
        `/api/classes?anneeId=${anneeCouranteId ?? ""}&cycle=${cycleCourant}`
      );
      const j = await r.json();
      return j.data as Classe[];
    },
    enabled: !!anneeCouranteId,
  });

  // Auto-sélection première classe
  const currentClasseId = classeId || classes?.[0]?.id || "";
  if (classes && classes.length > 0 && !classeId) {
    setClasseId(classes[0].id);
  }

  const { data: synthese, isLoading } = useQuery({
    queryKey: ["synthese", currentClasseId, periode, anneeCouranteId],
    queryFn: async () => {
      const r = await fetch(
        `/api/notes/synthese?classeId=${currentClasseId}&periode=${periode}&anneeId=${anneeCouranteId}`
      );
      const j = await r.json();
      return j.data as SyntheseData;
    },
    enabled: !!currentClasseId && !!anneeCouranteId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const notes = Object.entries(editedNotes).map(([key, val]) => {
        const [eleveId, matiereId] = key.split("__");
        return {
          eleveId,
          matiereId,
          valeur: parseFloat(val.valeur) || 0,
          sur: val.sur,
          appreciation: val.appreciation,
        };
      });
      const r = await fetch("/api/notes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anneeScolaireId: anneeCouranteId,
          classeId: currentClasseId,
          periode,
          notes,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      return j;
    },
    onSuccess: () => {
      toast.success("Notes enregistrées");
      setEditedNotes({});
      qc.invalidateQueries({
        queryKey: ["synthese", currentClasseId, periode, anneeCouranteId],
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const periodes = getPeriodesActives(cycleCourant, periodesActives);

  const handleNoteChange = (
    eleveId: string,
    matiereId: string,
    sur: number,
    field: "valeur" | "appreciation",
    value: string
  ) => {
    const key = `${eleveId}__${matiereId}`;
    setEditedNotes((prev) => ({
      ...prev,
      [key]: {
        valeur: field === "valeur" ? value : prev[key]?.valeur ?? "",
        sur,
        appreciation: field === "appreciation" ? value : prev[key]?.appreciation ?? "",
      },
    }));
  };

  const getNoteValue = (
    eleveId: string,
    matiereId: string
  ): { valeur: string; sur: number; appreciation: string } => {
    const key = `${eleveId}__${matiereId}`;
    if (editedNotes[key]) return editedNotes[key];
    const row = synthese?.eleves.find((e) => e.eleveId === eleveId);
    const n = row?.notes[matiereId];
    // Barème réel de la matière (depuis ParametreNotation par étape)
    const matiere = synthese?.matieres.find((m) => m.id === matiereId);
    const surReel = matiere?.sur ?? 10;
    return {
      valeur: n ? String(n.valeur) : "",
      sur: n?.sur ?? surReel,
      appreciation: n?.appreciation ?? "",
    };
  };

  // Grouper les matières par domaine
  const matieresByDomaine = new Map<string, Matiere[]>();
  synthese?.matieres.forEach((m) => {
    const arr = matieresByDomaine.get(m.domaine) ?? [];
    arr.push(m);
    matieresByDomaine.set(m.domaine, arr);
  });

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Évaluations"
        description="Saisie des notes et synthèse par classe"
        backTo="evaluations"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setView("bulletins")}
            >
              <FileText className="h-4 w-4 mr-1" />
              Bulletins
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setView("statistiques")}
            >
              <BarChart3 className="h-4 w-4 mr-1" />
              Statistiques
            </Button>
          </div>
        }
      />

      <EvaluationsSubTabs active="evaluations" />


      {/* Filtres */}
      <Card className="mb-4">
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
          <div className="ml-auto flex items-center gap-2">
            {synthese && (
              <Badge variant="outline">
                Effectif: {synthese.effectif} élèves
              </Badge>
            )}
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || Object.keys(editedNotes).length === 0}
            >
              <Save className="h-4 w-4 mr-1" />
              Enregistrer
            </Button>
          </div>
        </CardContent>
      </Card>

      {cycleCourant === "MATERNEL" && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Pas d&apos;évaluation à la maternelle.
          </CardContent>
        </Card>
      )}

      {/* Tableau de synthèse */}
      {cycleCourant !== "MATERNEL" && synthese && synthese.matieres.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto custom-scroll">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="sticky left-0 bg-muted/50 z-20 min-w-[180px]">
                      Élève
                    </TableHead>
                    {Array.from(matieresByDomaine.entries()).map(
                      ([domaine, mats]) =>
                        mats.map((m, idx) => (
                          <TableHead
                            key={m.id}
                            className="text-center min-w-[80px]"
                          >
                            {idx === 0 && (
                              <div className="font-semibold text-primary">
                                {DOMAINE_LIBELLE[domaine] ?? domaine}
                              </div>
                            )}
                            <div className="font-normal text-[10px] text-muted-foreground">
                              {m.activite} /{m.sur}
                            </div>
                          </TableHead>
                        ))
                    )}
                    <TableHead className="text-center bg-primary/5">
                      Total
                    </TableHead>
                    <TableHead className="text-center bg-primary/5">
                      Moy/10
                    </TableHead>
                    <TableHead className="text-center bg-primary/5">
                      Rang
                    </TableHead>
                    <TableHead className="min-w-[140px]">
                      Appréciation
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {synthese.eleves.map((row) => (
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
                      {synthese.matieres.map((m) => {
                        const n = getNoteValue(row.eleveId, m.id);
                        return (
                          <TableCell key={m.id} className="p-1">
                            <Input
                              type="number"
                              value={n.valeur}
                              onChange={(e) =>
                                handleNoteChange(
                                  row.eleveId,
                                  m.id,
                                  m.sur,
                                  "valeur",
                                  e.target.value
                                )
                              }
                              className="h-8 w-[60px] mx-auto text-center text-xs"
                              step="0.25"
                              max={m.sur}
                              placeholder={`/${m.sur}`}
                            />
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center font-semibold bg-primary/5">
                        {row.total}
                      </TableCell>
                      <TableCell className="text-center font-bold bg-primary/5 text-primary">
                        {row.moyenne.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center bg-primary/5">
                        <Badge variant="secondary">
                          {row.rang}e / {row.effectif}
                        </Badge>
                      </TableCell>
                      <TableCell className="p-1">
                        <Input
                          value={
                            editedNotes[
                              `${row.eleveId}__${synthese.matieres[0]?.id ?? ""}`
                            ]?.appreciation ||
                            row.notes[synthese.matieres[0]?.id]?.appreciation ||
                            ""
                          }
                          onChange={(e) =>
                            handleNoteChange(
                              row.eleveId,
                              synthese.matieres[0]?.id ?? "",
                              synthese.matieres[0]?.sur ?? 10,
                              "appreciation",
                              e.target.value
                            )
                          }
                          placeholder="Appréciation"
                          className="h-8 text-xs"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {synthese.eleves.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={synthese.matieres.length + 4}
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

      {cycleCourant !== "MATERNEL" && synthese?.matieres.length === 0 && !isLoading && (
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
