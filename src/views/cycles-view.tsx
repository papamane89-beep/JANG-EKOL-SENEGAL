"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layers } from "lucide-react";
import { toast } from "sonner";
import { CYCLES } from "@/lib/data";

export function CyclesView() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["cycles"],
    queryFn: async () => {
      const r = await fetch("/api/cycles");
      const j = await r.json();
      return j.data as { id: string; nom: string; ordre: number }[];
    },
  });

  const activateMutation = useMutation({
    mutationFn: async (nom: string) => {
      // Les cycles sont prédéfinis, juste confirmation
      return nom;
    },
    onSuccess: (nom) => {
      toast.success(`Cycle ${nom} sélectionné`);
      qc.invalidateQueries({ queryKey: ["cycles"] });
    },
  });

  const cyclesInfo: Record<string, { desc: string; evalMode: string }> = {
    MATERNEL: {
      desc: "Éducation préscolaire (Petite, Moyenne et Grande Section)",
      evalMode: "Pas d'évaluation",
    },
    ELEMENTAIRE: {
      desc: "Enseignement élémentaire par étapes (CI/CP, CE1/CE2, CM1/CM2)",
      evalMode: "Évaluation par trimestre (T1, T2, T3)",
    },
    MOYEN: {
      desc: "Enseignement moyen (6e, 5e, 4e, 3e)",
      evalMode: "Évaluation par semestre (S1, S2) avec coefficients",
    },
    SECONDAIRE: {
      desc: "Enseignement secondaire (Seconde, Première, Terminale)",
      evalMode: "Évaluation par semestre (S1, S2) avec coefficients",
    },
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Cycles"
        description="Gestion des cycles d'enseignement"
        backTo="dashboard"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(data ?? CYCLES.map((c) => ({ id: c.nom, nom: c.nom, ordre: c.ordre })))
          .sort((a, b) => a.ordre - b.ordre)
          .map((c) => {
            const info = cyclesInfo[c.nom] ?? { desc: "", evalMode: "" };
            return (
              <Card key={c.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                        <Layers className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          {c.nom.charAt(0) + c.nom.slice(1).toLowerCase()}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Ordre {c.ordre}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      Actif
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-foreground/80">{info.desc}</p>
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <span className="text-xs font-medium text-muted-foreground">
                      Mode d&apos;évaluation :
                    </span>
                    <Badge variant="secondary" className="text-[11px]">
                      {info.evalMode}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Chargement...
        </p>
      )}

      <Card className="mt-6 bg-muted/40">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">Note :</strong> Les cycles sont
            prédéfinis selon le système éducatif sénégalais. Chaque cycle
            possède son propre mode d&apos;évaluation et de notation. La
            maternelle n&apos;a pas d&apos;évaluation. À l&apos;élémentaire,
            l&apos;évaluation se fait par trimestre sur 10. Au moyen et
            secondaire, par semestre avec coefficients par matière.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
