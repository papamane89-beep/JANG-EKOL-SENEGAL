"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { EvaluationsSubTabs } from "@/components/evaluations-subtabs";
import { PrintOfficialHeader } from "@/components/print-official-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Plus, Trash2, Save, Printer, FlaskConical, UserPlus, Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import { ESSAI_SUBJECTS, ESSAI_BAREMES } from "@/lib/data";

interface Classe {
  id: string;
  nom: string;
  cycle: { nom: string };
}

interface Essai {
  id: string;
  libelle: string;
  classeId: string;
  anneeScolaireId: string;
  date: string;
  numero: number;
  classe: { id: string; nom: string };
  _count: { eleves: number };
}

interface EssaiDetail {
  id: string;
  libelle: string;
  date: string;
  numero: number;
  classe: { id: string; nom: string; cycle: { nom: string } };
  anneeScolaire: { id: string; libelle: string };
  eleves: {
    eleve: { id: string; prenom: string; nom: string; sexe: string };
  }[];
  notes: {
    eleveId: string;
    domaine: string;
    activite: string;
    valeur: number;
    sur: number;
  }[];
}

// Toutes les activités à afficher en colonnes (plates)
const ALL_ACTIVITIES = ESSAI_SUBJECTS.flatMap((s) =>
  s.activites.map((a) => ({ domaine: s.domaine, activite: a, libelle: s.libelle, optionnel: (s as any).optionnel }))
);

// Sur total maximum (somme des barèmes, sans l'arabe optionnel)
const SUR_MAX_BASE = ALL_ACTIVITIES
  .filter((a) => !a.optionnel)
  .reduce((s, a) => s + (ESSAI_BAREMES[a.domaine]?.[a.activite] ?? 10), 0);

