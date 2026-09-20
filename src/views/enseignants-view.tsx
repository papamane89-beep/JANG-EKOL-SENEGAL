"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Users2,
  Phone,
  Mail,
  GraduationCap,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { useAppStore } from "@/lib/store";
import { FONCTIONS, SPECIALITES } from "@/lib/data";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Types ---------------------------------------------------------
interface Affectation {
  id: string;
  classeId: string;
  matiere: string;
  classe: { id: string; nom: string };
}

interface Enseignant {
  id: string;
  prenom: string;
  nom: string;
  sexe: string;
  telephone: string;
  email: string;
  adresse: string;
  fonction: string;
  specialite: string;
  grade: string;
  actif: boolean;
  dateEmbauche: string;
  affectations: Affectation[];
  _count?: { affectations: number; classesPrincipal: number };
}

interface Classe {
  id: string;
  nom: string;
  etape: number;
  cycleId: string;
}

const FONCTION_VARIANT: Record<string, string> = {
  Directeur: "bg-primary text-primary-foreground",
  Directrice: "bg-primary text-primary-foreground",
  Adjoint: "bg-emerald-100 text-emerald-700",
  Adjointe: "bg-emerald-100 text-emerald-700",
  Suppléant: "bg-amber-100 text-amber-700",
  Suppléante: "bg-amber-100 text-amber-700",
};

const SPECIALITE_VARIANT: Record<string, string> = {
  Français: "bg-blue-100 text-blue-700",
  Arabe: "bg-violet-100 text-violet-700",
  Anglais: "bg-rose-100 text-rose-700",
};

// Format helpers ------------------------------------------------
const formatFonction = (f: string) =>
  (f.charAt(0) + f.slice(1).toLowerCase()).replace("Adjoint", "Adjoint");

const formatSpecialite = (s: string) => formatFonction(s);

