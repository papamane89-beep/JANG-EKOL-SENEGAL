"use client";

import { useState } from "react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Pencil,
  Loader2,
  KeyRound,
  UserCog,
} from "lucide-react";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
interface UtilisateurItem {
  id: string;
  login: string;
  prenom: string;
  nom: string;
  role: string; // ADMIN | DIRECTEUR | ENSEIGNANT
  actif: boolean;
  enseignantId?: string | null;
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrateur",
  DIRECTEUR: "Directeur",
  ENSEIGNANT: "Enseignant",
};

const ROLE_BADGE: Record<string, string> = {
  ADMIN: "bg-primary text-primary-foreground",
  DIRECTEUR: "bg-emerald-100 text-emerald-700 border-emerald-200",
  ENSEIGNANT: "bg-amber-100 text-amber-700 border-amber-200",
};

// ----------------------------------------------------------------------------
// Main View
// ----------------------------------------------------------------------------
export function UtilisateursView() {
  const user = useAppStore((s) => s.user)!;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<UtilisateurItem | null>(null);
  const [mdpOpen, setMdpOpen] = useState(false);

  const qc = useQueryClient();
  const { data: users, isLoading } = useQuery<UtilisateurItem[]>({
    queryKey: ["utilisateurs"],
    queryFn: async () => {
      const r = await fetch("/api/utilisateurs");
      const j = await r.json();
      return j.data as UtilisateurItem[];
    },
  });

  const toggleActif = useMutation({
    mutationFn: async (u: UtilisateurItem) => {
      const r = await fetch("/api/utilisateurs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: u.id, actif: !u.actif }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      return j.data;
    },
    onSuccess: (_, u) => {
      qc.invalidateQueries({ queryKey: ["utilisateurs"] });
      toast.success(
        u.actif
          ? `${u.prenom} ${u.nom} désactivé`
          : `${u.prenom} ${u.nom} activé`
      );
    },
    onError: (e: any) => toast.error(e.message || "Erreur"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/utilisateurs?id=${id}`, {
        method: "DELETE",
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      return j;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["utilisateurs"] });
      toast.success("Utilisateur supprimé");
    },
    onError: (e: any) => toast.error(e.message || "Erreur"),
  });

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Utilisateurs"
        description="Comptes d'accès — Administrateurs, Directeurs, Enseignants"
        backTo="dashboard"
        actions={
          <>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setMdpOpen(true)}
            >
              <KeyRound className="h-4 w-4" />
              Mon mot de passe
            </Button>
            <CreateUserDialog
              open={dialogOpen}
              onOpenChange={(b) => {
                setDialogOpen(b);
                if (!b) setEditUser(null);
              }}
              editUser={editUser}
            />
          </>
        }
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Comptes utilisateurs ({users?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !users || users.length === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center">
              Aucun utilisateur enregistré.
            </p>
          ) : (
            <div className="overflow-x-auto custom-scroll max-h-[65vh]">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow>
                    <TableHead>Identifiant</TableHead>
                    <TableHead>Nom complet</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead className="text-center">Actif</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => {
                    const isSelf = u.id === user.id;
                    return (
                      <TableRow key={u.id}>
                        <TableCell className="font-mono font-semibold text-foreground">
                          {u.login}
                          {isSelf && (
                            <Badge className="ml-2 text-[10px]" variant="secondary">
                              Vous
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {u.prenom} {u.nom}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              ROLE_BADGE[u.role] ??
                              "bg-secondary text-secondary-foreground"
                            }
                          >
                            {ROLE_LABEL[u.role] ?? u.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Switch
                              checked={u.actif}
                              onCheckedChange={() => toggleActif.mutate(u)}
                              disabled={
                                toggleActif.isPending ||
                                (u.role === "ADMIN" && u.actif) // can't disable last admin
                              }
                              aria-label="Actif"
                            />
                            <span
                              className={
                                u.actif
                                  ? "text-xs text-emerald-600 font-medium"
                                  : "text-xs text-muted-foreground"
                              }
                            >
                              {u.actif ? "Actif" : "Inactif"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditUser(u);
                                setDialogOpen(true);
                              }}
                              aria-label="Modifier"
                              title="Modifier"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-rose-600 hover:text-rose-700"
                                  disabled={isSelf}
                                  aria-label="Supprimer"
                                  title={
                                    isSelf
                                      ? "Impossible de supprimer votre propre compte"
                                      : "Supprimer"
                                  }
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Supprimer cet utilisateur ?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Cette action est irréversible. Le compte{" "}
                                    <strong>
                                      {u.prenom} {u.nom} ({u.login})
                                    </strong>{" "}
                                    sera définitivement supprimé.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => del.mutate(u.id)}
                                    className="bg-rose-600 hover:bg-rose-700 text-white"
                                  >
                                    Supprimer
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ChangeOwnPasswordDialog open={mdpOpen} onOpenChange={setMdpOpen} />
    </div>
  );
}

// ----------------------------------------------------------------------------
// Dialog: Création / Modification d&apos;un utilisateur
// ----------------------------------------------------------------------------
function CreateUserDialog({
  open,
  onOpenChange,
  editUser,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  editUser: UtilisateurItem | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nouvel utilisateur
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto custom-scroll">
        {/* La clé force le remontage */}
        <CreateUserForm
          key={editUser?.id ?? "new"}
          editUser={editUser}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function CreateUserForm({
  editUser,
  onClose,
}: {
  editUser: UtilisateurItem | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [login, setLogin] = useState(editUser?.login ?? "");
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmMdp, setConfirmMdp] = useState("");
  const [prenom, setPrenom] = useState(editUser?.prenom ?? "");
  const [nom, setNom] = useState(editUser?.nom ?? "");
  const [role, setRole] = useState(editUser?.role ?? "ENSEIGNANT");
  const [actif, setActif] = useState(editUser?.actif ?? true);

  const mutation = useMutation({
    mutationFn: async () => {
      if (editUser) {
        // PATCH (sans changer mot de passe ici — separate dialog)
        const r = await fetch("/api/utilisateurs", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editUser.id,
            login,
            prenom,
            nom,
            role,
            actif,
          }),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error);
        return j.data;
      }
      // POST
      if (motDePasse !== confirmMdp) {
        throw new Error("Les mots de passe ne correspondent pas");
      }
      const r = await fetch("/api/utilisateurs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login,
          motDePasse,
          prenom,
          nom,
          role,
          actif,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      return j.data;
    },
    onSuccess: () => {
      toast.success(editUser ? "Utilisateur modifié" : "Utilisateur créé");
      qc.invalidateQueries({ queryKey: ["utilisateurs"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message || "Erreur"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!login || !prenom || !nom) {
      toast.error("Identifiant, prénom et nom requis");
      return;
    }
    if (!editUser && !motDePasse) {
      toast.error("Mot de passe requis");
      return;
    }
    if (!editUser && motDePasse.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    mutation.mutate();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {editUser
            ? "Modifier l'utilisateur"
            : "Créer un nouvel utilisateur"}
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Identifiant (login)</Label>
          <Input
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            placeholder="ex : adiarra"
            autoComplete="off"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Prénom</Label>
            <Input
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              placeholder="Prénom"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Nom</Label>
            <Input
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Nom"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Rôle</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ADMIN">Administrateur</SelectItem>
              <SelectItem value="DIRECTEUR">Directeur</SelectItem>
              <SelectItem value="ENSEIGNANT">Enseignant</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {!editUser && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Mot de passe</Label>
              <Input
                type="password"
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                placeholder="Min. 6 caractères"
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Confirmer</Label>
              <Input
                type="password"
                value={confirmMdp}
                onChange={(e) => setConfirmMdp(e.target.value)}
                placeholder="Confirmer"
                autoComplete="new-password"
              />
            </div>
          </div>
        )}
        {editUser && (
          <p className="text-xs text-muted-foreground bg-muted/40 rounded-md p-2">
            Pour modifier le mot de passe, utilisez l&apos;option « Changer le
            mot de passe » depuis votre propre compte.
          </p>
        )}
        <div className="flex items-center justify-between gap-3 rounded-md border p-3">
          <div>
            <p className="text-sm font-medium">Compte actif</p>
            <p className="text-xs text-muted-foreground">
              Un compte inactif ne peut pas se connecter
            </p>
          </div>
          <Switch checked={actif} onCheckedChange={setActif} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            )}
            {editUser ? "Mettre à jour" : "Créer le compte"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

// ----------------------------------------------------------------------------
// Dialog: Changer mon propre mot de passe (admin courant)
// ----------------------------------------------------------------------------
function ChangeOwnPasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        {/* La clé force le remontage à chaque ouverture */}
        <ChangePasswordForm key={open ? "open" : "closed"} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function ChangePasswordForm({ onClose }: { onClose: () => void }) {
  const user = useAppStore((s) => s.user)!;
  const qc = useQueryClient();
  const [oldMdp, setOldMdp] = useState("");
  const [newMdp, setNewMdp] = useState("");
  const [confirm, setConfirm] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      // 1. Vérifier l&apos;ancien mot de passe via /api/auth/login
      const loginR = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login: user.login,
          motDePasse: oldMdp,
        }),
      });
      const loginJ = await loginR.json();
      if (!loginR.ok) {
        throw new Error("Ancien mot de passe incorrect");
      }
      // 2. Mettre à jour le mot de passe
      const r = await fetch("/api/utilisateurs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user.id,
          motDePasse: newMdp,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      return j.data;
    },
    onSuccess: () => {
      toast.success("Mot de passe modifié avec succès");
      qc.invalidateQueries({ queryKey: ["utilisateurs"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message || "Erreur"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldMdp || !newMdp || !confirm) {
      toast.error("Tous les champs sont requis");
      return;
    }
    if (newMdp.length < 6) {
      toast.error("Le nouveau mot de passe doit contenir au moins 6 caractères");
      return;
    }
    if (newMdp !== confirm) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    if (newMdp === oldMdp) {
      toast.error("Le nouveau mot de passe doit être différent de l&apos;ancien");
      return;
    }
    mutation.mutate();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          Changer mon mot de passe
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
          Compte : <strong>{user.login}</strong> ({user.prenom} {user.nom})
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Ancien mot de passe</Label>
          <Input
            type="password"
            value={oldMdp}
            onChange={(e) => setOldMdp(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Nouveau mot de passe</Label>
          <Input
            type="password"
            value={newMdp}
            onChange={(e) => setNewMdp(e.target.value)}
            autoComplete="new-password"
            placeholder="Min. 6 caractères"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">
            Confirmer le nouveau mot de passe
          </Label>
          <Input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            )}
            Modifier
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