export function EssaisView() {
  const anneeCouranteId = useAppStore((s) => s.anneeCouranteId);
  const qc = useQueryClient();

  const [selectedClasseId, setSelectedClasseId] = useState<string>("");
  const [selectedEssaiId, setSelectedEssaiId] = useState<string>("");
  const [newEssaiOpen, setNewEssaiOpen] = useState(false);
  const [addEleveOpen, setAddEleveOpen] = useState(false);
  const [newEssaiLibelle, setNewEssaiLibelle] = useState("");
  const [newEssaiDate, setNewEssaiDate] = useState(new Date().toISOString().slice(0, 10));
  const [editedNotes, setEditedNotes] = useState<Record<string, string>>({});
  const [sortByMerit, setSortByMerit] = useState(true);

  // Charger les classes CM2 (uniquement)
  const { data: classes } = useQuery({
    queryKey: ["classes-essais", anneeCouranteId],
    queryFn: async () => {
      const r = await fetch(`/api/classes?anneeId=${anneeCouranteId ?? ""}&cycle=ELEMENTAIRE`);
      const j = await r.json();
      // Filtrer uniquement CM2
      return (j.data as Classe[]).filter((c) => c.nom.toUpperCase().includes("CM2"));
    },
    enabled: !!anneeCouranteId,
  });

  // Auto-sélection première classe CM2
  const currentClasseId = selectedClasseId || classes?.[0]?.id || "";
  if (classes && classes.length > 0 && !selectedClasseId) {
    setSelectedClasseId(classes[0].id);
  }

  // Charger les essais de la classe sélectionnée
  const { data: essais } = useQuery({
    queryKey: ["essais", currentClasseId, anneeCouranteId],
    queryFn: async () => {
      const r = await fetch(`/api/essais?classeId=${currentClasseId}&anneeId=${anneeCouranteId}`);
      const j = await r.json();
      return j.data as Essai[];
    },
    enabled: !!currentClasseId && !!anneeCouranteId,
  });

  // Charger le détail de l'essai sélectionné
  const { data: essaiDetail, isLoading } = useQuery({
    queryKey: ["essai-detail", selectedEssaiId],
    queryFn: async () => {
      const r = await fetch(`/api/essais/detail?id=${selectedEssaiId}`);
      const j = await r.json();
      return j.data as EssaiDetail;
    },
    enabled: !!selectedEssaiId,
  });

  // Créer un essai
  const createEssaiMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/essais", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          libelle: newEssaiLibelle || undefined,
          classeId: currentClasseId,
          anneeScolaireId: anneeCouranteId,
          date: newEssaiDate,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      return j;
    },
    onSuccess: (j) => {
      toast.success("Essai créé");
      qc.invalidateQueries({ queryKey: ["essais", currentClasseId, anneeCouranteId] });
      setNewEssaiOpen(false);
      setNewEssaiLibelle("");
      setSelectedEssaiId(j.data.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Supprimer un essai
  const deleteEssaiMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/essais?id=${id}`, { method: "DELETE" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      return j;
    },
    onSuccess: () => {
      toast.success("Essai supprimé");
      qc.invalidateQueries({ queryKey: ["essais", currentClasseId, anneeCouranteId] });
      setSelectedEssaiId("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Sauvegarder les notes
  const saveNotesMutation = useMutation({
    mutationFn: async () => {
      const notes = Object.entries(editedNotes).map(([key, val]) => {
        const [eleveId, domaine, activite] = key.split("__");
        return {
          eleveId,
          domaine,
          activite,
          valeur: parseFloat(val) || 0,
          sur: ESSAI_BAREMES[domaine]?.[activite] ?? 10,
        };
      });
      const r = await fetch("/api/essais/detail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          essaiId: selectedEssaiId,
          action: "saveNotes",
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
      qc.invalidateQueries({ queryKey: ["essai-detail", selectedEssaiId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Ajouter / supprimer un élève
  const eleveActionMutation = useMutation({
    mutationFn: async ({ action, eleveId }: { action: string; eleveId: string }) => {
      const r = await fetch("/api/essais/detail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ essaiId: selectedEssaiId, action, eleveId }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      return j;
    },
    onSuccess: () => {
      toast.success("Modification enregistrée");
      qc.invalidateQueries({ queryKey: ["essai-detail", selectedEssaiId] });
      setAddEleveOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Calculs : total, moyenne, rang, décision pour chaque élève
  const computedRows = useMemo(() => {
    if (!essaiDetail) return [];
    const rows = essaiDetail.eleves.map((ee) => {
      const eleveId = ee.eleve.id;
      const eleveNotes = essaiDetail.notes.filter((n) => n.eleveId === eleveId);
      // Total = somme des valeurs (utiliser barème si note non saisie = 0)
      let total = 0;
      let surTotal = 0;
      const notesMap: Record<string, number> = {};
      for (const act of ALL_ACTIVITIES) {
        const sur = ESSAI_BAREMES[act.domaine]?.[act.activite] ?? 10;
        // L'arabe est optionnel : ne pas compter dans le total si l'élève n'a pas de note
        const isOptionnel = act.optionnel;
        const note = eleveNotes.find(
          (n) => n.domaine === act.domaine && n.activite === act.activite
        );
        if (note) {
          total += note.valeur;
          surTotal += sur;
          notesMap[`${act.domaine}|${act.activite}`] = note.valeur;
        } else if (!isOptionnel) {
          surTotal += sur;
          notesMap[`${act.domaine}|${act.activite}`] = 0;
        }
      }
      const moyenne = surTotal > 0 ? Math.round((total / surTotal) * 10 * 100) / 100 : 0;
      const decision = moyenne >= 5 ? "Admis(e)" : "Echoué(e)";
      return {
        eleveId,
        prenom: ee.eleve.prenom,
        nom: ee.eleve.nom,
        sexe: ee.eleve.sexe,
        notes: notesMap,
        total,
        surTotal,
        moyenne,
        decision,
      };
    });

    // Calcul du rang (tri par moyenne décroissante)
    const sorted = [...rows].sort((a, b) => b.moyenne - a.moyenne);
    const rangMap = new Map<string, number>();
    let rang = 1;
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i].moyenne < sorted[i - 1].moyenne) rang = i + 1;
      rangMap.set(sorted[i].eleveId, rang);
    }
    return rows.map((r) => ({ ...r, rang: rangMap.get(r.eleveId) ?? 0 }));
  }, [essaiDetail]);

  // Tri par mérite ou par ordre alphabétique
  const displayRows = sortByMerit
    ? [...computedRows].sort((a, b) => b.moyenne - a.moyenne)
    : [...computedRows].sort((a, b) => a.nom.localeCompare(b.nom) || a.prenom.localeCompare(b.prenom));

  // Get note value for display/edit
  const getNoteValue = (eleveId: string, domaine: string, activite: string): string => {
    const key = `${eleveId}__${domaine}__${activite}`;
    if (editedNotes[key] !== undefined) return editedNotes[key];
    const row = computedRows.find((r) => r.eleveId === eleveId);
    const val = row?.notes[`${domaine}|${activite}`];
    return val !== undefined ? String(val) : "";
  };

  const handleNoteChange = (eleveId: string, domaine: string, activite: string, value: string) => {
    const key = `${eleveId}__${domaine}__${activite}`;
    setEditedNotes((prev) => ({ ...prev, [key]: value }));
  };

  // Élèves de la classe non encore dans l'essai (pour ajout)
  const { data: classeEleves } = useQuery({
    queryKey: ["classe-eleves-essai", currentClasseId, anneeCouranteId],
    queryFn: async () => {
      const r = await fetch(`/api/eleves?classeId=${currentClasseId}&anneeId=${anneeCouranteId ?? ""}`);
      const j = await r.json();
      return j.data as { id: string; prenom: string; nom: string }[];
    },
    enabled: !!currentClasseId && !!anneeCouranteId && !!addEleveOpen,
  });

  const elevesDisponibles = classeEleves?.filter(
    (e) => !essaiDetail?.eleves.some((ee) => ee.eleve.id === e.id)
  ) ?? [];

  const nbAdmis = computedRows.filter((r) => r.decision === "Admis(e)").length;
  const nbEchoues = computedRows.filter((r) => r.decision === "Echoué(e)").length;

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Essais (CM2)"
        description="Évaluations d'admission pour les classes de CM2"
        backTo="evaluations"
        actions={
          <div className="flex gap-2">
            {essaiDetail && (
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-1" /> Imprimer
              </Button>
            )}
            <Button size="sm" onClick={() => setNewEssaiOpen(true)} disabled={!currentClasseId}>
              <Plus className="h-4 w-4 mr-1" /> Nouvel essai
            </Button>
          </div>
        }
      />

      <EvaluationsSubTabs active="essais" />

      {/* Filtres */}
      <Card className="mb-4 no-print">
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Classe CM2</label>
            <Select value={currentClasseId} onValueChange={(v) => { setSelectedClasseId(v); setSelectedEssaiId(""); }}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
              <SelectContent>
                {classes?.map((c) => (<SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Essai</label>
            <Select value={selectedEssaiId} onValueChange={setSelectedEssaiId}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Sélectionner un essai" /></SelectTrigger>
              <SelectContent>
                {essais?.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.libelle} {e.date && `(${e.date})`} — {e._count.eleves} él.
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedEssaiId && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddEleveOpen(true)}
              >
                <UserPlus className="h-4 w-4 mr-1" /> Élève
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortByMerit(!sortByMerit)}
              >
                <Trophy className="h-4 w-4 mr-1" />
                {sortByMerit ? "Tri par mérite" : "Tri alphabétique"}
              </Button>
              <Button
                size="sm"
                onClick={() => saveNotesMutation.mutate()}
                disabled={saveNotesMutation.isPending || Object.keys(editedNotes).length === 0}
              >
                <Save className="h-4 w-4 mr-1" /> Enregistrer
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm("Supprimer cet essai et toutes ses notes ?"))
                    deleteEssaiMutation.mutate(selectedEssaiId);
                }}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Message si pas de classe CM2 */}
      {classes && classes.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <FlaskConical className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Aucune classe de CM2 trouvée</p>
            <p className="text-xs mt-1">Les essais concernent uniquement les classes de CM2.</p>
          </CardContent>
        </Card>
      )}

      {/* Message si pas d'essai sélectionné */}
      {currentClasseId && !selectedEssaiId && classes && classes.length > 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <FlaskConical className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Aucun essai sélectionné</p>
            <p className="text-xs mt-1">Créez un nouvel essai ou sélectionnez un essai existant.</p>
          </CardContent>
        </Card>
      )}

      {/* Tableau de l'essai */}
      {selectedEssaiId && essaiDetail && (
        <Card className="print-area">
          <CardContent className="p-3 sm:p-4">
            {/* En-tête officielle pour l'impression */}
            <PrintOfficialHeader />

            {/* Titre de l'essai */}
            <div className="text-center mb-3">
              <h2 className="text-lg font-bold uppercase">{essaiDetail.libelle}</h2>
              <p className="text-sm text-muted-foreground">
                Classe de {essaiDetail.classe.nom} — Année {essaiDetail.anneeScolaire.libelle}
                {essaiDetail.date && ` — ${essaiDetail.date}`}
              </p>
            </div>

            {/* Statistiques */}
            <div className="flex justify-center gap-3 mb-3 no-print">
              <Badge className="bg-emerald-600 hover:bg-emerald-600">
                Admis : {nbAdmis}
              </Badge>
              <Badge className="bg-rose-500 hover:bg-rose-500">
                Échoués : {nbEchoues}
              </Badge>
              <Badge variant="outline">
                Effectif : {computedRows.length}
              </Badge>
            </div>

            {/* Tableau des notes */}
            <div className="overflow-x-auto custom-scroll">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow className="bg-primary text-primary-foreground">
                    <TableHead className="text-primary-foreground sticky left-0 bg-primary z-20 min-w-[40px] text-center">Rg</TableHead>
                    <TableHead className="text-primary-foreground sticky left-10 bg-primary z-20 min-w-[160px]">Élève</TableHead>
                    {ESSAI_SUBJECTS.map((s) =>
                      s.activites.map((a, ai) => (
                        <TableHead key={`${s.domaine}-${a}`} className="text-center min-w-[70px]">
                          {ai === 0 && (
                            <div className="font-bold">{s.libelle}</div>
                          )}
                          <div className="font-normal text-[10px] text-primary-foreground/80">{a}</div>
                          <div className="text-[10px] text-primary-foreground/60">
                            /{ESSAI_BAREMES[s.domaine]?.[a] ?? 10}
                          </div>
                        </TableHead>
                      ))
                    )}
                    <TableHead className="text-center bg-primary/90">Total</TableHead>
                    <TableHead className="text-center bg-primary/90">Moy/10</TableHead>
                    <TableHead className="text-center bg-primary/90">Décision</TableHead>
                    <TableHead className="text-center no-print"> Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayRows.map((row) => (
                    <TableRow key={row.eleveId} className={sortByMerit && row.rang <= 3 ? "bg-amber-50" : ""}>
                      <TableCell className="sticky left-0 bg-card z-20 text-center font-bold">
                        {sortByMerit ? (
                          <span className={row.rang === 1 ? "text-amber-600" : row.rang <= 3 ? "text-amber-500" : ""}>
                            {row.rang}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="sticky left-10 bg-card z-20 font-medium">
                        <div className="flex items-center gap-1.5">
                          <span className={`h-2 w-2 rounded-full ${row.sexe === "M" ? "bg-blue-500" : "bg-rose-400"}`} />
                          <span className="truncate">{row.prenom} {row.nom}</span>
                        </div>
                      </TableCell>
                      {ESSAI_SUBJECTS.map((s) =>
                        s.activites.map((a) => {
                          const sur = ESSAI_BAREMES[s.domaine]?.[a] ?? 10;
                          const isOptionnel = (s as any).optionnel;
                          return (
                            <TableCell key={`${s.domaine}-${a}`} className="p-1">
                              <Input
                                type="number"
                                value={getNoteValue(row.eleveId, s.domaine, a)}
                                onChange={(e) => handleNoteChange(row.eleveId, s.domaine, a, e.target.value)}
                                className="h-8 w-[55px] mx-auto text-center text-xs"
                                step="0.5"
                                max={sur}
                                placeholder={isOptionnel ? "opt" : `/${sur}`}
                              />
                            </TableCell>
                          );
                        })
                      )}
                      <TableCell className="text-center font-bold bg-primary/5">
                        {row.total}
                      </TableCell>
                      <TableCell className="text-center font-bold text-primary bg-primary/5">
                        {row.moyenne.toFixed(2)}
                      </TableCell>
                      <TableCell
                        className={`text-center font-bold ${
                          row.decision === "Admis(e)"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        <Badge
                          className={
                            row.decision === "Admis(e)"
                              ? "bg-emerald-600 hover:bg-emerald-600 text-white"
                              : "bg-rose-600 hover:bg-rose-600 text-white"
                          }
                        >
                          {row.decision}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center no-print">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            if (confirm(`Retirer ${row.prenom} ${row.nom} de cet essai ?`))
                              eleveActionMutation.mutate({ action: "removeEleve", eleveId: row.eleveId });
                          }}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {displayRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={ALL_ACTIVITIES.length + 5} className="text-center text-muted-foreground py-8">
                        Aucun élève dans cet essai. Cliquez sur « Élève » pour en ajouter.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Légende */}
            <div className="mt-3 text-[10px] text-muted-foreground no-print">
              <p>
                <strong>Barèmes :</strong> LC (Ress./40, Comp./60) · Maths (Ress./40, Comp./60) ·
                ESVS (DDM/40, EDD/40) · EPSA (Arts.Plast/10) · Arabe (/10, optionnel).
                Décision : « Admis(e) » si moyenne ≥ 5/10, « Echoué(e) » si &lt; 5.
              </p>
            </div>

            {/* Signatures pour l'impression */}
            <div className="grid grid-cols-2 gap-4 mt-8 text-xs print:block">
              <div className="text-center">
                <p className="font-medium">Le Directeur</p>
                <div className="h-12" />
              </div>
              <div className="text-center">
                <p className="font-medium">Le Maître(esse)</p>
                <div className="h-12" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog nouvel essai */}
      <Dialog open={newEssaiOpen} onOpenChange={setNewEssaiOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvel essai — CM2</DialogTitle>
            <DialogDescription>
              Créez une session d&apos;essai pour la classe sélectionnée.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Libellé</Label>
              <Input
                value={newEssaiLibelle}
                onChange={(e) => setNewEssaiLibelle(e.target.value)}
                placeholder="Ex: Essai 1 (laisser vide pour auto)"
              />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={newEssaiDate}
                onChange={(e) => setNewEssaiDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewEssaiOpen(false)}>Annuler</Button>
            <Button onClick={() => createEssaiMutation.mutate()} disabled={createEssaiMutation.isPending}>
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog ajouter un élève */}
      <Dialog open={addEleveOpen} onOpenChange={setAddEleveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un élève à l&apos;essai</DialogTitle>
            <DialogDescription>
              Sélectionnez les élèves de la classe à ajouter à cet essai.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto custom-scroll">
            {elevesDisponibles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Tous les élèves de la classe sont déjà dans cet essai.
              </p>
            ) : (
              elevesDisponibles.map((e) => (
                <div key={e.id} className="flex items-center justify-between rounded-lg border p-2">
                  <span className="text-sm">{e.prenom} {e.nom}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => eleveActionMutation.mutate({ action: "addEleve", eleveId: e.id })}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Ajouter
                  </Button>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddEleveOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
