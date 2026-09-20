"use client";

import { useEffect } from "react";
import { useAppStore, type ViewKey } from "@/lib/store";
import {
  LayoutDashboard,
  Settings,
  Layers,
  CalendarDays,
  School,
  Users,
  GraduationCap,
  BookOpen,
  ClipboardList,
  CalendarX2,
  BarChart3,
  Wallet,
  UserCog,
  FileBadge,
  Info,
  X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NavItem {
  key: ViewKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  privateOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { key: "avant-propos", label: "Avant-propos", icon: Info },
  { key: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { key: "parametres", label: "Paramètres Établissement", icon: Settings, adminOnly: true },
  { key: "cycles", label: "Cycles", icon: Layers },
  { key: "annees", label: "Année Scolaire", icon: CalendarDays },
  { key: "classes", label: "Classes", icon: School },
  { key: "eleves", label: "Élèves", icon: Users },
  { key: "enseignants", label: "Enseignants", icon: GraduationCap },
  { key: "matieres", label: "Matières", icon: BookOpen },
  { key: "evaluations", label: "Évaluations", icon: ClipboardList },
  { key: "absences", label: "Absences", icon: CalendarX2 },
  { key: "statistiques", label: "Statistiques", icon: BarChart3 },
  { key: "documents", label: "Documents officiels", icon: FileBadge },
  { key: "paiements", label: "Gestion des paiements", icon: Wallet, privateOnly: true },
  { key: "utilisateurs", label: "Utilisateurs", icon: UserCog, adminOnly: true },
];

export function AppSidebar() {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);
  const user = useAppStore((s) => s.user)!;

  const { data: etab } = useQuery({
    queryKey: ["etablissement"],
    queryFn: async () => {
      const r = await fetch("/api/etablissement");
      const j = await r.json();
      return j.data as { typeEcole: string } | null;
    },
  });

  const isPrivate = etab?.typeEcole === "PRIVEE";
  const isAdmin = user.role === "ADMIN";

  const visibleItems = NAV_ITEMS.filter((i) => {
    if (i.adminOnly && !isAdmin) return false;
    if (i.privateOnly && !isPrivate) return false;
    return true;
  });

  // Navigation clavier : Alt + flèches haut/bas
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (target?.isContentEditable) return;
      if (e.altKey && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        e.preventDefault();
        const idx = visibleItems.findIndex((i) => i.key === view);
        if (idx === -1) {
          if (visibleItems.length > 0) setView(visibleItems[0].key);
          return;
        }
        const delta = e.key === "ArrowDown" ? 1 : -1;
        const next = (idx + delta + visibleItems.length) % visibleItems.length;
        setView(visibleItems[next].key);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [view, visibleItems, setView]);

  return (
    <>
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={cn(
          "flex flex-col bg-sidebar text-sidebar-foreground z-50 transition-all duration-300 sidebar-gradient",
          "fixed lg:static inset-y-0 left-0 w-72 lg:w-72 lg:translate-x-0 shadow-xl",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* En-tête sidebar */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border/60">
          <div className="relative h-16 w-16 rounded-2xl overflow-hidden bg-white/15 flex-shrink-0 ring-2 ring-white/30 shadow-lg">
            <Image
              src="/resources/app-logo.png"
              alt="JANG EKOL SENEGAL"
              fill
              className="object-cover"
              priority
            />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-base leading-tight tracking-wide">
              JANG EKOL
            </h1>
            <p className="text-[11px] text-sidebar-foreground/80 leading-tight">
              SENEGAL
            </p>
            <p className="text-[10px] text-sidebar-foreground/60 leading-tight mt-0.5">
              Gestion Scolaire
            </p>
          </div>
          <button
            className="ml-auto lg:hidden text-sidebar-foreground/70 hover:text-sidebar-foreground"
            onClick={() => setSidebarOpen(false)}
            aria-label="Fermer le menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-3">
          <nav className="space-y-0.5 px-2">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const active = view === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => {
                    setView(item.key);
                    setSidebarOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-left",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-border/60 hover:text-sidebar-foreground"
                  )}
                >
                  <Icon className="h-[18px] w-[18px] flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Pied sidebar */}
        <div className="border-t border-sidebar-border px-4 py-3">
          <div className="flex items-center gap-2 text-[11px] text-sidebar-foreground/60">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
            <span>{isAdmin ? "Administrateur" : user.role === "DIRECTEUR" ? "Directeur" : "Enseignant"}</span>
          </div>
          <p className="mt-1.5 text-[10px] text-sidebar-foreground/50">
            Navigation : <kbd className="px-1 rounded bg-sidebar-border/60">Alt</kbd> +{" "}
            <kbd className="px-1 rounded bg-sidebar-border/60">↑</kbd>/<kbd className="px-1 rounded bg-sidebar-border/60">↓</kbd>
          </p>
          <p className="mt-1 text-[10px] text-sidebar-foreground/50">
            © {new Date().getFullYear()} JANG EKOL SENEGAL
          </p>
        </div>
      </aside>
    </>
  );
}
