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
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Users,
  Loader2,
  Printer,
  UserPlus,
  Venus,
  Mars,
} from "lucide-react";
import { toast } from "sonner";

// ============================================================
// Types
// ============================================================
interface Classe {
  id: string;
  nom: string;
  cycleId: string;
  cycle: { id: string; nom: string };
  etape: number;
  capacite: number;
  _count: { eleves: number };
}
interface Eleve {
  id: string;
  matricule: string;
  prenom: string;
  nom: string;
  sexe: string;
  dateNaissance: string;
  lieuNaissance: string;
  adresse: string;
  telephoneParent: string;
  nomPere: string;
  nomMere: string;
  classeId: string | null;
  classe: { id: string; nom: string; cycle: { id: string; nom: string } } | null;
  redoublant: boolean;
  statut: string;
}

// ============================================================
// Composant principal
// ============================================================
export function ElevesView() {
  const cycleCourant = useAppStore((s) => s.cycleCourant);
  const anneeCouranteId = useAppStore((s) => s.anneeCouranteId);
  const queryClient = useQueryClient();

  // Filtres
  const [search, setSearch] = useState("");
  const [classeFilter, setClasseFilter] = useState<string>("all");

  // Dialogue
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Eleve | null>(null);
  const [deleteEleve, setDeleteEleve] = useState<Eleve | null>(null);
  const [repartirClasse, setRepartirClasse] = useState<Classe | null>(null);

  // Formulaire
  const [formPrenom, setFormPrenom] = useState("");
  const [formNom, setFormNom] = useState("");
  const [formSexe, setFormSexe] = useState<"M" | "F">("M");
  const [formDateNaissance, setFormDateNaissance] = useState("");
  const [formLieuNaissance, setFormLieuNaissance] = useState("");
  const [formAdresse, setFormAdresse] = useState("");
  const [formTelParent, setFormTelParent] = useState("");
  const [formNomPere, setFormNomPere] = useState("");
  const [formNomMere, setFormNomMere] = useState("");
  const [formClasseId, setFormClasseId] = useState<string>("");
  const [formRedoublant, setFormRedoublant] = useState(false);

  // Classes (du cycle courant + année courante)
  const { data: classes } = useQuery({
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

  // Élèves (avec filtres appliqués)
  const { data: eleves, isLoading } = useQuery({
    queryKey: ["eleves", anneeCouranteId, classeFilter, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (anneeCouranteId) params.set("anneeId", anneeCouranteId);
      if (classeFilter !== "all") params.set("classeId", classeFilter);
      if (search.trim()) params.set("search", search.trim());
      const r = await fetch(`/api/eleves?${params.toString()}`);
      const j = await r.json();
      return (j.data ?? []) as Eleve[];
    },
    enabled: !!anneeCouranteId,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const r = await fetch("/api/eleves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Erreur lors de la création");
      return j.data;
    },
    onSuccess: () => {
      toast.success("Élève inscrit avec succès");
      queryClient.invalidateQueries({ queryKey: ["eleves"] });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["stats-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["class-distribution"] });
      setDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const r = await fetch("/api/eleves", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Erreur lors de la modification");
      return j.data;
    },
    onSuccess: () => {
      toast.success("Élève modifié avec succès");
      queryClient.invalidateQueries({ queryKey: ["eleves"] });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["class-distribution"] });
      setDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/eleves?id=${id}`, { method: "DELETE" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Erreur lors de la suppression");
      return j;
    },
    onSuccess: () => {
      toast.success("Élève supprimé");
      queryClient.invalidateQueries({ queryKey: ["eleves"] });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["stats-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["class-distribution"] });
      setDeleteEleve(null);
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
      queryClient.invalidateQueries({ queryKey: ["eleves"] });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["class-distribution"] });
      setRepartirClasse(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Ouvrir dialogue création
  const openCreate = () => {
    setEditing(null);
    setFormPrenom("");
    setFormNom("");
    setFormSexe("M");
    setFormDateNaissance("");
    setFormLieuNaissance("");
    setFormAdresse("");
    setFormTelParent("");
    setFormNomPere("");
    setFormNomMere("");
    setFormClasseId("");
    setFormRedoublant(false);
    setDialogOpen(true);
  };

  // Ouvrir dialogue édition
  const openEdit = (e: Eleve) => {
    setEditing(e);
    setFormPrenom(e.prenom);
    setFormNom(e.nom);
    setFormSexe(e.sexe as "M" | "F");
    setFormDateNaissance(e.dateNaissance);
    setFormLieuNaissance(e.lieuNaissance);
    setFormAdresse(e.adresse);
    setFormTelParent(e.telephoneParent);
    setFormNomPere(e.nomPere);
    setFormNomMere(e.nomMere);
    setFormClasseId(e.classeId ?? "");
    setFormRedoublant(e.redoublant);
    setDialogOpen(true);
  };

  // Soumettre formulaire
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPrenom.trim() || !formNom.trim()) {
      toast.error("Prénom et nom sont requis");
      return;
    }
    if (!anneeCouranteId) {
      toast.error("Aucune année scolaire sélectionnée");
      return;
    }
    const payload: Record<string, unknown> = {
      prenom: formPrenom.trim(),
      nom: formNom.trim(),
      sexe: formSexe,
      dateNaissance: formDateNaissance,
      lieuNaissance: formLieuNaissance.trim(),
      adresse: formAdresse.trim(),
      telephoneParent: formTelParent.trim(),
      nomPere: formNomPere.trim(),
      nomMere: formNomMere.trim(),
      anneeScolaireId: anneeCouranteId,
      classeId: formClasseId || null,
      redoublant: formRedoublant,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  // Stats résumé
  const total = eleves?.length ?? 0;
  const garcons = eleves?.filter((e) => e.sexe === "M").length ?? 0;
  const filles = total - garcons;
  const affectes = eleves?.filter((e) => e.statut === "AFFECTE").length ?? 0;

  // Classe sélectionnée (pour répartition auto)
  const selectedClasse = useMemo(
    () => classes?.find((c) => c.id === classeFilter) ?? null,
    [classes, classeFilter]
  );

  const cycleLabel = (
    cycleCourant.charAt(0) + cycleCourant.slice(1).toLowerCase()
  );

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Élèves"
        description={`Gestion des élèves — Cycle ${cycleLabel}`}
        backTo="dashboard"
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => window.print()}
              className="gap-2 no-print"
            >
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Imprimer</span>
            </Button>
            <Button onClick={openCreate} className="gap-2 no-print">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nouvel Élève</span>
              <span className="sm:hidden">Élève</span>
            </Button>
          </>
        }
      />

      {/* Cartes résumé */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-5 no-print">
        <Card>
          <CardContent className="p-3 sm:p-4 flex items-center gap-3">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs text-muted-foreground font-medium truncate">
                Total
              </p>
              <p className="text-xl sm:text-2xl font-bold text-foreground">
                {total}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 flex items-center gap-3">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
              <Mars className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs text-muted-foreground font-medium truncate">
                Garçons
              </p>
              <p className="text-xl sm:text-2xl font-bold text-foreground">
                {garcons}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 flex items-center gap-3">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center flex-shrink-0">
              <Venus className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs text-muted-foreground font-medium truncate">
                Filles
              </p>
              <p className="text-xl sm:text-2xl font-bold text-foreground">
                {filles}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 flex items-center gap-3">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
              <UserPlus className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs text-muted-foreground font-medium truncate">
                Affectés
              </p>
              <p className="text-xl sm:text-2xl font-bold text-foreground">
                {affectes}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <Card className="mb-5 no-print">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par prénom, nom ou matricule..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="sm:w-64">
              <Select
                value={classeFilter}
                onValueChange={setClasseFilter}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Toutes les classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les classes</SelectItem>
                  {classes?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nom} ({c._count.eleves}/{c.capacite})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedClasse && (
              <Button
                variant="secondary"
                onClick={() => setRepartirClasse(selectedClasse)}
                className="gap-2 whitespace-nowrap"
              >
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">
                  Répartir auto. vers {selectedClasse.nom}
                </span>
                <span className="sm:hidden">Répartir</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tableau principal */}
      <Card>
        <CardHeader className="pb-3 no-print">
          <CardTitle className="text-base flex items-center justify-between gap-2">
            <span>Liste des élèves</span>
            <Badge variant="outline" className="font-normal">
              {total} élève{total > 1 ? "s" : ""}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 no-print">
              <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
            </div>
          ) : !eleves || eleves.length === 0 ? (
            <div className="text-center py-12 no-print">
              <Users className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Aucun élève trouvé. {!search && !classeFilter && "Inscrivez un premier élève."}
              </p>
              <Button
                onClick={openCreate}
                variant="outline"
                className="mt-4 gap-2"
              >
                <Plus className="h-4 w-4" />
                Inscrire un élève
              </Button>
            </div>
          ) : (
            <div className="print-area">
              {/* En-tête d'impression */}
              <div className="hidden print:block mb-4 px-4">
                <h2 className="text-lg font-bold">
                  Liste des élèves — {cycleLabel}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {classeFilter !== "all" && selectedClasse
                    ? `Classe : ${selectedClasse.nom}`
                    : "Toutes les classes"}
                  {" — "}
                  {total} élève{total > 1 ? "s" : ""}
                </p>
              </div>
              <div className="overflow-x-auto custom-scroll">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[120px]">Matricule</TableHead>
                      <TableHead className="min-w-[180px]">
                        Prénom & Nom
                      </TableHead>
                      <TableHead className="min-w-[80px]">Sexe</TableHead>
                      <TableHead className="min-w-[120px]">
                        Naissance
                      </TableHead>
                      <TableHead className="min-w-[120px]">Classe</TableHead>
                      <TableHead className="min-w-[110px]">Statut</TableHead>
                      <TableHead className="text-right min-w-[120px] no-print">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eleves.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-mono text-xs text-primary">
                          {e.matricule || "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">
                              {e.prenom}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {e.nom}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <SexeBadge sexe={e.sexe} />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm">
                              {e.dateNaissance || "—"}
                            </span>
                            {e.lieuNaissance && (
                              <span className="text-xs text-muted-foreground">
                                {e.lieuNaissance}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {e.classe ? (
                            <Badge variant="secondary">
                              {e.classe.nom}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">
                              Non affecté
                            </span>
                          )}
                          {e.redoublant && (
                            <Badge
                              variant="outline"
                              className="ml-1 text-amber-700 border-amber-300"
                            >
                              R
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatutBadge statut={e.statut} />
                        </TableCell>
                        <TableCell className="text-right no-print">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openEdit(e)}
                              className="h-8 w-8"
                              title="Modifier"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setDeleteEleve(e)}
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              title="Supprimer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogue Création / Édition */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto custom-scroll">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Modifier l'élève" : "Inscription d'un nouvel élève"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? `Mettre à jour les informations de ${editing.prenom} ${editing.nom}`
                : "Renseignez les informations de l'élève. Le matricule sera généré automatiquement."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Prénom + Nom */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="prenom">Prénom *</Label>
                <Input
                  id="prenom"
                  value={formPrenom}
                  onChange={(e) => setFormPrenom(e.target.value)}
                  placeholder="Prénom"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nom">Nom *</Label>
                <Input
                  id="nom"
                  value={formNom}
                  onChange={(e) => setFormNom(e.target.value)}
                  placeholder="Nom"
                  required
                />
              </div>
            </div>

            {/* Sexe + Date de naissance */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Sexe</Label>
                <RadioGroup
                  value={formSexe}
                  onValueChange={(v) => setFormSexe(v as "M" | "F")}
                  className="flex flex-row gap-6 pt-1.5"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="M" id="sexe-m" />
                    <Label htmlFor="sexe-m" className="cursor-pointer font-normal">
                      <span className="inline-flex items-center gap-1.5">
                        <Mars className="h-4 w-4 text-blue-600" />
                        Masculin
                      </span>
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="F" id="sexe-f" />
                    <Label htmlFor="sexe-f" className="cursor-pointer font-normal">
                      <span className="inline-flex items-center gap-1.5">
                        <Venus className="h-4 w-4 text-rose-600" />
                        Féminin
                      </span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dateNaissance">Date de naissance</Label>
                <Input
                  id="dateNaissance"
                  type="date"
                  value={formDateNaissance}
                  onChange={(e) => setFormDateNaissance(e.target.value)}
                />
              </div>
            </div>

            {/* Lieu de naissance */}
            <div className="space-y-1.5">
              <Label htmlFor="lieuNaissance">Lieu de naissance</Label>
              <Input
                id="lieuNaissance"
                value={formLieuNaissance}
                onChange={(e) => setFormLieuNaissance(e.target.value)}
                placeholder="Ex: Dakar"
              />
            </div>

            {/* Adresse + Téléphone parent */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="adresse">Adresse</Label>
                <Input
                  id="adresse"
                  value={formAdresse}
                  onChange={(e) => setFormAdresse(e.target.value)}
                  placeholder="Quartier, ville..."
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="telParent">Téléphone parent</Label>
                <Input
                  id="telParent"
                  type="tel"
                  value={formTelParent}
                  onChange={(e) => setFormTelParent(e.target.value)}
                  placeholder="+221 77 000 00 00"
                />
              </div>
            </div>

            {/* Père + Mère */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="nomPere">Nom du père</Label>
                <Input
                  id="nomPere"
                  value={formNomPere}
                  onChange={(e) => setFormNomPere(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nomMere">Nom de la mère</Label>
                <Input
                  id="nomMere"
                  value={formNomMere}
                  onChange={(e) => setFormNomMere(e.target.value)}
                />
              </div>
            </div>

            {/* Classe + Redoublant */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="classeId">Classe</Label>
                <Select
                  value={formClasseId}
                  onValueChange={(v) =>
                    setFormClasseId(v === "__none__" ? "" : v)
                  }
                >
                  <SelectTrigger id="classeId" className="w-full">
                    <SelectValue placeholder="Inscrit (sans classe)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      <em>Inscrit (sans classe)</em>
                    </SelectItem>
                    {classes?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nom} ({c._count.eleves}/{c.capacite})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formClasseId && (
                  <p className="text-[11px] text-emerald-700">
                    L&apos;élève sera marqué « AFFECTÉ » dans cette classe.
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Redoublant</Label>
                <div className="flex items-center gap-2 pt-2.5">
                  <Checkbox
                    id="redoublant"
                    checked={formRedoublant}
                    onCheckedChange={(v) =>
                      setFormRedoublant(Boolean(v))
                    }
                  />
                  <Label
                    htmlFor="redoublant"
                    className="cursor-pointer font-normal text-sm"
                  >
                    Cet élève redouble cette année
                  </Label>
                </div>
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
                {editing ? "Mettre à jour" : "Inscrire l'élève"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialogue Répartition automatique */}
      <Dialog
        open={!!repartirClasse}
        onOpenChange={(o) => !o && setRepartirClasse(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Répartir automatiquement
            </DialogTitle>
            <DialogDescription>
              Affecter tous les élèves <strong>INSCRITS</strong> de
              l&apos;année courante à la classe{" "}
              <Badge className="ml-1">{repartirClasse?.nom}</Badge>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-md border bg-muted/40 p-3">
              <span className="text-muted-foreground">Effectif actuel</span>
              <Badge variant="secondary">
                {repartirClasse?._count.eleves ?? 0}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-md border bg-muted/40 p-3">
              <span className="text-muted-foreground">Capacité</span>
              <Badge variant="outline">{repartirClasse?.capacite}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Tous les élèves INSCRITS (sans classe) seront rattachés à cette
              classe et leur statut passera à <strong>AFFECTÉ</strong>. Les
              élèves déjà affectés à d&apos;autres classes ne seront pas
              modifiés.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRepartirClasse(null)}
            >
              Annuler
            </Button>
            <Button
              disabled={repartirMutation.isPending}
              onClick={() =>
                repartirClasse && repartirMutation.mutate(repartirClasse.id)
              }
              className="gap-2"
            >
              {repartirMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              Répartir les inscrits
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogue suppression */}
      <AlertDialog
        open={!!deleteEleve}
        onOpenChange={(o) => !o && setDeleteEleve(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'élève</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer l&apos;élève{" "}
              <strong>
                {deleteEleve?.prenom} {deleteEleve?.nom}
              </strong>{" "}
              ({deleteEleve?.matricule}) ? Toutes les données associées (notes,
              bulletins, absences) seront supprimées. Cette action est
              irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={() =>
                deleteEleve && deleteMutation.mutate(deleteEleve.id)
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
// Sous-composants
// ============================================================
function SexeBadge({ sexe }: { sexe: string }) {
  if (sexe === "F") {
    return (
      <Badge className="bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-200">
        F
      </Badge>
    );
  }
  return (
    <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200">
      M
    </Badge>
  );
}

function StatutBadge({ statut }: { statut: string }) {
  if (statut === "AFFECTE") {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200">
        Affecté
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-amber-700 border-amber-300">
      Inscrit
    </Badge>
  );
}
