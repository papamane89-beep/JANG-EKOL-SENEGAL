"use client";

import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { toast } from "sonner";
import { MOTIFS_PAIEMENT } from "@/lib/data";
import {
  Plus,
  Trash2,
  Pencil,
  Loader2,
  Printer,
  Wallet,
  Search,
} from "lucide-react";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
interface PaiementRecord {
  id: string;
  eleveId: string;
  classeId: string;
  anneeScolaireId: string;
  montant: number;
  date: string;
  motif: string;
  recuNumero: string;
  eleve?: { id: string; prenom: string; nom: string; matricule: string };
  classe?: { id: string; nom: string };
}

interface ClasseItem {
  id: string;
  nom: string;
  cycleId: string;
  anneeScolaireId: string;
}

interface EleveItem {
  id: string;
  prenom: string;
  nom: string;
  matricule: string;
  classeId: string;
}

interface EtabItem {
  id: string;
  nom: string;
  typeEcole: string;
  ia: string;
  ief: string;
  adresse: string;
  telephone: string;
  email: string;
  directeurNom: string;
}

const MOTIF_LABEL: Record<string, string> = {
  SCOLARITE: "Scolarité",
  INSCRIPTION: "Inscription",
  CANTINE: "Cantine",
  TRANSPORT: "Transport",
  FRAIS_EXAMEN: "Frais d'examen",
};

const MOTIF_BADGE: Record<string, string> = {
  SCOLARITE: "bg-primary/10 text-primary border-primary/20",
  INSCRIPTION: "bg-emerald-100 text-emerald-700 border-emerald-200",
  CANTINE: "bg-amber-100 text-amber-700 border-amber-200",
  TRANSPORT: "bg-violet-100 text-violet-700 border-violet-200",
  FRAIS_EXAMEN: "bg-rose-100 text-rose-700 border-rose-200",
};

