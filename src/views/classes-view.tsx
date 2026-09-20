"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { useAppStore } from "@/lib/store";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  School,
  Loader2,
  UserPlus,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { ETAPES_ELEMENTAIRE } from "@/lib/data";

// ============================================================
// Types
// ============================================================
interface Cycle {
  id: string;
  nom: string;
  ordre: number;
}
interface Enseignant {
  id: string;
  prenom: string;
  nom: string;
  telephone: string;
  specialite?: string;
}
interface Classe {
  id: string;
  nom: string;
  cycleId: string;
  cycle: { id: string; nom: string; ordre: number };
  anneeScolaireId: string;
  etape: number;
  enseignantPrincipalId: string | null;
  enseignantPrincipal: { id: string; prenom: string; nom: string } | null;
  capacite: number;
  salle: string;
  _count: { eleves: number };
}

// ============================================================
// Helpers
// ============================================================
function getEtapeForNom(nom: string): number {
  for (const e of ETAPES_ELEMENTAIRE) {
    if (e.classes.includes(nom)) return e.etape;
  }
  return 0;
}
function getEtapeLibelle(etape: number): string {
  const e = ETAPES_ELEMENTAIRE.find((x) => x.etape === etape);
  return e ? e.libelle : "";
}

// ============================================================
// Composant principal
// ============================================================
export function ClassesView() {
  const cycleCourant = useAppStore((s) => s.cycleCourant);
  const anneeCouranteId = useAppStore((s) => s.anneeCouranteId);
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Classe | null>(null);
  const [affecterClasse, setAffecterClasse] = useState<Classe | null>(null);
  const [deleteClasse, setDeleteClasse] = useState<Classe | null>(null);

  // Formulaire
  const [formNom, setFormNom] = useState("");
  const [formCycleId, setFormCycleId] = useState("");
  const [formEtape, setFormEtape] = useState<number>(0);
  const [formEnseignantId, setFormEnseignantId] = useState<string>("");
  const [formCapacite, setFormCapacite] = useState<string>("40");
  const [formSalle, setFormSalle] = useState<string>("");

  // Cycles
  const { data: cycles } = useQuery({
    queryKey: ["cycles"],
    queryFn: async () => {
      const r = await fetch("/api/cycles");
      const j = await r.json();
      return j.data as Cycle[];
    },
  });
  const currentCycle = useMemo(
    () => cycles?.find((c) => c.nom === cycleCourant) ?? null,
    [cycles, cycleCourant]
  );

  // Classes (filtrées par annee + cycle courant)
  const { data: classes, isLoading } = useQuery({
    queryKey: ["classes", anneeCouranteId, cycleCourant],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (anneeCouranteId) params.set("anneeId", anneeCouranteId);
      params.set("cycle", cycleCourant);
      const r = await fetch(`/api/classes?${params.toString()}`);
      const j = await r.json();
      return (j.data ?? []) as Classe[];
    },
    enabled: !!anneeCouranteId,
  });

  // Enseignants (depuis autre module — chargement défensif)
  const { data: enseignants } = useQuery({
    queryKey: ["enseignants"],
    queryFn: async () => {
      const r = await fetch("/api/enseignants");
      if (!r.ok) return [];
      const j = await r.json();
      return (j.data ?? []) as Enseignant[];
    },
    retry: false,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const r = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Erreur lors de la création");
      return j.data;
    },
    onSuccess: () => {
      toast.success("Classe créée avec succès");
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["stats-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["class-distribution"] });
      setDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const r = await fetch("/api/classes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Erreur lors de la modification");
      return j.data;
    },
    onSuccess: () => {
      toast.success("Classe modifiée avec succès");
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      setDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/classes?id=${id}`, { method: "DELETE" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Erreur lors de la suppression");
      return j;
    },
    onSuccess: () => {
      toast.success("Classe supprimée");
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["stats-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["class-distribution"] });
      setDeleteClasse(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const repartirMutation = useMutation({
    mutationFn: async (classeId: string) => {
      const r = await fetch("/api/eleves/repartir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classeId }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Erreur lors de la répartition");
      return j as { count: number; classeNom?: string };
    },
    onSuccess: (res) => {
      toast.success(
        `${res.count} élève${res.count > 1 ? "s" : ""} affecté${
          res.count > 1 ? "s" : ""
        } à la classe ${res.classeNom ?? ""}`.trim()
      );
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["eleves"] });
      queryClient.invalidateQueries({ queryKey: ["stats-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["class-distribution"] });
      setAffecterClasse(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Ouvrir le dialogue de création
  const openCreate = () => {
    setEditing(null);
    setFormNom("");
    setFormCycleId(currentCycle?.id ?? "");
    setFormEtape(0);
    setFormEnseignantId("");
    setFormCapacite("40");
    setFormSalle("");
    setDialogOpen(true);
  };

  // Ouvrir le dialogue d'édition
  const openEdit = (c: Classe) => {
    setEditing(c);
    setFormNom(c.nom);
    setFormCycleId(c.cycleId);
    setFormEtape(c.etape);
    setFormEnseignantId(c.enseignantPrincipalId ?? "");
    setFormCapacite(String(c.capacite));
    setFormSalle(c.salle);
    setDialogOpen(true);
  };

  // Soumettre le formulaire
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNom.trim()) {
      toast.error("Le nom de la classe est requis");
      return;
    }
    if (!formCycleId || !anneeCouranteId) {
      toast.error("Cycle et année scolaire requis");
      return;
    }

    const payload: Record<string, unknown> = {
      nom: formNom.trim(),
      cycleId: formCycleId,
      anneeScolaireId: anneeCouranteId,
      etape: formEtape,
      enseignantPrincipalId: formEnseignantId || null,
      capacite: Number(formCapacite) || 40,
      salle: formSalle.trim(),
    };

    if (editing) {
      updateMutation.mutate({ id: editing.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  // Grouper les classes par étape (pour ELEMENTAIRE)
  const isElementaire = cycleCourant === "ELEMENTAIRE";
  const grouped = useMemo(() => {
    if (!classes) return [];
    if (!isElementaire) {
      return [{ etape: 0, libelle: "", items: classes }];
    }
    return ETAPES_ELEMENTAIRE.map((e) => ({
      etape: e.etape,
      libelle: e.libelle,
      items: classes.filter((c) => c.etape === e.etape),
    })).filter((g) => g.items.length > 0);
  }, [classes, isElementaire]);

  // Stats résumé
  const totalClasses = classes?.length ?? 0;
  const totalEleves = classes?.reduce((s, c) => s + c._count.eleves, 0) ?? 0;
  const totalCapacite = classes?.reduce((s, c) => s + c.capacite, 0) ?? 0;

  const cycleLabel = (
    cycleCourant.charAt(0) + cycleCourant.slice(1).toLowerCase()
  );

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Classes"
        description={`Gestion des classes — Cycle ${cycleLabel}`}
        backTo="dashboard"
        actions={
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nouvelle Classe</span>
            <span className="sm:hidden">Classe</span>
          </Button>
        }
      />

      {/* Cartes résumé */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-5">
        <Card>
          <CardContent className="p-3 sm:p-4 flex items-center gap-3">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <School className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs text-muted-foreground font-medium truncate">
                Classes
              </p>
              <p className="text-xl sm:text-2xl font-bold text-foreground">
                {totalClasses}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 flex items-center gap-3">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs text-muted-foreground font-medium truncate">
                Effectif
              </p>
              <p className="text-xl sm:text-2xl font-bold text-foreground">
                {totalEleves}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 flex items-center gap-3">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
              <Layers className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs text-muted-foreground font-medium truncate">
                Capacité
              </p>
              <p className="text-xl sm:text-2xl font-bold text-foreground">
                {totalCapacite}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tableau principal */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between gap-2">
            <span>Liste des classes</span>
            <Badge variant="outline" className="font-normal">
              {cycleLabel}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
            </div>
          ) : !classes || classes.length === 0 ? (
            <div className="text-center py-12">
              <School className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Aucune classe pour ce cycle et cette année.
              </p>
              <Button
                onClick={openCreate}
                variant="outline"
                className="mt-4 gap-2"
              >
                <Plus className="h-4 w-4" />
                Créer la première classe
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scroll">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[140px]">Nom</TableHead>
                    {isElementaire && (
                      <TableHead className="min-w-[140px]">Étape</TableHead>
                    )}
                    <TableHead className="min-w-[180px]">
                      Enseignant Principal
                    </TableHead>
                    <TableHead className="min-w-[100px]">Effectif</TableHead>
                    <TableHead className="min-w-[100px]">Capacité</TableHead>
                    <TableHead className="min-w-[100px]">Salle</TableHead>
                    <TableHead className="text-right min-w-[180px]">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grouped.map((group) => (
                    <GroupRows
                      key={group.etape || "all"}
                      group={group}
                      isElementaire={isElementaire}
                      onEdit={openEdit}
                      onDelete={(c) => setDeleteClasse(c)}
                      onAffecter={(c) => setAffecterClasse(c)}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogue Création / Édition */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto custom-scroll">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Modifier la classe" : "Nouvelle classe"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? `Mettre à jour les informations de la classe « ${editing.nom} »`
                : "Renseignez les informations de la nouvelle classe."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nom */}
            <div className="space-y-1.5">
              <Label htmlFor="nom">Nom de la classe *</Label>
              <Input
                id="nom"
                value={formNom}
                onChange={(e) => {
                  const v = e.target.value;
                  setFormNom(v);
                  // Auto-détecter l'étape si le nom correspond à un preset
                  const eta = getEtapeForNom(v.toUpperCase().split(" ")[0]);
                  if (eta > 0) setFormEtape(eta);
                }}
                placeholder={
                  isElementaire
                    ? "Ex: CM1, CM1 A, CI, CP B..."
                    : "Ex: 6ème A, Terminale S1..."
                }
              />
              {isElementaire && !editing && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {ETAPES_ELEMENTAIRE.flatMap((e) => e.classes).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setFormNom(c);
                        setFormEtape(getEtapeForNom(c));
                      }}
                      className="px-2 py-0.5 text-[11px] rounded-md border border-border bg-muted/50 hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Cycle (select) */}
            <div className="space-y-1.5">
              <Label htmlFor="cycle">Cycle *</Label>
              <Select
                value={formCycleId}
                onValueChange={setFormCycleId}
                disabled={!!editing}
              >
                <SelectTrigger id="cycle" className="w-full">
                  <SelectValue placeholder="Sélectionner un cycle" />
                </SelectTrigger>
                <SelectContent>
                  {cycles?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nom.charAt(0) + c.nom.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Étape (uniquement pour ELEMENTAIRE) */}
            {isElementaire && (
              <div className="space-y-1.5">
                <Label htmlFor="etape">Étape</Label>
                <Select
                  value={String(formEtape)}
                  onValueChange={(v) => setFormEtape(Number(v))}
                >
                  <SelectTrigger id="etape" className="w-full">
                    <SelectValue placeholder="Étape" />
                  </SelectTrigger>
                  <SelectContent>
                    {ETAPES_ELEMENTAIRE.map((e) => (
                      <SelectItem key={e.etape} value={String(e.etape)}>
                        {e.libelle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Enseignant principal */}
            <div className="space-y-1.5">
              <Label htmlFor="enseignant">Enseignant Principal</Label>
              <Select
                value={formEnseignantId}
                onValueChange={(v) =>
                  setFormEnseignantId(v === "__none__" ? "" : v)
                }
              >
                <SelectTrigger id="enseignant" className="w-full">
                  <SelectValue placeholder="Aucun" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">
                    <em>Aucun enseignant principal</em>
                  </SelectItem>
                  {enseignants && enseignants.length > 0 ? (
                    enseignants.map((ens) => (
                      <SelectItem key={ens.id} value={ens.id}>
                        {ens.prenom} {ens.nom}
                        {ens.specialite ? ` (${ens.specialite})` : ""}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="__none__" disabled>
                      Aucun enseignant enregistré
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {enseignants && enseignants.length === 0 && (
                <p className="text-[11px] text-muted-foreground">
                  Aucun enseignant enregistré — créez-en depuis le module
                  Enseignants.
                </p>
              )}
            </div>

            {/* Capacité + Salle */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="capacite">Capacité</Label>
                <Input
                  id="capacite"
                  type="number"
                  min={1}
                  value={formCapacite}
                  onChange={(e) => setFormCapacite(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="salle">Salle</Label>
                <Input
                  id="salle"
                  value={formSalle}
                  onChange={(e) => setFormSalle(e.target.value)}
                  placeholder="Ex: B12"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="gap-2"
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {editing ? "Mettre à jour" : "Créer la classe"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialogue Affecter élèves */}
      <Dialog
        open={!!affecterClasse}
        onOpenChange={(o) => !o && setAffecterClasse(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Affecter des élèves
            </DialogTitle>
            <DialogDescription>
              Vous allez affecter tous les élèves <strong>INSCRITS</strong> de
              l&apos;année courante à la classe{" "}
              <Badge className="ml-1">{affecterClasse?.nom}</Badge>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-md border bg-muted/40 p-3">
              <span className="text-muted-foreground">
                Effectif actuel de la classe
              </span>
              <Badge variant="secondary">
                {affecterClasse?._count.eleves ?? 0}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-md border bg-muted/40 p-3">
              <span className="text-muted-foreground">Capacité</span>
              <Badge variant="outline">{affecterClasse?.capacite}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Cette action remplace l&apos;affectation existante : tous les
              élèves INSCRITS seront rattachés à cette classe et leur statut
              passera à <strong>AFFECTÉ</strong>.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAffecterClasse(null)}
            >
              Annuler
            </Button>
            <Button
              disabled={repartirMutation.isPending}
              onClick={() =>
                affecterClasse && repartirMutation.mutate(affecterClasse.id)
              }
              className="gap-2"
            >
              {repartirMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              Affecter tous les inscrits
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogue suppression */}
      <AlertDialog
        open={!!deleteClasse}
        onOpenChange={(o) => !o && setDeleteClasse(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la classe</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer la classe{" "}
              <strong>{deleteClasse?.nom}</strong> ? Les élèves affectés
              repasseront en statut INSCRIT (sans classe). Cette action est
              irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={() =>
                deleteClasse && deleteMutation.mutate(deleteClasse.id)
              }
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-1" />
              )}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================
// Sous-composant : groupe de lignes (avec en-tête d'étape si ELEMENTAIRE)
// ============================================================
function GroupRows({
  group,
  isElementaire,
  onEdit,
  onDelete,
  onAffecter,
}: {
  group: { etape: number; libelle: string; items: Classe[] };
  isElementaire: boolean;
  onEdit: (c: Classe) => void;
  onDelete: (c: Classe) => void;
  onAffecter: (c: Classe) => void;
}) {
  return (
    <>
      {isElementaire && group.libelle && (
        <TableRow className="bg-muted/40 hover:bg-muted/40">
          <TableCell
            colSpan={7}
            className="font-semibold text-primary text-xs uppercase tracking-wide py-2"
          >
            <div className="flex items-center gap-2">
              <Layers className="h-3.5 w-3.5" />
              {group.libelle}
              <Badge variant="outline" className="ml-1 text-[10px]">
                {group.items.length} classe{group.items.length > 1 ? "s" : ""}
              </Badge>
            </div>
          </TableCell>
        </TableRow>
      )}
      {group.items.map((c) => {
        const taux =
          c.capacite > 0
            ? Math.round((c._count.eleves / c.capacite) * 100)
            : 0;
        const surCharge = taux > 100;
        return (
          <TableRow key={c.id}>
            <TableCell className="font-semibold text-foreground">
              {c.nom}
            </TableCell>
            {isElementaire && (
              <TableCell>
                <Badge
                  variant="secondary"
                  className="text-[11px]"
                >
                  {getEtapeLibelle(c.etape) || `Étape ${c.etape}`}
                </Badge>
              </TableCell>
            )}
            <TableCell>
              {c.enseignantPrincipal ? (
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    {c.enseignantPrincipal.prenom}{" "}
                    {c.enseignantPrincipal.nom}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground italic">
                  Non assigné
                </span>
              )}
            </TableCell>
            <TableCell>
              <Badge
                variant={surCharge ? "destructive" : "outline"}
                className="font-mono"
              >
                {c._count.eleves}/{c.capacite}
              </Badge>
            </TableCell>
            <TableCell>
              <span className="text-sm">{c.capacite}</span>
            </TableCell>
            <TableCell>
              <span className="text-sm">{c.salle || "—"}</span>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onAffecter(c)}
                  className="h-8 gap-1.5 text-primary"
                  title="Affecter des élèves à cette classe"
                >
                  <UserPlus className="h-4 w-4" />
                  <span className="hidden md:inline">Affecter</span>
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onEdit(c)}
                  className="h-8 w-8"
                  title="Modifier"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onDelete(c)}
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  title="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        );
      })}
    </>
  );
}
