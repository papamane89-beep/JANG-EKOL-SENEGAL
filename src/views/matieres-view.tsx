"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Save,
  BookOpen,
  Info,
  Layers,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { useAppStore } from "@/lib/store";
import {
  DOMAINES_ACTIVITES,
  BAREMES_PAR_ETAPE,
  ETAPES_ELEMENTAIRE,
} from "@/lib/data";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

// Types ---------------------------------------------------------
interface Parametre {
  id: string | null;
  cycleId: string;
  etape: number;
  domaine: string;
  activite: string;
  sur: number;
  actif: boolean;
  baremeParDefaut: number;
}

interface Matiere {
  id: string;
  cycleId: string;
  domaine: string;
  activite: string;
  libelle: string;
  sur: number;
  coefficient: number;
  actif: boolean;
  optionnel: boolean;
  ordre: number;
  _count?: { notes: number };
}

interface Cycle {
  id: string;
  nom: string;
  ordre: number;
}

// Domaine libellé joli
function domaineLibelle(d: string): string {
  const def: Record<string, string> = {
    LC: "Langue & Communication",
    MATHS: "Mathématiques",
    ESVS: "E.S.V.S",
    EPSA: "E.P.S.A",
    ED_RELIG: "Éducation Religieuse",
    ANGLAIS: "Anglais",
  };
  return def[d] ?? d;
}

