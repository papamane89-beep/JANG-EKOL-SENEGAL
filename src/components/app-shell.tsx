"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";
import { useAppStore } from "@/lib/store";
import { DashboardView } from "@/views/dashboard-view";
import { AvantProposView } from "@/views/avant-propos-view";
import { ParametresView } from "@/views/parametres-view";
import { CyclesView } from "@/views/cycles-view";
import { AnneesView } from "@/views/annees-view";
import { ClassesView } from "@/views/classes-view";
import { ElevesView } from "@/views/eleves-view";
import { EnseignantsView } from "@/views/enseignants-view";
import { MatieresView } from "@/views/matieres-view";
import { EvaluationsView } from "@/views/evaluations-view";
import { EssaisView } from "@/views/essais-view";
import { SyntheseView } from "@/views/synthese-view";
import { PropositionView } from "@/views/proposition-view";
import { BulletinsView } from "@/views/bulletins-view";
import { AbsencesView } from "@/views/absences-view";
import { StatistiquesView } from "@/views/statistiques-view";
import { DocumentsView } from "@/views/documents-view";
import { PaiementsView } from "@/views/paiements-view";
import { UtilisateursView } from "@/views/utilisateurs-view";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

export function AppShell() {
  const view = useAppStore((s) => s.view);
  const anneeCouranteId = useAppStore((s) => s.anneeCouranteId);
  const setAnneeCouranteId = useAppStore((s) => s.setAnneeCouranteId);
  const setPeriodesActives = useAppStore((s) => s.setPeriodesActives);
  const user = useAppStore((s) => s.user)!;

  // Charger les années au démarrage
  const { data: anneesList } = useQuery({
    queryKey: ["annees"],
    queryFn: async () => {
      const r = await fetch("/api/annees");
      const j = await r.json();
      return j.data as {
        id: string;
        libelle: string;
        active: boolean;
        periodesActives: string;
      }[];
    },
  });

  // Sélection auto de l'année active
  useEffect(() => {
    if (anneesList && anneesList.length > 0 && !anneeCouranteId) {
      const active = anneesList.find((a) => a.active) ?? anneesList[0];
      setAnneeCouranteId(active.id);
    }
  }, [anneesList, anneeCouranteId, setAnneeCouranteId]);

  // Mettre à jour les périodes actives quand l'année courante change
  useEffect(() => {
    if (anneesList && anneeCouranteId) {
      const annee = anneesList.find((a) => a.id === anneeCouranteId);
      if (annee) {
        const p = (annee.periodesActives || "")
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean);
        setPeriodesActives(p.length > 0 ? p : ["T1", "T2", "T3"]);
      }
    }
  }, [anneesList, anneeCouranteId, setPeriodesActives]);

  // Type école (pour masquer/afficher paiements)
  const { data: etab } = useQuery({
    queryKey: ["etablissement"],
    queryFn: async () => {
      const r = await fetch("/api/etablissement");
      const j = await r.json();
      return j.data as { typeEcole: string } | null;
    },
  });

  const isAdmin = user.role === "ADMIN";

  const views: Record<string, React.ReactNode> = {
    "avant-propos": <AvantProposView />,
    dashboard: <DashboardView />,
    parametres: isAdmin ? <ParametresView /> : <DashboardView />,
    cycles: <CyclesView />,
    annees: <AnneesView />,
    classes: <ClassesView />,
    eleves: <ElevesView />,
    enseignants: <EnseignantsView />,
    matieres: <MatieresView />,
    evaluations: <EvaluationsView />,
    essais: <EssaisView />,
    synthese: <SyntheseView />,
    proposition: <PropositionView />,
    bulletins: <BulletinsView />,
    absences: <AbsencesView />,
    statistiques: <StatistiquesView />,
    documents: <DocumentsView />,
    paiements: etab?.typeEcole === "PRIVEE" ? <PaiementsView /> : <DashboardView />,
    utilisateurs: isAdmin ? <UtilisateursView /> : <DashboardView />,
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <AppTopbar />
        <main className="flex-1 overflow-y-auto custom-scroll view-fade" key={view}>
          {views[view] ?? <DashboardView />}
        </main>
      </div>
    </div>
  );
}
