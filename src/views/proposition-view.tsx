"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Save, ArrowRightCircle, Printer } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";

interface Classe {
  id: string;
  nom: string;
  cycle: { nom: string };
}

interface SyntheseRow {
  eleveId: string;
  prenom: string;
  nom: string;
  sexe: string;
  moyT1: number;
  moyT2: number;
  moyT3: number;
  moyS1: number;
  moyS2: number;
  moyAnnuelle: number;
  rangAnnuel: number;
  decision: string;
  effectif: number;
}

export function PropositionView() {
  const anneeCouranteId = useAppStore((s) => s.anneeCouranteId);
  const cycleCourant = useAppStore((s) => s.cycleCourant);
  const qc = useQueryClient();
  const [classeId, setClasseId] = useState("");
  const [decisions, setDecisions] = useState<Record<string, string>>({});

  const { data: classes } = useQuery({
    queryKey: ["classes-prop", anneeCouranteId, cycleCourant],
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
    queryKey: ["synthese-prop", currentClasseId, anneeCouranteId],
    queryFn: async () => {
      const r = await fetch(
        `/api/synthese?classeId=${currentClasseId}&anneeId=${anneeCouranteId}`
      );
      const j = await r.json();
      return j.data as {
        periodes: string[];
        eleves: SyntheseRow[];
        effectif: number;
        cycleNom: string;
      };
    },
    enabled: !!currentClasseId && !!anneeCouranteId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates = Object.entries(decisions).map(([eleveId, decision]) =>
        fetch("/api/proposition", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eleveId,
            classeId: currentClasseId,
            anneeScolaireId: anneeCouranteId,
            decision,
          }),
        })
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      toast.success("Décisions de passage enregistrées");
      setDecisions({});
      qc.invalidateQueries({ queryKey: ["synthese-prop", currentClasseId, anneeCouranteId] });
      qc.invalidateQueries({ queryKey: ["synthese-annuelle", currentClasseId, anneeCouranteId] });
    },
    onError: () => toast.error("Erreur lors de l'enregistrement"),
  });

  const isElementaire = cycleCourant === "ELEMENTAIRE";
  const getDecision = (row: SyntheseRow) =>
    decisions[row.eleveId] ?? row.decision;

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Proposition de passage"
        description="Décisions de passage en classe supérieure (modifiable par le directeur)"
        backTo="evaluations"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-1" />
              Imprimer
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || Object.keys(decisions).length === 0}
            >
              <Save className="h-4 w-4 mr-1" />
              Enregistrer
            </Button>
          </div>
        }
      />

      <EvaluationsSubTabs active="proposition" />

      <Card className="mb-4 no-print">
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Classe
            </label>
            <Select value={currentClasseId} onValueChange={setClasseId}>
              <SelectTrigger className="w-[200px]">
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
          {data && (
            <Badge variant="outline" className="ml-auto">
              Effectif: {data.effectif}
            </Badge>
          )}
        </CardContent>
      </Card>

      <Card className="mb-4 bg-amber-50 border-amber-200 no-print">
        <CardContent className="p-3 flex items-center gap-2 text-xs text-amber-800">
          <ArrowRightCircle className="h-4 w-4 flex-shrink-0" />
          <span>
            Règle automatique : moyenne annuelle ≥ 4,5/10 → passage en classe
            supérieure. Le directeur peut modifier chaque décision via le
            menu déroulant.
          </span>
        </CardContent>
      </Card>

      {isLoading && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Chargement...
        </p>
      )}

      {data && (
        <Card className="print-area">
          <CardContent className="p-0">
            <div className="overflow-x-auto custom-scroll">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow className="bg-primary text-primary-foreground">
                    <TableHead className="text-primary-foreground sticky left-0 bg-primary z-20 min-w-[180px]">
                      Élève
                    </TableHead>
                    {isElementaire ? (
                      <>
                        <TableHead className="text-primary-foreground text-center">Moy T1</TableHead>
                        <TableHead className="text-primary-foreground text-center">Moy T2</TableHead>
                        <TableHead className="text-primary-foreground text-center">Moy T3</TableHead>
                      </>
                    ) : (
                      <>
                        <TableHead className="text-primary-foreground text-center">Moy S1</TableHead>
                        <TableHead className="text-primary-foreground text-center">Moy S2</TableHead>
                      </>
                    )}
                    <TableHead className="text-primary-foreground text-center bg-primary/90">
                      Moy. Annuelle
                    </TableHead>
                    <TableHead className="text-primary-foreground text-center">Rang</TableHead>
                    <TableHead className="text-primary-foreground text-center min-w-[200px]">
                      Décision
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.eleves.map((row) => {
                    const dec = getDecision(row);
                    return (
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
                        {isElementaire ? (
                          <>
                            <TableCell className="text-center">{row.moyT1 ? row.moyT1.toFixed(2) : "—"}</TableCell>
                            <TableCell className="text-center">{row.moyT2 ? row.moyT2.toFixed(2) : "—"}</TableCell>
                            <TableCell className="text-center">{row.moyT3 ? row.moyT3.toFixed(2) : "—"}</TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell className="text-center">{row.moyS1 ? row.moyS1.toFixed(2) : "—"}</TableCell>
                            <TableCell className="text-center">{row.moyS2 ? row.moyS2.toFixed(2) : "—"}</TableCell>
                          </>
                        )}
                        <TableCell className="text-center font-bold text-primary bg-primary/5">
                          {row.moyAnnuelle ? row.moyAnnuelle.toFixed(2) : "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          {row.rangAnnuel > 0 ? `${row.rangAnnuel}e` : "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Select
                            value={dec}
                            onValueChange={(v) =>
                              setDecisions({ ...decisions, [row.eleveId]: v })
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PASSAGE">
                                Passe en classe supérieure
                              </SelectItem>
                              <SelectItem value="REDOUBLAGE">
                                Autorisé à redoubler
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {data.eleves.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={isElementaire ? 7 : 6}
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
    </div>
  );
}
