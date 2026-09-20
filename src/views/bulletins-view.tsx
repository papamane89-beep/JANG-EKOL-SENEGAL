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
import { Printer, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import { getPeriodesActives, PERIODE_LIBELLE } from "@/lib/data";
import {
  DrapeauSenegal,
  MinistereLogo,
  EtabLogo,
} from "@/components/official-logos";

interface Classe {
  id: string;
  nom: string;
  cycle: { nom: string };
}

interface Bulletin {
  id: string;
  eleveId: string;
  eleve: { prenom: string; nom: string; sexe: string; dateNaissance: string };
  classe: {
    nom: string;
    cycle: { nom: string };
    enseignantPrincipal: { prenom: string; nom: string } | null;
  };
  periode: string;
  total: number;
  moyenne: number;
  rang: number;
  effectif: number;
  decision: string;
  moyTrim1: number;
  moyTrim2: number;
  moyTrim3: number;
  moyAnnuelle: number;
  rangAnnuel: number;
}

// Structure fixe du bulletin élémentaire (conforme au modèle officiel)
const BULLETIN_STRUCTURE = [
  { domaine: "LC", libelle: "LC", activites: ["Ressources", "Compétences"] },
  { domaine: "MATHS", libelle: "Maths", activites: ["Ressources", "Compétences"] },
  { domaine: "ESVS", libelle: "E.S.V.S", activites: ["DDM", "EDD"] },
  { domaine: "EPSA", libelle: "E.P.S.A", activites: ["Arts.Plast", "Ed.Music"] },
  { domaine: "ED_RELIG", libelle: "Ed.Relig", activites: ["Arabe"] },
  { domaine: "ANGLAIS", libelle: "Anglais", activites: ["Anglais"] },
] as const;

const PERIODE_COMPOSITION: Record<string, string> = {
  T1: "Composition du premier trimestre",
  T2: "Composition du deuxième trimestre",
  T3: "Composition du troisième trimestre",
  S1: "Composition du premier semestre",
  S2: "Composition du deuxième semestre",
};

export function BulletinsView() {
  const anneeCouranteId = useAppStore((s) => s.anneeCouranteId);
  const cycleCourant = useAppStore((s) => s.cycleCourant);
  const periodesActives = useAppStore((s) => s.periodesActives);
  const qc = useQueryClient();

  const [classeId, setClasseId] = useState("");
  const periodes = getPeriodesActives(cycleCourant, periodesActives);
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
    queryKey: ["classes-bull", anneeCouranteId, cycleCourant],
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

  const { data: bulletins, isLoading } = useQuery({
    queryKey: ["bulletins", currentClasseId, periode, anneeCouranteId],
    queryFn: async () => {
      const r = await fetch(
        `/api/bulletins?classeId=${currentClasseId}&periode=${periode}&anneeId=${anneeCouranteId}`
      );
      const j = await r.json();
      return j.data as Bulletin[];
    },
    enabled: !!currentClasseId && !!anneeCouranteId,
  });

  const { data: synthese } = useQuery({
    queryKey: ["synthese-bull", currentClasseId, periode, anneeCouranteId],
    queryFn: async () => {
      const r = await fetch(
        `/api/notes/synthese?classeId=${currentClasseId}&periode=${periode}&anneeId=${anneeCouranteId}`
      );
      const j = await r.json();
      return j.data as {
        matieres: { id: string; domaine: string; activite: string; sur: number }[];
        eleves: {
          eleveId: string;
          notes: Record<string, { valeur: number; sur: number; appreciation: string }>;
          total: number;
          surTotal: number;
        }[];
      };
    },
    enabled: !!currentClasseId && !!anneeCouranteId,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/bulletins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classeId: currentClasseId,
          periode,
          anneeScolaireId: anneeCouranteId,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      return j;
    },
    onSuccess: () => {
      toast.success("Bulletins générés");
      qc.invalidateQueries({
        queryKey: ["bulletins", currentClasseId, periode, anneeCouranteId],
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pairs: Bulletin[][] = [];
  if (bulletins) {
    for (let i = 0; i < bulletins.length; i += 2) {
      pairs.push(bulletins.slice(i, i + 2));
    }
  }

  // Construction d'une lookup (domaine, activite) → { matiereId, sur }
  const buildLookup = () => {
    const map = new Map<string, { matiereId: string; sur: number }>();
    synthese?.matieres.forEach((m) => {
      map.set(`${m.domaine}|${m.activite}`, { matiereId: m.id, sur: m.sur });
    });
    return map;
  };

  const getEleveRow = (eleveId: string) =>
    synthese?.eleves.find((e) => e.eleveId === eleveId);

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Bulletins"
        description="Génération des bulletins de notes par classe (format A4 paysage, 2 élèves par page)"
        backTo="evaluations"
      />

      <EvaluationsSubTabs active="bulletins" />

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
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending || !currentClasseId}
            >
              <Sparkles className="h-4 w-4 mr-1" />
              Générer
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-1" />
              Imprimer
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <p className="text-sm text-muted-foreground text-center py-8">Chargement...</p>
      )}

      {!isLoading && bulletins?.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Aucun bulletin généré. Cliquez sur « Générer » après avoir saisi les
            notes dans le module Évaluations.
          </CardContent>
        </Card>
      )}

      {/* Bulletins A4 paysage - 2 par page */}
      <div className="print-area space-y-3">
        {pairs.map((pair, idx) => (
          <div
            key={idx}
            className="grid grid-cols-1 lg:grid-cols-2 gap-2 bg-white p-2 rounded-lg border border-border"
            style={{ pageBreakAfter: "always" }}
          >
            {pair.map((b) => (
              <BulletinA4
                key={b.id}
                bulletin={b}
                etab={etab}
                lookup={buildLookup()}
                eleveRow={getEleveRow(b.eleveId)}
              />
            ))}
            {pair.length === 1 && <div className="hidden lg:block" />}
          </div>
        ))}
      </div>
    </div>
  );
}

