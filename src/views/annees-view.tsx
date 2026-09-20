"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, CalendarDays, Trash2, Star, ArrowRightLeft, CalendarRange } from "lucide-react";
import { toast } from "sonner";
import { PERIODE_LIBELLE } from "@/lib/data";

interface Annee {
  id: string;
  libelle: string;
  dateDebut: string;
  dateFin: string;
  active: boolean;
  periodesActives: string;
}

const TOUTES_PERIODES = ["T1", "T2", "T3", "S1", "S2"];

function parsePeriodes(s: string): string[] {
  return (s || "").split(",").map((x) => x.trim()).filter(Boolean);
}

export function AnneesView() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [periodesDialogAnnee, setPeriodesDialogAnnee] = useState<Annee | null>(null);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [form, setForm] = useState({
    libelle: "", dateDebut: "", dateFin: "", active: false, periodesActives: "T1,T2,T3",
  });
  const [transfer, setTransfer] = useState({ sourceAnneeId: "", cibleAnneeId: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["annees"],
    queryFn: async () => {
      const r = await fetch("/api/annees");
      const j = await r.json();
      return j.data as Annee[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (body: typeof form) => {
      const r = await fetch("/api/annees", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      return j;
    },
    onSuccess: () => {
      toast.success("Année scolaire créée");
      qc.invalidateQueries({ queryKey: ["annees"] });
      setDialogOpen(false);
      setForm({ libelle: "", dateDebut: "", dateFin: "", active: false, periodesActives: "T1,T2,T3" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async (a: Annee) => {
      const r = await fetch("/api/annees", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: a.id, active: !a.active }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      return j;
    },
    onSuccess: () => { toast.success("Statut mis à jour"); qc.invalidateQueries({ queryKey: ["annees"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updatePeriodesMutation = useMutation({
    mutationFn: async ({ id, periodes }: { id: string; periodes: string }) => {
      const r = await fetch("/api/annees", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, periodesActives: periodes }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      return j;
    },
    onSuccess: () => { toast.success("Périodes mises à jour"); qc.invalidateQueries({ queryKey: ["annees"] }); setPeriodesDialogAnnee(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/annees?id=${id}`, { method: "DELETE" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      return j;
    },
    onSuccess: () => { toast.success("Année supprimée"); qc.invalidateQueries({ queryKey: ["annees"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const transferMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/annees/transferer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(transfer) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      return j;
    },
    onSuccess: (j) => {
      toast.success(j.message || "Transfert effectué");
      qc.invalidateQueries({ queryKey: ["annees"] });
      setTransferDialogOpen(false);
      setTransfer({ sourceAnneeId: "", cibleAnneeId: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const currentPeriodes = parsePeriodes(periodesDialogAnnee?.periodesActives || "");
  const togglePeriode = (p: string) => {
    if (!periodesDialogAnnee) return;
    const set = new Set(currentPeriodes);
    if (set.has(p)) set.delete(p); else set.add(p);
    const nouvelle = TOUTES_PERIODES.filter((x) => set.has(x)).join(",");
    setPeriodesDialogAnnee({ ...periodesDialogAnnee, periodesActives: nouvelle });
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Année Scolaire"
        description="Gestion des années scolaires, périodes et transfert de données"
        backTo="dashboard"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setTransferDialogOpen(true)}>
              <ArrowRightLeft className="h-4 w-4 mr-1" /> Transférer
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Nouvelle année
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto custom-scroll">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Année scolaire</TableHead>
                  <TableHead>Date début</TableHead>
                  <TableHead>Date fin</TableHead>
                  <TableHead>Périodes actives</TableHead>
                  <TableHead className="text-center">Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Chargement...</TableCell></TableRow>
                )}
                {data?.length === 0 && !isLoading && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Aucune année scolaire. Cliquez sur « Nouvelle année ».</TableCell></TableRow>
                )}
                {data?.map((a) => {
                  const periodes = parsePeriodes(a.periodesActives);
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-primary" />
                          {a.libelle}
                          {a.active && (<Badge className="gap-1 text-[10px]"><Star className="h-3 w-3" /> Active</Badge>)}
                        </div>
                      </TableCell>
                      <TableCell>{a.dateDebut || "—"}</TableCell>
                      <TableCell>{a.dateFin || "—"}</TableCell>
                      <TableCell>
                        <button onClick={() => setPeriodesDialogAnnee(a)} className="flex flex-wrap gap-1" title="Configurer les périodes">
                          {periodes.length > 0 ? periodes.map((p) => (
                            <Badge key={p} variant="secondary" className="text-[10px]">{PERIODE_LIBELLE[p] ?? p}</Badge>
                          )) : (<span className="text-xs text-muted-foreground italic">Aucune — configurer</span>)}
                        </button>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch checked={a.active} onCheckedChange={() => toggleActiveMutation.mutate(a)} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => setPeriodesDialogAnnee(a)} title="Périodes">
                          <CalendarRange className="h-4 w-4 text-primary" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { if (confirm("Supprimer cette année scolaire ?")) deleteMutation.mutate(a.id); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvelle année scolaire</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Libellé *</Label>
              <Input value={form.libelle} onChange={(e) => setForm({ ...form, libelle: e.target.value })} placeholder="Ex: 2025-2026" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Date de début</Label><Input type="date" value={form.dateDebut} onChange={(e) => setForm({ ...form, dateDebut: e.target.value })} /></div>
              <div className="space-y-2"><Label>Date de fin</Label><Input type="date" value={form.dateFin} onChange={(e) => setForm({ ...form, dateFin: e.target.value })} /></div>
            </div>
            <div className="space-y-2">
              <Label>Périodes actives (élémentaire : T1, T2, T3 / moyen-secondaire : S1, S2)</Label>
              <div className="flex flex-wrap gap-2">
                {TOUTES_PERIODES.map((p) => {
                  const active = parsePeriodes(form.periodesActives).includes(p);
                  return (
                    <button key={p} type="button" onClick={() => {
                      const set = new Set(parsePeriodes(form.periodesActives));
                      if (set.has(p)) set.delete(p); else set.add(p);
                      const nouvelle = TOUTES_PERIODES.filter((x) => set.has(x)).join(",");
                      setForm({ ...form, periodesActives: nouvelle });
                    }} className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 hover:bg-muted border-border"}`}>
                      {PERIODE_LIBELLE[p] ?? p}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              <Label>Définir comme année active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={!form.libelle || createMutation.isPending}>Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!periodesDialogAnnee} onOpenChange={(o) => !o && setPeriodesDialogAnnee(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Périodes actives — {periodesDialogAnnee?.libelle}</DialogTitle>
            <DialogDescription>
              Activez ou désactivez les trimestres (T1, T2, T3) et semestres (S1, S2).
              Les périodes désactivées n&apos;apparaîtront pas dans les évaluations et bulletins.
              Les données (élèves, classes, matières, barèmes) restent identiques d&apos;une période à l&apos;autre.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2 py-2">
            {TOUTES_PERIODES.map((p) => {
              const active = currentPeriodes.includes(p);
              return (
                <button key={p} type="button" onClick={() => togglePeriode(p)} className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${active ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-muted/50 hover:bg-muted border-border"}`}>
                  {PERIODE_LIBELLE[p] ?? p}
                </button>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPeriodesDialogAnnee(null)}>Annuler</Button>
            <Button onClick={() => periodesDialogAnnee && updatePeriodesMutation.mutate({ id: periodesDialogAnnee.id, periodes: periodesDialogAnnee.periodesActives })} disabled={updatePeriodesMutation.isPending}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transférer les données d&apos;une année à l&apos;autre</DialogTitle>
            <DialogDescription>
              Copie les <strong>classes, élèves (réaffectés) et affectations enseignants</strong> vers une nouvelle année.
              Les <strong>notes, bulletins, absences et paiements ne sont PAS transférés</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Année source (d&apos;où transférer)</Label>
              <Select value={transfer.sourceAnneeId} onValueChange={(v) => setTransfer({ ...transfer, sourceAnneeId: v })}>
                <SelectTrigger><SelectValue placeholder="Sélectionner l'année source" /></SelectTrigger>
                <SelectContent>{data?.map((a) => (<SelectItem key={a.id} value={a.id}>{a.libelle}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Année cible (vers où transférer)</Label>
              <Select value={transfer.cibleAnneeId} onValueChange={(v) => setTransfer({ ...transfer, cibleAnneeId: v })}>
                <SelectTrigger><SelectValue placeholder="Sélectionner l'année cible" /></SelectTrigger>
                <SelectContent>{data?.map((a) => (<SelectItem key={a.id} value={a.id}>{a.libelle}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
              ℹ️ Les élèves déjà présents dans l&apos;année cible (même matricule) ne sont pas dupliqués.
              Les classes existantes dans l&apos;année cible sont réutilisées par nom.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>Annuler</Button>
            <Button onClick={() => transferMutation.mutate()} disabled={transferMutation.isPending || !transfer.sourceAnneeId || !transfer.cibleAnneeId || transfer.sourceAnneeId === transfer.cibleAnneeId}>
              <ArrowRightLeft className="h-4 w-4 mr-1" /> Transférer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