// ============================================================
// MatieresView
// ============================================================
export function MatieresView() {
  const cycleCourant = useAppStore((s) => s.cycleCourant);
  const setCycleCourant = useAppStore((s) => s.setCycleCourant);

  // Charger cycles
  const { data: cycles = [] } = useQuery<Cycle[]>({
    queryKey: ["cycles"],
    queryFn: async () => {
      const r = await fetch("/api/cycles");
      const j = await r.json();
      return j.data;
    },
  });

  const cycleActif = useMemo(
    () => cycles.find((c) => c.nom === cycleCourant) ?? null,
    [cycles, cycleCourant]
  );

  // Auto-select first cycle if not in store (when cycles load)
  useEffect(() => {
    if (cycles.length > 0 && !cycleActif) {
      setCycleCourant(cycles[0].nom);
    }
  }, [cycles, cycleActif, setCycleCourant]);

  if (!cycles.length) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <PageHeader title="Matières" backTo="dashboard" />
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            <div className="flex flex-col items-center gap-2">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Chargement des cycles…
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!cycleActif) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <PageHeader title="Matières" backTo="dashboard" />
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            Aucun cycle sélectionné.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Matières"
        description="Configuration des domaines, activités et barèmes de notation"
        backTo="dashboard"
        actions={
          <Select
            value={cycleCourant}
            onValueChange={(v) => setCycleCourant(v)}
          >
            <SelectTrigger className="w-full sm:w-48" aria-label="Choisir un cycle">
              <SelectValue placeholder="Cycle" />
            </SelectTrigger>
            <SelectContent>
              {cycles.map((c) => (
                <SelectItem key={c.id} value={c.nom}>
                  {c.nom.charAt(0) + c.nom.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {cycleCourant === "MATERNEL" && (
        <MaternelMessage />
      )}

      {cycleCourant === "ELEMENTAIRE" && (
        <ElementaireConfig cycleId={cycleActif.id} />
      )}

      {(cycleCourant === "MOYEN" || cycleCourant === "SECONDAIRE") && (
        <MoyenSecondaireConfig cycleId={cycleActif.id} cycleNom={cycleCourant} />
      )}
    </div>
  );
}

// ============================================================
// MATERNEL — pas d'évaluation
// ============================================================
function MaternelMessage() {
  return (
    <Card className="border-primary/30">
      <CardContent className="p-8 sm:p-12 text-center">
        <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Info className="h-7 w-7 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">
          Pas d&apos;évaluation à la maternelle
        </h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
          Le cycle maternel ne comporte pas de système de notation chiffrée.
          L&apos;évaluation se fait par observation et par compétences
          (carnet de suivi).
        </p>
      </CardContent>
    </Card>
  );
}

// ============================================================
// ELEMENTAIRE — barèmes par étape + activate Arabe/Anglais
// ============================================================
function ElementaireConfig({ cycleId }: { cycleId: string }) {
  const qc = useQueryClient();
  // On ne stocke que les SURCHARGES utilisateur — la valeur courante
  // est calculée à la volée en combinant data + overrides.
  // (évite set-state-in-effect)
  const [overrides, setOverrides] = useState<Record<string, number>>({});

  // Charger tous les paramètres (3 étapes)
  const { data, isLoading } = useQuery<Parametre[]>({
    queryKey: ["matieres-parametres", cycleId],
    queryFn: async () => {
      const r = await fetch(`/api/matieres/parametres?cycleId=${cycleId}`);
      const j = await r.json();
      return j.data as Parametre[];
    },
  });

  // Valeur courante d'un paramètre (override utilisateur si présent,
  // sinon valeur base, sinon valeur par défaut).
  const getValue = (p: Parametre) => {
    const key = `${p.etape}|${p.domaine}|${p.activite}`;
    if (key in overrides) return overrides[key];
    return p.sur ?? p.baremeParDefaut ?? 10;
  };

  // Mutation sauvegarde
  const saveMutation = useMutation({
    mutationFn: async (etape: number) => {
      const parametres = (data ?? [])
        .filter((p) => p.etape === etape)
        .map((p) => {
          return {
            etape: p.etape,
            domaine: p.domaine,
            activite: p.activite,
            sur: Number(getValue(p)),
            actif: p.actif,
          };
        });
      const r = await fetch("/api/matieres/parametres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cycleId, parametres }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Erreur");
      return j;
    },
    onSuccess: () => {
      toast.success("Barèmes enregistrés");
      qc.invalidateQueries({ queryKey: ["matieres-parametres", cycleId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Toggle Arabe / Anglais (actif on/off)
  const toggleMutation = useMutation({
    mutationFn: async (params: {
      etape: number;
      domaine: string;
      activite: string;
      actif: boolean;
      sur: number;
    }) => {
      const r = await fetch("/api/matieres/parametres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cycleId,
          parametres: [params],
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Erreur");
      return j;
    },
    onSuccess: (_data, vars) => {
      toast.success(
        `${vars.domaine === "ED_RELIG" ? "Arabe" : "Anglais"} ${
          vars.actif ? "activé" : "désactivé"
        }`
      );
      qc.invalidateQueries({ queryKey: ["matieres-parametres", cycleId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Grouper par étape
  const parEtape = useMemo(() => {
    const map: Record<number, Parametre[]> = { 1: [], 2: [], 3: [] };
    for (const p of data ?? []) {
      if (!map[p.etape]) map[p.etape] = [];
      map[p.etape].push(p);
    }
    return map;
  }, [data]);

  // Arabe / Anglais par étape
  const findOptional = (etape: number, domaine: string, activite: string) =>
    (parEtape[etape] ?? []).find(
      (p) => p.domaine === domaine && p.activite === activite
    );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-muted-foreground">
          <div className="flex items-center justify-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Chargement des paramètres…
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toggles Arabe / Anglais */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            Activations optionnelles (Arabe & Anglais)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2, 3].map((etape) => {
              const arabe = findOptional(etape, "ED_RELIG", "Arabe");
              const anglais = findOptional(etape, "ANGLAIS", "Anglais");
              const etapeLib = ETAPES_ELEMENTAIRE.find((e) => e.etape === etape);
              return (
                <div
                  key={etape}
                  className="rounded-lg border border-border p-3"
                >
                  <p className="text-xs font-semibold text-muted-foreground mb-2">
                    {etapeLib?.libelle ?? `Étape ${etape}`}
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="cursor-pointer font-normal">
                        Arabe (Ed.Relig)
                      </Label>
                      <Switch
                        checked={arabe?.actif ?? false}
                        onCheckedChange={(checked) =>
                          arabe &&
                          toggleMutation.mutate({
                            etape,
                            domaine: "ED_RELIG",
                            activite: "Arabe",
                            actif: checked,
                            sur: arabe.sur,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="cursor-pointer font-normal">
                        Anglais
                      </Label>
                      <Switch
                        checked={anglais?.actif ?? false}
                        onCheckedChange={(checked) =>
                          anglais &&
                          toggleMutation.mutate({
                            etape,
                            domaine: "ANGLAIS",
                            activite: "Anglais",
                            actif: checked,
                            sur: anglais.sur,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tableaux par étape */}
      <Tabs defaultValue="1">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          {[1, 2, 3].map((e) => (
            <TabsTrigger key={e} value={String(e)}>
              {`Étape ${e}`}
            </TabsTrigger>
          ))}
        </TabsList>

        {[1, 2, 3].map((etape) => (
          <TabsContent key={etape} value={String(etape)} className="mt-4">
            <EtapeTable
              etape={etape}
              parametres={parEtape[etape] ?? []}
              overrides={overrides}
              onValueChange={(key, val) =>
                setOverrides((prev) => ({ ...prev, [key]: val }))
              }
              getValue={getValue}
              onSave={() => saveMutation.mutate(etape)}
              saving={saveMutation.isPending}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function EtapeTable({
  etape,
  parametres,
  overrides,
  onValueChange,
  getValue,
  onSave,
  saving,
}: {
  etape: number;
  parametres: Parametre[];
  overrides: Record<string, number>;
  onValueChange: (key: string, val: number) => void;
  getValue: (p: Parametre) => number;
  onSave: () => void;
  saving: boolean;
}) {
  const etapeLib = ETAPES_ELEMENTAIRE.find((e) => e.etape === etape);
  const baremesDef = BAREMES_PAR_ETAPE[etape] ?? {};

  // Grouper par domaine dans l'ordre défini dans DOMAINES_ACTIVITES
  const lignes: Array<{
    domaine: string;
    activite: string;
    param?: Parametre;
    defaut: number;
  }> = [];

  for (const [domaine, def] of Object.entries(DOMAINES_ACTIVITES)) {
    const activites = (def as any).activites as string[];
    for (const activite of activites) {
      const p = parametres.find(
        (x) => x.domaine === domaine && x.activite === activite
      );
      const defaut = baremesDef[domaine]?.[activite] ?? 10;
      lignes.push({ domaine, activite, param: p, defaut });
    }
  }

  // Total
  const total = lignes.reduce((sum, l) => {
    if (!l.param) return sum + l.defaut;
    return sum + Number(getValue(l.param));
  }, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">{etapeLib?.libelle}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Classes : {etapeLib?.classes.join(" — ")}
            </p>
          </div>
          <Button
            onClick={onSave}
            disabled={saving}
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90 w-fit"
          >
            <Save className="h-4 w-4" />
            {saving ? "Sauvegarde…" : "Enregistrer les barèmes"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[55vh] overflow-auto custom-scroll">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="min-w-[150px]">Domaine</TableHead>
                <TableHead className="min-w-[150px]">Activité</TableHead>
                <TableHead className="text-center min-w-[90px]">
                  Barème par défaut
                </TableHead>
                <TableHead className="text-center min-w-[110px]">
                  Sur (modifiable)
                </TableHead>
                <TableHead className="text-center min-w-[80px]">
                  État
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lignes.map((l) => {
                const key = `${etape}|${l.domaine}|${l.activite}`;
                const val = l.param ? getValue(l.param) : l.defaut;
                const isOptional =
                  l.domaine === "ED_RELIG" || l.domaine === "ANGLAIS";
                const actif = l.param?.actif ?? true;
                return (
                  <TableRow key={key}>
                    <TableCell>
                      <span className="font-medium">
                        {domaineLibelle(l.domaine)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{l.activite}</Badge>
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {l.defaut}
                    </TableCell>
                    <TableCell className="text-center">
                      <Input
                        type="number"
                        value={val}
                        min={0}
                        onChange={(e) =>
                          onValueChange(key, Number(e.target.value))
                        }
                        disabled={isOptional && !actif}
                        className="w-20 mx-auto text-center"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      {isOptional ? (
                        <Badge
                          variant={actif ? "default" : "secondary"}
                          className={
                            actif
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          }
                        >
                          {actif ? "Actif" : "Désactivé"}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Standard</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="bg-primary/5">
                <TableCell colSpan={3} className="text-right font-semibold">
                  Total barème étape
                </TableCell>
                <TableCell className="text-center font-bold text-primary">
                  {total}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// MOYEN / SECONDAIRE — CRUD matières libres
// ============================================================
function MoyenSecondaireConfig({
  cycleId,
  cycleNom,
}: {
  cycleId: string;
  cycleNom: string;
}) {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Matiere | null>(null);
  const [deleting, setDeleting] = useState<Matiere | null>(null);

  const { data, isLoading } = useQuery<Matiere[]>({
    queryKey: ["matieres", cycleId],
    queryFn: async () => {
      const r = await fetch(`/api/matieres?cycleId=${cycleId}`);
      const j = await r.json();
      return j.data as Matiere[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const r = await fetch("/api/matieres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, cycleId }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Erreur");
      return j.data;
    },
    onSuccess: () => {
      toast.success("Matière créée");
      qc.invalidateQueries({ queryKey: ["matieres", cycleId] });
      setCreateOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const r = await fetch("/api/matieres", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Erreur");
      return j.data;
    },
    onSuccess: () => {
      toast.success("Matière mise à jour");
      qc.invalidateQueries({ queryKey: ["matieres", cycleId] });
      setEditing(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/matieres?id=${id}`, { method: "DELETE" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Erreur");
      return j;
    },
    onSuccess: () => {
      toast.success("Matière supprimée");
      qc.invalidateQueries({ queryKey: ["matieres", cycleId] });
      setDeleting(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleActifMutation = useMutation({
    mutationFn: async (m: Matiere) => {
      const r = await fetch("/api/matieres", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: m.id, actif: !m.actif }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Erreur");
      return j.data;
    },
    onSuccess: () => {
      toast.success("Statut mis à jour");
      qc.invalidateQueries({ queryKey: ["matieres", cycleId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              Matières — {cycleNom.charAt(0) + cycleNom.slice(1).toLowerCase()}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Créez librement les matières enseignées avec leurs coefficients.
            </p>
          </div>
          <Button
            onClick={() => setCreateOpen(true)}
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90 w-fit"
          >
            <Plus className="h-4 w-4" />
            Nouvelle matière
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[60vh] overflow-auto custom-scroll">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="min-w-[200px]">Libellé</TableHead>
                <TableHead className="min-w-[100px]">Domaine</TableHead>
                <TableHead className="text-center min-w-[90px]">Sur</TableHead>
                <TableHead className="text-center min-w-[100px]">
                  Coefficient
                </TableHead>
                <TableHead className="text-center min-w-[80px]">Notes</TableHead>
                <TableHead className="text-center min-w-[80px]">Actif</TableHead>
                <TableHead className="text-right min-w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Chargement…
                  </TableCell>
                </TableRow>
              ) : !data || data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <BookOpen className="h-8 w-8 text-muted-foreground/50" />
                      Aucune matière. Cliquez sur « Nouvelle matière » pour commencer.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <span className="font-medium">{m.libelle || m.activite}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{m.domaine}</Badge>
                    </TableCell>
                    <TableCell className="text-center">/{m.sur}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">×{m.coefficient}</Badge>
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {m._count?.notes ?? 0}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={m.actif}
                        onCheckedChange={() => toggleActifMutation.mutate(m)}
                        aria-label={`Activer ${m.libelle}`}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditing(m)}
                          className="h-8 w-8 p-0"
                          aria-label="Modifier"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleting(m)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          aria-label="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Create dialog */}
      {createOpen && (
        <MatiereDialog
          mode="create"
          onClose={() => setCreateOpen(false)}
          onSubmit={(p) => createMutation.mutate(p)}
          loading={createMutation.isPending}
        />
      )}

      {/* Edit dialog */}
      {editing && (
        <MatiereDialog
          mode="edit"
          matiere={editing}
          onClose={() => setEditing(null)}
          onSubmit={(p) => updateMutation.mutate({ id: editing.id, ...p })}
          loading={updateMutation.isPending}
        />
      )}

      {/* Delete confirmation */}
      {deleting && (
        <Dialog open onOpenChange={(o) => !o && setDeleting(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Supprimer la matière</DialogTitle>
              <DialogDescription>
                Êtes-vous sûr de vouloir supprimer « {deleting.libelle || deleting.activite} » ?
                {deleting._count?.notes ? (
                  <span className="block mt-2 text-destructive">
                    Attention : {deleting._count.notes} note(s) sont associées
                    à cette matière.
                  </span>
                ) : null}
                Cette action est irréversible.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleting(null)}>
                Annuler
              </Button>
              <Button
                className="bg-destructive text-white hover:bg-destructive/90"
                onClick={() => deleteMutation.mutate(deleting.id)}
              >
                Supprimer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}

function MatiereDialog({
  mode,
  matiere,
  onClose,
  onSubmit,
  loading,
}: {
  mode: "create" | "edit";
  matiere?: Matiere | null;
  onClose: () => void;
  onSubmit: (payload: any) => void;
  loading?: boolean;
}) {
  const [libelle, setLibelle] = useState(matiere?.libelle ?? "");
  const [domaine, setDomaine] = useState(matiere?.domaine ?? "MATIERE");
  const [sur, setSur] = useState(matiere?.sur ?? 20);
  const [coefficient, setCoefficient] = useState(matiere?.coefficient ?? 1);
  const [actif, setActif] = useState(matiere?.actif ?? true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!libelle.trim()) {
      toast.error("Le libellé est obligatoire");
      return;
    }
    onSubmit({
      libelle: libelle.trim(),
      domaine: domaine || "MATIERE",
      activite: libelle.trim().toUpperCase().replace(/\s+/g, "_"),
      sur: Number(sur),
      coefficient: Number(coefficient),
      actif,
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Nouvelle matière" : "Modifier la matière"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Créer une matière avec son coefficient et son barème."
              : "Modifier les informations de la matière."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="libelle">Libellé *</Label>
            <Input
              id="libelle"
              value={libelle}
              onChange={(e) => setLibelle(e.target.value)}
              placeholder="Ex: Mathématiques, S.V.T, Histoire-Géographie…"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sur">Barème (/)</Label>
              <Input
                id="sur"
                type="number"
                value={sur}
                min={1}
                onChange={(e) => setSur(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="coefficient">Coefficient</Label>
              <Input
                id="coefficient"
                type="number"
                value={coefficient}
                min={0.5}
                step={0.5}
                onChange={(e) => setCoefficient(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="m-actif" className="cursor-pointer font-medium">
                Matière active
              </Label>
              <p className="text-xs text-muted-foreground">
                Désactiver pour masquer sans supprimer
              </p>
            </div>
            <Switch id="m-actif" checked={actif} onCheckedChange={setActif} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {loading ? "Enregistrement…" : mode === "create" ? "Créer" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
