"use client";

import { useAppStore, type ViewKey } from "@/lib/store";
import { Menu, LogOut, ChevronDown, Calendar, Layers } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CYCLES } from "@/lib/data";
import { toast } from "sonner";

const VIEW_LABELS: Record<ViewKey, string> = {
  "avant-propos": "Avant-propos",
  dashboard: "Tableau de bord",
  parametres: "Paramètres Établissement",
  cycles: "Cycles",
  annees: "Année Scolaire",
  classes: "Classes",
  eleves: "Élèves",
  enseignants: "Enseignants",
  matieres: "Matières",
  evaluations: "Évaluations",
  essais: "Essais (CM2)",
  synthese: "Synthèse",
  proposition: "Proposition de passage",
  bulletins: "Bulletins",
  absences: "Absences",
  statistiques: "Statistiques",
  documents: "Documents officiels",
  paiements: "Gestion des paiements",
  utilisateurs: "Utilisateurs",
};

export function AppTopbar() {
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);
  const view = useAppStore((s) => s.view);
  const user = useAppStore((s) => s.user)!;
  const logout = useAppStore((s) => s.logout);
  const cycleCourant = useAppStore((s) => s.cycleCourant);
  const setCycleCourant = useAppStore((s) => s.setCycleCourant);
  const anneeCouranteId = useAppStore((s) => s.anneeCouranteId);
  const setAnneeCouranteId = useAppStore((s) => s.setAnneeCouranteId);

  const { data: annees } = useQuery({
    queryKey: ["annees"],
    queryFn: async () => {
      const r = await fetch("/api/annees");
      const j = await r.json();
      return j.data as { id: string; libelle: string; active: boolean }[];
    },
  });

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    logout();
    toast.success("Déconnexion réussie");
  };

  const initials = `${user.prenom.charAt(0)}${user.nom.charAt(0)}`.toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card px-4 shadow-sm">
      <button
        className="lg:hidden p-2 rounded-md hover:bg-accent"
        onClick={() => setSidebarOpen(true)}
        aria-label="Ouvrir le menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="min-w-0 flex-1">
        <h2 className="text-base font-semibold text-foreground truncate">
          {VIEW_LABELS[view]}
        </h2>
      </div>

      {/* Sélecteur Cycle */}
      <div className="hidden sm:flex items-center gap-2">
        <Layers className="h-4 w-4 text-muted-foreground" />
        <Select value={cycleCourant} onValueChange={setCycleCourant}>
          <SelectTrigger className="w-[150px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CYCLES.map((c) => (
              <SelectItem key={c.nom} value={c.nom}>
                {c.nom.charAt(0) + c.nom.slice(1).toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Sélecteur Année scolaire */}
      <div className="hidden sm:flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <Select
          value={anneeCouranteId ?? undefined}
          onValueChange={setAnneeCouranteId}
        >
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Année" />
          </SelectTrigger>
          <SelectContent>
            {annees?.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.libelle} {a.active && "●"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Menu utilisateur */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-full border border-border p-1 pr-2 hover:bg-accent transition-colors">
            <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden md:inline text-sm font-medium max-w-[120px] truncate">
              {user.prenom} {user.nom}
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span className="font-semibold">{user.prenom} {user.nom}</span>
              <span className="text-xs text-muted-foreground font-normal">
                {user.login}
              </span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive cursor-pointer"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Déconnexion
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