// ----------------------------------------------------------------------------
// Main View
// ----------------------------------------------------------------------------
export function PaiementsView() {
  const anneeCouranteId = useAppStore((s) => s.anneeCouranteId);
  const [selectedClasseId, setSelectedClasseId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPaiement, setEditPaiement] = useState<PaiementRecord | null>(null);
  const [printPaiement, setPrintPaiement] = useState<PaiementRecord | null>(
    null
  );
  const printRef = useRef<HTMLDivElement | null>(null);

  const { data: classes } = useQuery<ClasseItem[]>({
    queryKey: ["classes", anneeCouranteId],
    queryFn: async () => {
      const r = await fetch(`/api/classes?anneeId=${anneeCouranteId ?? ""}`);
      const j = await r.json();
      return j.data as ClasseItem[];
    },
    enabled: !!anneeCouranteId,
  });

  const { data: etab } = useQuery<EtabItem>({
    queryKey: ["etablissement"],
    queryFn: async () => {
      const r = await fetch("/api/etablissement");
      const j = await r.json();
      return j.data as EtabItem;
    },
  });

  const { data: paiements, isLoading } = useQuery<PaiementRecord[]>({
    queryKey: ["paiements", selectedClasseId || "all", anneeCouranteId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedClasseId && selectedClasseId !== "all")
        params.set("classeId", selectedClasseId);
      if (anneeCouranteId) params.set("anneeId", anneeCouranteId);
      const r = await fetch(`/api/paiements?${params.toString()}`);
      const j = await r.json();
      return j.data as PaiementRecord[];
    },
    enabled: !!anneeCouranteId,
  });

  const filtered = useMemo(() => {
    if (!paiements) return [];
    const s = search.trim().toLowerCase();
    if (!s) return paiements;
    return paiements.filter((p) => {
      const full =
        `${p.eleve?.prenom ?? ""} ${p.eleve?.nom ?? ""} ${p.recuNumero}`.toLowerCase();
      return full.includes(s);
    });
  }, [paiements, search]);

  const totalMontant = useMemo(
    () => filtered.reduce((acc, p) => acc + (p.montant || 0), 0),
    [filtered]
  );

  const handlePrint = (p: PaiementRecord) => {
    setPrintPaiement(p);
    // Attendre que le DOM se mette à jour avant d'imprimer
    setTimeout(() => {
      window.print();
    }, 100);
  };

  if (!anneeCouranteId) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <PageHeader title="Gestion des paiements" backTo="dashboard" />
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Veuillez sélectionner une année scolaire dans la barre supérieure.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Gestion des paiements"
        description="Reçus de paiement — École privée"
        backTo="dashboard"
      />

      {/* Filtres */}
      <Card className="mb-4 no-print">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs font-medium">Classe</Label>
              <Select value={selectedClasseId} onValueChange={setSelectedClasseId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Toutes les classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  {classes?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs font-medium">Rechercher</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Nom, prénom ou n° de reçu..."
                  className="pl-9 w-full"
                />
              </div>
            </div>
            <CreatePaiementDialog
              open={dialogOpen}
              onOpenChange={(b) => {
                setDialogOpen(b);
                if (!b) setEditPaiement(null);
              }}
              classes={classes ?? []}
              anneeCouranteId={anneeCouranteId}
              editPaiement={editPaiement}
            />
          </div>
        </CardContent>
      </Card>

      {/* Récap total */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4 no-print">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-muted-foreground">Total reçus</p>
              <p className="text-xl font-bold text-foreground">
                {filtered.length}
              </p>
            </div>
            <Wallet className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-muted-foreground">Montant total</p>
              <p className="text-xl font-bold text-primary">
                {totalMontant.toLocaleString("fr-FR")} FCFA
              </p>
            </div>
            <Wallet className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-muted-foreground">Élèves concernés</p>
              <p className="text-xl font-bold text-foreground">
                {new Set(filtered.map((p) => p.eleveId)).size}
              </p>
            </div>
            <Wallet className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="no-print">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Liste des paiements</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center">
              Aucun paiement enregistré.
            </p>
          ) : (
            <div className="overflow-x-auto custom-scroll max-h-[65vh]">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow>
                    <TableHead>N° Reçu</TableHead>
                    <TableHead>Élève</TableHead>
                    <TableHead>Classe</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Motif</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => (
                    <PaiementRow
                      key={p.id}
                      paiement={p}
                      classes={classes ?? []}
                      onPrint={handlePrint}
                      onEdit={(paiement) => {
                        setEditPaiement(paiement);
                        setDialogOpen(true);
                      }}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Zone d'impression du reçu */}
      {printPaiement && (
        <div ref={printRef} className="print-area hidden print:block">
          <RecuPrint paiement={printPaiement} etab={etab} />
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Ligne de paiement
// ----------------------------------------------------------------------------
function PaiementRow({
  paiement,
  classes,
  onPrint,
  onEdit,
}: {
  paiement: PaiementRecord;
  classes: ClasseItem[];
  onPrint: (p: PaiementRecord) => void;
  onEdit: (p: PaiementRecord) => void;
}) {
  const qc = useQueryClient();

  const del = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/paiements?id=${paiement.id}`, {
        method: "DELETE",
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      return j;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["paiements"] });
      toast.success("Paiement supprimé");
    },
    onError: (e: any) => toast.error(e.message || "Erreur"),
  });

  return (
    <TableRow>
      <TableCell className="font-mono text-xs font-semibold text-primary">
        {paiement.recuNumero}
      </TableCell>
      <TableCell className="font-medium">
        {paiement.eleve
          ? `${paiement.eleve.prenom} ${paiement.eleve.nom}`
          : "—"}
      </TableCell>
      <TableCell>
        <Badge variant="outline">{paiement.classe?.nom ?? "—"}</Badge>
      </TableCell>
      <TableCell className="text-right font-bold text-foreground">
        {paiement.montant.toLocaleString("fr-FR")}{" "}
        <span className="text-xs font-normal text-muted-foreground">FCFA</span>
      </TableCell>
      <TableCell>
        {paiement.date
          ? new Date(paiement.date + "T00:00:00").toLocaleDateString("fr-FR")
          : "—"}
      </TableCell>
      <TableCell>
        <Badge
          className={
            MOTIF_BADGE[paiement.motif] ??
            "bg-secondary text-secondary-foreground"
          }
        >
          {MOTIF_LABEL[paiement.motif] ?? paiement.motif}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onPrint(paiement)}
            aria-label="Imprimer le reçu"
            title="Imprimer le reçu"
          >
            <Printer className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEdit(paiement)}
            aria-label="Modifier"
            title="Modifier"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              if (confirm("Supprimer ce paiement ?")) del.mutate();
            }}
            disabled={del.isPending}
            className="text-rose-600 hover:text-rose-700"
            aria-label="Supprimer"
            title="Supprimer"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

// ----------------------------------------------------------------------------
// Dialog de création / modification
// ----------------------------------------------------------------------------
function CreatePaiementDialog({
  open,
  onOpenChange,
  classes,
  anneeCouranteId,
  editPaiement,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  classes: ClasseItem[];
  anneeCouranteId: string;
  editPaiement: PaiementRecord | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nouveau paiement
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto custom-scroll">
        {/* La clé force le remontage quand on change de cible d&apos;édition */}
        <CreatePaiementForm
          key={editPaiement?.id ?? "new"}
          editPaiement={editPaiement}
          classes={classes}
          anneeCouranteId={anneeCouranteId}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function CreatePaiementForm({
  editPaiement,
  classes,
  anneeCouranteId,
  onClose,
}: {
  editPaiement: PaiementRecord | null;
  classes: ClasseItem[];
  anneeCouranteId: string;
  onClose: () => void;
}) {
  const [classeId, setClasseId] = useState(editPaiement?.classeId ?? "");
  const [eleveId, setEleveId] = useState(editPaiement?.eleveId ?? "");
  const [montant, setMontant] = useState(
    editPaiement ? String(editPaiement.montant) : ""
  );
  const [date, setDate] = useState(
    editPaiement?.date || new Date().toISOString().slice(0, 10)
  );
  const [motif, setMotif] = useState<string>(
    editPaiement?.motif || "SCOLARITE"
  );
  const qc = useQueryClient();

  const { data: eleves } = useQuery<EleveItem[]>({
    queryKey: ["eleves-classe", classeId],
    queryFn: async () => {
      const r = await fetch(`/api/eleves?classeId=${classeId}`);
      const j = await r.json();
      return j.data as EleveItem[];
    },
    enabled: !!classeId,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (editPaiement) {
        // PATCH
        const r = await fetch("/api/paiements", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editPaiement.id,
            montant: Number(montant),
            date,
            motif,
          }),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error);
        return j.data;
      }
      // POST
      const r = await fetch("/api/paiements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eleveId,
          classeId,
          anneeScolaireId: anneeCouranteId,
          montant: Number(montant),
          date,
          motif,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      return j.data;
    },
    onSuccess: () => {
      toast.success(editPaiement ? "Paiement modifié" : "Paiement enregistré");
      qc.invalidateQueries({ queryKey: ["paiements"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message || "Erreur"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPaiement && (!eleveId || !classeId)) {
      toast.error("Élève et classe requis");
      return;
    }
    if (!montant || Number(montant) <= 0) {
      toast.error("Montant invalide");
      return;
    }
    mutation.mutate();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {editPaiement ? "Modifier le paiement" : "Nouveau paiement"}
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Classe</Label>
          <Select
            value={classeId}
            onValueChange={(v) => {
              setClasseId(v);
              setEleveId("");
            }}
            disabled={!!editPaiement}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Sélectionner une classe" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Élève</Label>
          <Select
            value={eleveId}
            onValueChange={setEleveId}
            disabled={!classeId || !!editPaiement}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Sélectionner un élève" />
            </SelectTrigger>
            <SelectContent>
              {eleves?.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.prenom} {e.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Montant (FCFA)</Label>
            <Input
              type="number"
              min={0}
              step="500"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              placeholder="25000"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Motif</Label>
          <Select value={motif} onValueChange={setMotif}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MOTIFS_PAIEMENT.map((m) => (
                <SelectItem key={m} value={m}>
                  {MOTIF_LABEL[m] ?? m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            )}
            {editPaiement ? "Mettre à jour" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

// ----------------------------------------------------------------------------
// Reçu imprimable
// ----------------------------------------------------------------------------
function RecuPrint({
  paiement,
  etab,
}: {
  paiement: PaiementRecord;
  etab?: EtabItem;
}) {
  const fmtDate = (d: string) => {
    if (!d) return "—";
    try {
      return new Date(d + "T00:00:00").toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    } catch {
      return d;
    }
  };

  return (
    <div className="bg-white text-black p-8 mx-auto" style={{ maxWidth: "800px" }}>
      {/* En-tête */}
      <div className="flex items-start justify-between border-b-2 border-black pb-4 mb-6">
        <div>
          <h1 className="text-xl font-bold uppercase">
            {etab?.nom ?? "Établissement"}
          </h1>
          {etab?.adresse && (
            <p className="text-sm">{etab.adresse}</p>
          )}
          {etab?.telephone && (
            <p className="text-sm">Tél : {etab.telephone}</p>
          )}
          {etab?.email && (
            <p className="text-sm">{etab.email}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold">
            Inspection d&apos;Académie : {etab?.ia ?? "—"}
          </p>
          <p className="text-sm font-semibold">
            I.E.F : {etab?.ief ?? "—"}
          </p>
          {etab?.directeurNom && (
            <p className="text-sm mt-1">Directeur : {etab.directeurNom}</p>
          )}
        </div>
      </div>

      {/* Titre */}
      <div className="text-center my-6">
        <h2 className="text-2xl font-bold uppercase underline">
          Reçu de paiement
        </h2>
        <p className="text-sm mt-1">N° {paiement.recuNumero}</p>
      </div>

      {/* Corps */}
      <div className="space-y-3 text-base">
        <div className="flex justify-between border-b border-dashed border-gray-400 pb-2">
          <span className="font-semibold">Élève :</span>
          <span>
            {paiement.eleve
              ? `${paiement.eleve.prenom} ${paiement.eleve.nom}`
              : "—"}
            {paiement.eleve?.matricule
              ? ` (Matr. ${paiement.eleve.matricule})`
              : ""}
          </span>
        </div>
        <div className="flex justify-between border-b border-dashed border-gray-400 pb-2">
          <span className="font-semibold">Classe :</span>
          <span>{paiement.classe?.nom ?? "—"}</span>
        </div>
        <div className="flex justify-between border-b border-dashed border-gray-400 pb-2">
          <span className="font-semibold">Motif :</span>
          <span>{MOTIF_LABEL[paiement.motif] ?? paiement.motif}</span>
        </div>
        <div className="flex justify-between border-b border-dashed border-gray-400 pb-2">
          <span className="font-semibold">Date :</span>
          <span>{fmtDate(paiement.date)}</span>
        </div>
        <div className="flex justify-between items-center bg-gray-100 px-4 py-3 rounded mt-4">
          <span className="text-lg font-bold">Montant payé :</span>
          <span className="text-2xl font-bold">
            {paiement.montant.toLocaleString("fr-FR")} FCFA
          </span>
        </div>
      </div>

      {/* Montant en lettres */}
      <p className="text-sm italic mt-4 text-center">
        (Montant en lettres : {numberToFrenchWords(paiement.montant)} Francs CFA)
      </p>

      {/* Signature */}
      <div className="flex justify-between items-end mt-12">
        <div>
          <p className="text-sm font-semibold">Le Caissier</p>
          <div className="h-16" />
          <div className="border-t border-black w-40" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold">Cachet & Signature</p>
          <div className="h-16" />
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold">Le Directeur</p>
          <div className="h-16" />
          <div className="border-t border-black w-40 ml-auto" />
        </div>
      </div>

      <p className="text-center text-[10px] text-gray-600 mt-6">
        Ce reçu fait foi de paiement. Conservez-le précieusement.
      </p>
    </div>
  );
}

// Conversion approximative d&apos;un nombre en lettres françaises (français simple)
function numberToFrenchWords(n: number): string {
  if (n === 0) return "zéro";
  const units = [
    "zéro",
    "un",
    "deux",
    "trois",
    "quatre",
    "cinq",
    "six",
    "sept",
    "huit",
    "neuf",
    "dix",
    "onze",
    "douze",
    "treize",
    "quatorze",
    "quinze",
    "seize",
    "dix-sept",
    "dix-huit",
    "dix-neuf",
  ];
  const tens = [
    "",
    "",
    "vingt",
    "trente",
    "quarante",
    "cinquante",
    "soixante",
    "soixante",
    "quatre-vingt",
    "quatre-vingt",
  ];

  function below1000(num: number): string {
    if (num < 20) return units[num];
    const t = Math.floor(num / 10);
    const r = num % 10;
    let str = tens[t];
    if (t === 7 || t === 9) {
      str = tens[t] + "-" + units[10 + r];
      return str;
    }
    if (t === 8 && r === 0) return "quatre-vingts";
    if (r === 0) return str;
    if (r === 1 && t !== 8 && t !== 9) return str + " et un";
    return str + "-" + units[r];
  }

  function below1M(num: number): string {
    if (num < 100) return below1000(num);
    const h = Math.floor(num / 100);
    const r = num % 100;
    let str = "";
    if (h === 1) str = "cent";
    else str = units[h] + " cent";
    if (r === 0 && h > 1) str += "s";
    if (r > 0) str += " " + below1000(r);
    return str;
  }

  function below1B(num: number): string {
    if (num < 1000) return below1M(num);
    const th = Math.floor(num / 1000);
    const r = num % 1000;
    let str = "";
    if (th === 1) str = "mille";
    else str = below1M(th) + " mille";
    if (r > 0) str += " " + below1M(r);
    return str;
  }

  if (n >= 1_000_000_000) return n.toLocaleString("fr-FR");
  return below1B(n);
}
