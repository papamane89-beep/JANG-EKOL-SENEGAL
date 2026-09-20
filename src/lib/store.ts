"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ViewKey =
  | "avant-propos"
  | "dashboard"
  | "parametres"
  | "cycles"
  | "annees"
  | "classes"
  | "eleves"
  | "enseignants"
  | "matieres"
  | "evaluations"
  | "essais"
  | "synthese"
  | "proposition"
  | "bulletins"
  | "absences"
  | "statistiques"
  | "documents"
  | "paiements"
  | "utilisateurs";

export interface SessionUser {
  id: string;
  login: string;
  nom: string;
  prenom: string;
  role: string;
}

interface AppState {
  // Auth
  user: SessionUser | null;
  setUser: (u: SessionUser | null) => void;
  logout: () => void;
  // Navigation SPA
  view: ViewKey;
  setView: (v: ViewKey) => void;
  // Cycle & année courante (filtres globaux)
  cycleCourant: string;
  setCycleCourant: (c: string) => void;
  anneeCouranteId: string | null;
  setAnneeCouranteId: (id: string | null) => void;
  // Périodes actives de l'année courante
  periodesActives: string[];
  setPeriodesActives: (p: string[]) => void;
  // Sidebar collapse (mobile)
  sidebarOpen: boolean;
  setSidebarOpen: (b: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (u) => set({ user: u }),
      logout: () => set({ user: null, view: "dashboard" }),
      view: "dashboard",
      setView: (v) => set({ view: v }),
      cycleCourant: "ELEMENTAIRE",
      setCycleCourant: (c) => set({ cycleCourant: c }),
      anneeCouranteId: null,
      setAnneeCouranteId: (id) => set({ anneeCouranteId: id }),
      periodesActives: ["T1", "T2", "T3"],
      setPeriodesActives: (p) => set({ periodesActives: p }),
      sidebarOpen: false,
      setSidebarOpen: (b) => set({ sidebarOpen: b }),
    }),
    {
      name: "jang-ekol-session",
      partialize: (s) => ({
        user: s.user,
        view: s.view,
        cycleCourant: s.cycleCourant,
        anneeCouranteId: s.anneeCouranteId,
      }),
    }
  )
);