// ============================================================
// EnseignantsView
// ============================================================
export function EnseignantsView() {
  const setView = useAppStore((s) => s.setView);
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [filterActif, setFilterActif] = useState<string>("all"); // all | true | false
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Enseignant | null>(null);
  const [affecting, setAffecting] = useState<Enseignant | null>(null);
  const [deleting, setDeleting] = useState<Enseignant | null>(null);

  // Recherche avec debounce local
  const queryKey = useMemo(
    () => ["enseignants", search, filterActif],
    [search, filterActif]
  );

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterActif !== "all") params.set("actif", filterActif);
      const r = await fetch(`/api/enseignants?${params.toString()}`);
      const j = await r.json();
      return j.data as Enseignant[];
    },
  });

  const { data: classes = [] } = useQuery<Classe[]>({
    queryKey: ["classes-list-enseignants"],
    queryFn: async () => {
      const r = await fetch("/api/classes");
      if (!r.ok) return [];
      const j = await r.json();
      return (j.data ?? []) as Classe[];
    },
  });

  // Mutations ---------------------------------------------------
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const r = await fetch("/api/enseignants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Erreur");
      return j.data;
    },
    onSuccess: () => {
      toast.success("Enseignant créé avec succès");
      qc.invalidateQueries({ queryKey: ["enseignants"] });
      qc.invalidateQueries({ queryKey: ["stats-dashboard"] });
      setCreateOpen(false);
    },
    onError: (e: any) => toast.error(e.message || "Erreur lors de la création"),
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const r = await fetch("/api/enseignants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Erreur");
      return j.data;
    },
    onSuccess: () => {
      toast.success("Enseignant mis à jour");
      qc.invalidateQueries({ queryKey: ["enseignants"] });
      setEditing(null);
    },
    onError: (e: any) => toast.error(e.message || "Erreur lors de la mise à jour"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/enseignants?id=${id}`, { method: "DELETE" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Erreur");
      return j;
    },
    onSuccess: () => {
      toast.success("Enseignant supprimé");
      qc.invalidateQueries({ queryKey: ["enseignants"] });
      qc.invalidateQueries({ queryKey: ["stats-dashboard"] });
      setDeleting(null);
    },
    onError: (e: any) => toast.error(e.message || "Erreur lors de la suppression"),
  });

  const toggleActifMutation = useMutation({
    mutationFn: async (ens: Enseignant) => {
      const r = await fetch("/api/enseignants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: ens.id, actif: !ens.actif }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Erreur");
      return j.data;
    },
    onSuccess: () => {
      toast.success("Statut mis à jour");
      qc.invalidateQueries({ queryKey: ["enseignants"] });
    },
    onError: (e: any) => toast.error(e.message || "Erreur"),
  });

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Enseignants"
        description="Gestion du personnel enseignant et des affectations"
        backTo="dashboard"
        actions={
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nouvel enseignant</span>
            <span className="sm:hidden">Nouveau</span>
          </Button>
        }
      />

      {/* Filtres */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, prénom, téléphone, email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
                aria-label="Rechercher un enseignant"
              />
            </div>
            <Select value={filterActif} onValueChange={setFilterActif}>
              <SelectTrigger className="w-full sm:w-48" aria-label="Filtrer par statut">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="true">Actifs</SelectItem>
                <SelectItem value="false">Inactifs</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tableau */}
      <Card>
        <CardContent className="p-0">
          <div className="max-h-[60vh] overflow-auto custom-scroll">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="min-w-[180px]">Nom & Prénom</TableHead>
                  <TableHead className="text-center">Sexe</TableHead>
                  <TableHead className="min-w-[110px]">Fonction</TableHead>
                  <TableHead className="min-w-[110px]">Spécialité</TableHead>
                  <TableHead className="min-w-[100px]">Grade</TableHead>
                  <TableHead className="min-w-[120px]">Téléphone</TableHead>
                  <TableHead className="text-center min-w-[100px]">Classes</TableHead>
                  <TableHead className="text-center min-w-[80px]">Actif</TableHead>
                  <TableHead className="text-right min-w-[140px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        Chargement…
                      </div>
                    </TableCell>
                  </TableRow>
                ) : !data || data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Users2 className="h-8 w-8 text-muted-foreground/50" />
                        Aucun enseignant trouvé
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((ens) => {
                    const count = ens._count?.affectations ?? ens.affectations?.length ?? 0;
                    return (
                      <TableRow key={ens.id}>
                        <TableCell>
                          <div className="font-medium text-foreground">
                            {ens.prenom} {ens.nom}
                          </div>
                          {ens.email && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Mail className="h-3 w-3" />
                              <span className="truncate max-w-[180px]">{ens.email}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={
                              ens.sexe === "F"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                            }
                          >
                            {ens.sexe}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={FONCTION_VARIANT[ens.fonction] || "bg-muted text-foreground"} variant="secondary">
                            {formatFonction(ens.fonction)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={SPECIALITE_VARIANT[ens.specialite] || "bg-muted text-foreground"}
                            variant="secondary"
                          >
                            {formatSpecialite(ens.specialite)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{ens.grade || "—"}</TableCell>
                        <TableCell className="text-sm">
                          {ens.telephone ? (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              {ens.telephone}
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full bg-primary/10 text-primary text-xs font-bold">
                            {count}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={ens.actif}
                            onCheckedChange={() => toggleActifMutation.mutate(ens)}
                            aria-label={`Activer ${ens.prenom} ${ens.nom}`}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setAffecting(ens)}
                              title="Affecter classes"
                              className="h-8 w-8 p-0"
                              aria-label="Affecter classes"
                            >
                              <GraduationCap className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditing(ens)}
                              title="Modifier"
                              className="h-8 w-8 p-0"
                              aria-label="Modifier"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeleting(ens)}
                              title="Supprimer"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              aria-label="Supprimer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog Création */}
      {createOpen && (
        <EnseignantDialog
          mode="create"
          onClose={() => setCreateOpen(false)}
          onSubmit={(payload) => createMutation.mutate(payload)}
          loading={createMutation.isPending}
        />
      )}

      {/* Dialog Édition */}
      {editing && (
        <EnseignantDialog
          mode="edit"
          enseignant={editing}
          onClose={() => setEditing(null)}
          onSubmit={(payload) => updateMutation.mutate({ id: editing.id, ...payload })}
          loading={updateMutation.isPending}
        />
      )}

      {/* Dialog Affectation classes */}
      {affecting && (
        <AffecterClassesDialog
          enseignant={affecting}
          classes={classes}
          onClose={() => setAffecting(null)}
        />
      )}

      {/* Confirmation suppression */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l&apos;enseignant</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer{" "}
              <strong>
                {deleting?.prenom} {deleting?.nom}
              </strong>{" "}
              ? Toutes les affectations associées seront également supprimées. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => deleting && deleteMutation.mutate(deleting.id)}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================
// Dialog Création/Édition
// ============================================================
interface EnseignantDialogProps {
  mode: "create" | "edit";
  enseignant?: Enseignant | null;
  onClose: () => void;
  onSubmit: (payload: any) => void;
  loading?: boolean;
}

function EnseignantDialog({
  mode,
  enseignant,
  onClose,
  onSubmit,
  loading,
}: EnseignantDialogProps) {
  const [prenom, setPrenom] = useState(enseignant?.prenom ?? "");
  const [nom, setNom] = useState(enseignant?.nom ?? "");
  const [sexe, setSexe] = useState(enseignant?.sexe ?? "M");
  const [telephone, setTelephone] = useState(enseignant?.telephone ?? "");
  const [email, setEmail] = useState(enseignant?.email ?? "");
  const [adresse, setAdresse] = useState(enseignant?.adresse ?? "");
  const [fonction, setFonction] = useState(enseignant?.fonction ?? "Adjoint");
  const [specialite, setSpecialite] = useState(enseignant?.specialite ?? "Français");
  const [grade, setGrade] = useState(enseignant?.grade ?? "");
  const [dateEmbauche, setDateEmbauche] = useState(enseignant?.dateEmbauche ?? "");
  const [actif, setActif] = useState(enseignant?.actif ?? true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prenom.trim() || !nom.trim()) {
      toast.error("Prénom et nom sont obligatoires");
      return;
    }
    onSubmit({
      prenom: prenom.trim(),
      nom: nom.trim(),
      sexe,
      telephone: telephone.trim(),
      email: email.trim(),
      adresse: adresse.trim(),
      fonction,
      specialite,
      grade: grade.trim(),
      dateEmbauche,
      actif,
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto custom-scroll">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Nouvel enseignant" : "Modifier l'enseignant"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Ajouter un nouveau membre du personnel enseignant"
              : `Modifier les informations de ${enseignant?.prenom} ${enseignant?.nom}`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Prénom / Nom */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="prenom">Prénom *</Label>
              <Input
                id="prenom"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                placeholder="Prénom"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nom">Nom *</Label>
              <Input
                id="nom"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Nom"
                required
              />
            </div>
          </div>

          {/* Sexe / Fonction */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Sexe</Label>
              <RadioGroup
                value={sexe}
                onValueChange={setSexe}
                className="flex items-center gap-6 h-9"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem id="sexe-m" value="M" />
                  <Label htmlFor="sexe-m" className="cursor-pointer font-normal">
                    Masculin
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem id="sexe-f" value="F" />
                  <Label htmlFor="sexe-f" className="cursor-pointer font-normal">
                    Féminin
                  </Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fonction">Fonction</Label>
              <Select value={fonction} onValueChange={setFonction}>
                <SelectTrigger id="fonction" className="w-full">
                  <SelectValue placeholder="Fonction" />
                </SelectTrigger>
                <SelectContent>
                  {FONCTIONS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Spécialité / Grade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="specialite">Spécialité</Label>
              <Select value={specialite} onValueChange={setSpecialite}>
                <SelectTrigger id="specialite" className="w-full">
                  <SelectValue placeholder="Spécialité" />
                </SelectTrigger>
                <SelectContent>
                  {SPECIALITES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="grade">Grade</Label>
              <Input
                id="grade"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                placeholder="Ex: Principal, Adjoint…"
              />
            </div>
          </div>

          {/* Téléphone / Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="telephone">Téléphone</Label>
              <Input
                id="telephone"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                placeholder="+221 ..."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemple.sn"
              />
            </div>
          </div>

          {/* Adresse / Date embauche */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="adresse">Adresse</Label>
              <Input
                id="adresse"
                value={adresse}
                onChange={(e) => setAdresse(e.target.value)}
                placeholder="Adresse"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dateEmbauche">Date d&apos;embauche</Label>
              <Input
                id="dateEmbauche"
                type="date"
                value={dateEmbauche}
                onChange={(e) => setDateEmbauche(e.target.value)}
              />
            </div>
          </div>

          {/* Actif */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="actif" className="cursor-pointer font-medium">
                Enseignant actif
              </Label>
              <p className="text-xs text-muted-foreground">
                Désactiver pour archiver sans supprimer
              </p>
            </div>
            <Switch id="actif" checked={actif} onCheckedChange={setActif} />
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

// ============================================================
// Dialog Affecter classes (Arabe / Anglais specialists)
// ============================================================
function AffecterClassesDialog({
  enseignant,
  classes,
  onClose,
}: {
  enseignant: Enseignant;
  classes: Classe[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const initial = new Set(enseignant.affectations?.map((a) => a.classeId) ?? []);
  const [selected, setSelected] = useState<Set<string>>(initial);
  const [matiere, setMatiere] = useState<string>(
    enseignant.affectations?.[0]?.matiere || enseignant.specialite || ""
  );

  const mutation = useMutation({
    mutationFn: async (payload: {
      classeIds: string[];
      matiere: string;
    }) => {
      const r = await fetch("/api/enseignants/affectations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enseignantId: enseignant.id,
          classeIds: payload.classeIds,
          matiere: payload.matiere,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Erreur");
      return j;
    },
    onSuccess: (res) => {
      toast.success(
        `${res.created} affectation(s) créée(s), ${res.skipped} existante(s) ignorée(s)`
      );
      qc.invalidateQueries({ queryKey: ["enseignants"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeMutation = useMutation({
    mutationFn: async (classeId: string) => {
      const r = await fetch(
        `/api/enseignants/affectations?enseignantId=${enseignant.id}&classeId=${classeId}`,
        { method: "DELETE" }
      );
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Erreur");
      return j;
    },
    onSuccess: () => {
      toast.success("Affectation retirée");
      qc.invalidateQueries({ queryKey: ["enseignants"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggle = (classeId: string) => {
    const next = new Set(selected);
    if (next.has(classeId)) next.delete(classeId);
    else next.add(classeId);
    setSelected(next);
  };

  const handleAssign = () => {
    const newOnes = Array.from(selected).filter(
      (cid) => !initial.has(cid)
    );
    if (newOnes.length === 0) {
      toast.info("Aucune nouvelle classe à affecter");
      onClose();
      return;
    }
    mutation.mutate({ classeIds: newOnes, matiere });
  };

  // Group classes by etape (for élémentaire) for clearer UI
  const grouped: Record<string, Classe[]> = {};
  for (const c of classes) {
    const key = `Étape ${c.etape || "—"}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(c);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto custom-scroll">
        <DialogHeader>
          <DialogTitle>
            Affecter classes — {enseignant.prenom} {enseignant.nom}
          </DialogTitle>
          <DialogDescription>
            Spécialité :{" "}
            <Badge variant="secondary" className="ml-1">
              {formatSpecialite(enseignant.specialite)}
            </Badge>
            {enseignant.specialite !== "Français" && (
              <span className="ml-1">
                Sélectionnez les classes où cet enseignant intervient.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Matière enseignée */}
          <div className="space-y-1.5">
            <Label htmlFor="matiere">Matière enseignée</Label>
            <Input
              id="matiere"
              value={matiere}
              onChange={(e) => setMatiere(e.target.value)}
              placeholder="Ex: Arabe, Anglais…"
            />
          </div>

          {/* Liste des classes */}
          {classes.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <GraduationCap className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              Aucune classe disponible. Veuillez d&apos;abord créer des classes
              dans le module Classes.
            </div>
          ) : (
            <div className="space-y-3 max-h-[50vh] overflow-y-auto custom-scroll pr-1">
              {Object.entries(grouped).map(([groupe, items]) => (
                <div key={groupe}>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">
                    {groupe}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {items.map((c) => {
                      const wasInitial = initial.has(c.id);
                      const isSel = selected.has(c.id);
                      return (
                        <label
                          key={c.id}
                          className={`flex items-center gap-2 rounded-md border p-2 cursor-pointer transition-colors ${
                            isSel
                              ? "border-primary bg-primary/5"
                              : "border-border hover:bg-muted/50"
                          }`}
                        >
                          <Checkbox
                            checked={isSel}
                            onCheckedChange={() => toggle(c.id)}
                          />
                          <span className="text-sm font-medium">{c.nom}</span>
                          {wasInitial && (
                            <Badge variant="outline" className="ml-auto text-[10px]">
                              Affecté
                            </Badge>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Affectations actuelles (avec retrait) */}
          {enseignant.affectations && enseignant.affectations.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">
                Affectations actuelles
              </p>
              <div className="flex flex-wrap gap-2">
                {enseignant.affectations.map((a) => (
                  <Badge
                    key={a.id}
                    variant="secondary"
                    className="gap-1 pr-1"
                  >
                    {a.classe?.nom || "—"}
                    {a.matiere && (
                      <span className="text-[10px] text-muted-foreground ml-1">
                        ({a.matiere})
                      </span>
                    )}
                    <button
                      onClick={() => removeMutation.mutate(a.classeId)}
                      className="ml-1 rounded-full hover:bg-destructive/20 hover:text-destructive px-1"
                      aria-label={`Retirer ${a.classe?.nom}`}
                      title="Retirer"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Fermer
          </Button>
          <Button
            type="button"
            onClick={handleAssign}
            disabled={mutation.isPending || classes.length === 0}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {mutation.isPending
              ? "Affectation…"
              : `Affecter (${Array.from(selected).filter((cid) => !initial.has(cid)).length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