function BulletinA4({
  bulletin,
  etab,
  lookup,
  eleveRow,
}: {
  bulletin: Bulletin;
  etab: any;
  lookup: Map<string, { matiereId: string; sur: number }>;
  eleveRow?: {
    notes: Record<string, { valeur: number; sur: number; appreciation: string }>;
    total: number;
    surTotal: number;
  };
}) {
  const composition = PERIODE_COMPOSITION[bulletin.periode] ?? bulletin.periode;
  const isTrim3 = bulletin.periode === "T3";
  const maitresse = bulletin.classe.enseignantPrincipal
    ? `${bulletin.classe.enseignantPrincipal.prenom} ${bulletin.classe.enseignantPrincipal.nom}`
    : ".....................";
  const effectif = bulletin.effectif;
  const notes = eleveRow?.notes ?? {};
  const total = eleveRow?.total ?? bulletin.total;
  const surTotal = eleveRow?.surTotal ?? 0;

  // Récupérer note + sur pour un (domaine, activite)
  const getCell = (domaine: string, activite: string) => {
    const entry = lookup.get(`${domaine}|${activite}`);
    if (!entry) return { note: null, sur: "—" };
    const n = notes[entry.matiereId];
    return {
      note: n ? n.valeur : null,
      sur: entry.sur,
      appreciation: n?.appreciation ?? "",
    };
  };

  const moyTrim1 = bulletin.moyTrim1 || 0;
  const moyTrim2 = bulletin.moyTrim2 || 0;
  const moyTrim3 = bulletin.moyTrim3 || bulletin.moyenne || 0;
  const moyAnnuelle = bulletin.moyAnnuelle || bulletin.moyenne || 0;

  // Nombre total d'activités (pour le rowSpan de la colonne Appréciations fusionnée)
  const totalActivities = BULLETIN_STRUCTURE.reduce(
    (s, d) => s + d.activites.length,
    0
  );

  // Appréciation générale automatique basée sur la moyenne /10
  const generalAppreciation = (() => {
    if (bulletin.moyenne <= 0) return "";
    if (bulletin.moyenne >= 8) return "Très bien — Travail excellent, continuez ainsi.";
    if (bulletin.moyenne >= 6) return "Bien — Bon trimestre, des efforts à maintenir.";
    if (bulletin.moyenne >= 4.5) return "Assez bien — Peut mieux faire, fournis plus d'efforts.";
    return "Insuffisant — Doit fournir davantage d'efforts.";
  })();

  return (
    <div className="border-2 border-foreground/60 text-[9px] leading-tight flex flex-col font-sans">
      {/* En-tête officielle avec logos drapeau + ministère */}
      <div className="flex items-center gap-2 border-b-2 border-foreground/60 py-1 px-2">
        <DrapeauSenegal className="h-9 w-9 flex-shrink-0" />
        <div className="flex-1 text-center">
          <p className="font-bold text-[11px]">République du Sénégal</p>
          <p className="italic text-[9px] text-primary">Un peuple — Un but — Une foi</p>
          <p className="font-bold text-[10px]">Ministère de l&apos;Éducation Nationale</p>
        </div>
        <MinistereLogo className="h-9 w-9 flex-shrink-0" />
      </div>

      {/* IA / IEF */}
      <div className="text-center text-[9px] py-0.5 border-b border-foreground/30">
        <p>Inspection d&apos;Académie de <span className="font-bold">{etab?.ia ?? "..."}</span></p>
        <p>Inspection de l&apos;Éducation et de la Formation de <span className="font-bold">{etab?.ief ?? "..."}</span></p>
      </div>

      {/* École / Classe */}
      <div className="grid grid-cols-2 text-[9px] border-b border-foreground/30">
        <div className="px-1.5 py-0.5 border-r border-foreground/20">
          <span>École: </span>
          <span className="font-bold">{etab?.nom ?? "..."}</span>
        </div>
        <div className="px-1.5 py-0.5">
          <span>Classe: </span>
          <span className="font-bold">{bulletin.classe.nom}</span>
        </div>
      </div>

      {/* Maître / Effectif */}
      <div className="grid grid-cols-2 text-[9px] border-b border-foreground/30">
        <div className="px-1.5 py-0.5 border-r border-foreground/20">
          <span>Maître(esse): </span>
          <span className="font-bold">{maitresse}</span>
        </div>
        <div className="px-1.5 py-0.5">
          <span>Effectif: </span>
          <span className="font-bold">{effectif}</span>
        </div>
      </div>

      {/* Élève */}
      <div className="px-1.5 py-0.5 text-[9px] border-b border-foreground/30">
        <span>Prénom(s) et Nom: </span>
        <span className="font-bold text-[10px]">{bulletin.eleve.prenom} {bulletin.eleve.nom}</span>
      </div>

      {/* Composition + BULLETIN DE NOTES */}
      <div className="text-center py-1 border-b border-foreground/30 bg-primary/5">
        <p className="font-bold text-[10px]">{composition}</p>
        <p className="font-bold text-[12px] tracking-widest">BULLETIN DE NOTES</p>
      </div>

      {/* Tableau notes */}
      <table className="w-full text-[9px] border-collapse">
        <thead>
          <tr className="bg-foreground/10">
            <th className="border border-foreground/50 px-1 py-0.5 text-center font-bold w-[16%]">Activités</th>
            <th className="border border-foreground/50 px-1 py-0.5 text-center font-bold w-[22%]">Contrôles</th>
            <th className="border border-foreground/50 px-1 py-0.5 text-center font-bold w-[10%]">Notes</th>
            <th className="border border-foreground/50 px-1 py-0.5 text-center font-bold w-[7%]">Sur</th>
            <th className="border border-foreground/50 px-1 py-0.5 text-center font-bold w-[45%]">Appréciations</th>
          </tr>
        </thead>
        <tbody>
          {BULLETIN_STRUCTURE.map((dom, di) =>
            dom.activites.map((act, ai) => {
              const globalIdx = BULLETIN_STRUCTURE
                .slice(0, di)
                .reduce((s, d) => s + d.activites.length, 0) + ai;
              const cell = getCell(dom.domaine, act);
              const isFirstActivity = globalIdx === 0;
              return (
                <tr key={`${dom.domaine}-${act}`} className="h-[14px]">
                  {ai === 0 && (
                    <td
                      rowSpan={dom.activites.length}
                      className="border border-foreground/50 px-1 font-bold text-center align-middle"
                    >
                      {dom.libelle}
                    </td>
                  )}
                  <td className="border border-foreground/50 px-1.5 text-center">{act}</td>
                  <td className="border border-foreground/50 px-1.5 text-center font-bold">
                    {cell.note !== null ? cell.note : ""}
                  </td>
                  <td className="border border-foreground/50 px-1.5 text-center">{cell.sur}</td>
                  {isFirstActivity && (
                    <td
                      rowSpan={totalActivities}
                      className="border border-foreground/50 px-1.5 align-top italic text-left"
                    >
                      {generalAppreciation}
                    </td>
                  )}
                </tr>
              );
            })
          )}
          {/* Total */}
          <tr className="bg-primary/10 font-bold h-[14px]">
            <td colSpan={2} className="border border-foreground/50 px-1 text-right pr-1.5">Total</td>
            <td className="border border-foreground/50 px-1 text-center">{total}</td>
            <td className="border border-foreground/50 px-1 text-center">{surTotal}</td>
            <td className="px-1 border-l-0 border-r-0 border-transparent"></td>
          </tr>
          {/* Moyenne */}
          <tr className="bg-primary/10 font-bold h-[14px]">
            <td colSpan={2} className="border border-foreground/50 px-1 text-right pr-1.5">Moyenne</td>
            <td className="border border-foreground/50 px-1 text-center">{bulletin.moyenne.toFixed(2)}</td>
            <td className="border border-foreground/50 px-1 text-center">10</td>
            <td className="px-1 border-transparent"></td>
          </tr>
          {/* Rang */}
          <tr className="bg-primary/10 font-bold h-[14px]">
            <td colSpan={2} className="border border-foreground/50 px-1 text-right pr-1.5">Rang</td>
            <td className="border border-foreground/50 px-1 text-center">{bulletin.rang}e</td>
            <td className="border border-foreground/50 px-1 text-center">{effectif} élèves</td>
            <td className="px-1 border-transparent"></td>
          </tr>
        </tbody>
      </table>

      {/* Récapitulatif annuel (T3 uniquement) */}
      {isTrim3 && (
        <div className="border-t-2 border-foreground/60">
          <table className="w-full text-[9px] border-collapse">
            <tbody>
              <tr className="h-[14px]">
                <td className="border border-foreground/40 px-1 py-0.5 font-medium w-[18%]">Moy 1er trim</td>
                <td className="border border-foreground/40 px-1 py-0.5 text-center font-bold w-[15%]">{moyTrim1 ? moyTrim1.toFixed(2) : "—"}</td>
                <td className="border border-foreground/40 px-1 py-0.5 font-medium w-[22%]">Moy. Annuelle</td>
                <td className="border border-foreground/40 px-1 py-0.5 text-center font-bold w-[12%]">{moyAnnuelle ? moyAnnuelle.toFixed(2) : "—"}</td>
                <td className="border border-foreground/40 px-1 py-0.5 text-center w-[8%]">10</td>
                <td className="border border-foreground/40 px-1 py-0.5"></td>
              </tr>
              <tr className="h-[14px]">
                <td className="border border-foreground/40 px-1 py-0.5 font-medium">Moy 2e trim</td>
                <td className="border border-foreground/40 px-1 py-0.5 text-center font-bold">{moyTrim2 ? moyTrim2.toFixed(2) : "—"}</td>
                <td className="border border-foreground/40 px-1 py-0.5 font-medium">Rang Annuel</td>
                <td className="border border-foreground/40 px-1 py-0.5 text-center font-bold">{bulletin.rangAnnuel || bulletin.rang}e</td>
                <td className="border border-foreground/40 px-1 py-0.5 text-center">{effectif} élèves</td>
                <td className="border border-foreground/40 px-1 py-0.5"></td>
              </tr>
              <tr className="h-[14px]">
                <td className="border border-foreground/40 px-1 py-0.5 font-medium">Moy 3e trim</td>
                <td className="border border-foreground/40 px-1 py-0.5 text-center font-bold">{moyTrim3 ? moyTrim3.toFixed(2) : "—"}</td>
                <td className="border border-foreground/40 px-1 py-0.5 font-medium">Décision</td>
                <td colSpan={3} className="border border-foreground/40 px-1 py-0.5 font-bold text-primary">
                  {moyAnnuelle > 0
                    ? bulletin.decision === "PASSAGE"
                      ? "Passe en classe supérieure"
                      : "Autorisé à redoubler"
                    : "—"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Signatures */}
      <div className="grid grid-cols-3 gap-1 text-[9px] mt-1 pt-1 border-t-2 border-foreground/60">
        <div className="text-center">
          <p className="font-medium">Le(La) Maître(esse)</p>
          <div className="h-6" />
        </div>
        <div className="text-center border-x border-foreground/20">
          <p className="font-medium">Le Directeur</p>
          <div className="h-6" />
        </div>
        <div className="text-center">
          <p className="font-medium">Le Parent</p>
          <div className="h-6" />
        </div>
      </div>
    </div>
  );
}
