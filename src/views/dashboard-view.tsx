"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import {
  Users,
  GraduationCap,
  School,
  CalendarDays,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import {
  DrapeauSenegal,
  MinistereLogo,
  EtabLogo,
} from "@/components/official-logos";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";

export function DashboardView() {
  const anneeCouranteId = useAppStoreSelector((s) => s.anneeCouranteId);
  const cycleCourant = useAppStoreSelector((s) => s.cycleCourant);

  const { data: etab } = useQuery({
    queryKey: ["etablissement"],
    queryFn: async () => {
      const r = await fetch("/api/etablissement");
      const j = await r.json();
      return j.data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["stats-dashboard", anneeCouranteId],
    queryFn: async () => {
      const r = await fetch(
        `/api/statistiques/dashboard?anneeId=${anneeCouranteId ?? ""}`
      );
      const j = await r.json();
      return j.data as {
        totalEleves: number;
        garcons: number;
        filles: number;
        nbClasses: number;
        nbEnseignants: number;
      };
    },
    enabled: !!anneeCouranteId,
  });

  const { data: annees } = useQuery({
    queryKey: ["annees"],
    queryFn: async () => {
      const r = await fetch("/api/annees");
      const j = await r.json();
      return j.data;
    },
  });

  const anneeActive = annees?.find((a) => a.active);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Tableau de bord"
        description="Vue d'ensemble de l'établissement scolaire"
      />

      {/* En-tête officielle République */}
      <Card className="republic-header border-primary/30 mb-6 overflow-hidden">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-3 sm:gap-5">
            <DrapeauSenegal className="h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0" />
            <div className="flex-1 text-center">
              <p className="text-base sm:text-lg font-bold text-foreground">
                République du Sénégal
              </p>
              <p className="text-[11px] sm:text-xs text-primary italic font-medium">
                Un peuple — Un but — Une foi
              </p>
              <p className="text-sm sm:text-base font-semibold text-foreground/90 mt-1">
                Ministère de l&apos;Éducation Nationale
              </p>
              <div className="flex items-center justify-center gap-x-3 gap-y-0.5 flex-wrap mt-1.5 text-xs sm:text-sm">
                <span className="text-muted-foreground">
                  Inspection d&apos;Académie de{" "}
                  <span className="font-bold text-primary">{etab?.ia ?? "..."}</span>
                </span>
                <span className="text-muted-foreground/40 hidden sm:inline">•</span>
                <span className="text-muted-foreground">
                  Inspection de l&apos;Éducation et de la Formation de{" "}
                  <span className="font-bold text-primary">{etab?.ief ?? "..."}</span>
                </span>
              </div>
            </div>
            <MinistereLogo className="h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0" />
          </div>
        </CardContent>
      </Card>

      {/* Bandeau établissement — logo + infos regroupées */}
      <Card className="mb-6 card-accent gradient-primary border-0 text-primary-foreground shadow-lg">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center gap-4 flex-wrap">
            <EtabLogo
              className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl flex-shrink-0 bg-white/20 shadow-lg"
              path={etab?.logoPath}
            />
            <div className="flex-1 min-w-0 space-y-1">
              <h2 className="text-lg sm:text-xl font-bold truncate">
                {etab?.nom ?? "Établissement non configuré"}
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center rounded-md bg-white/20 px-2 py-0.5 text-xs font-medium capitalize">
                  {etab?.typeEcole === "PRIVEE" ? "École Privée" : "École Publique"}
                </span>
                {anneeActive && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-white/20 px-2 py-0.5 text-xs font-medium">
                    <CalendarDays className="h-3 w-3" />
                    {anneeActive.libelle}
                  </span>
                )}
                <span className="inline-flex items-center rounded-md bg-white/15 px-2 py-0.5 text-xs font-medium capitalize">
                  Cycle: {cycleCourant.charAt(0) + cycleCourant.slice(1).toLowerCase()}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-primary-foreground/85 pt-1">
                {etab?.directeurNom && (
                  <p className="truncate"><span className="opacity-70">Directeur :</span> <span className="font-medium">{etab.directeurNom}</span></p>
                )}
                {etab?.telephone && (
                  <p className="truncate"><span className="opacity-70">Tél :</span> <span className="font-medium">{etab.telephone}</span></p>
                )}
                {etab?.email && (
                  <p className="truncate"><span className="opacity-70">Email :</span> <span className="font-medium">{etab.email}</span></p>
                )}
                {etab?.adresse && (
                  <p className="truncate"><span className="opacity-70">Adresse :</span> <span className="font-medium">{etab.adresse}</span></p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Effectif Garçons / Filles — cartes regroupées de couleurs vives distinctes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white p-5 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-blue-100 uppercase tracking-wide">Garçons</p>
            <p className="text-3xl sm:text-4xl font-bold mt-1">{stats?.garcons ?? 0}</p>
            <p className="text-xs text-blue-100 mt-0.5">
              {stats && stats.totalEleves ? Math.round((stats.garcons / stats.totalEleves) * 100) : 0}% de l&apos;effectif
            </p>
          </div>
          <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <UserCheck className="h-7 w-7" />
          </div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 text-white p-5 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-rose-100 uppercase tracking-wide">Filles</p>
            <p className="text-3xl sm:text-4xl font-bold mt-1">{stats?.filles ?? 0}</p>
            <p className="text-xs text-rose-100 mt-0.5">
              {stats && stats.totalEleves ? Math.round((stats.filles / stats.totalEleves) * 100) : 0}% de l&apos;effectif
            </p>
          </div>
          <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <Users className="h-7 w-7" />
          </div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-5 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-primary-foreground/80 uppercase tracking-wide">Total Élèves</p>
            <p className="text-3xl sm:text-4xl font-bold mt-1">{stats?.totalEleves ?? 0}</p>
            <p className="text-xs text-primary-foreground/80 mt-0.5">effectif global</p>
          </div>
          <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <Users className="h-7 w-7" />
          </div>
        </div>
      </div>

      {/* Cartes statistiques colorées */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {/* Classes — vert */}
        <div className="rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white p-5 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-emerald-100 uppercase tracking-wide">Classes</p>
            <p className="text-3xl sm:text-4xl font-bold mt-1">{stats?.nbClasses ?? 0}</p>
            <p className="text-xs text-emerald-100 mt-0.5">classes actives</p>
          </div>
          <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <School className="h-7 w-7" />
          </div>
        </div>

        {/* Enseignants — ambre/orange */}
        <div className="rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white p-5 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-amber-100 uppercase tracking-wide">Enseignants</p>
            <p className="text-3xl sm:text-4xl font-bold mt-1">{stats?.nbEnseignants ?? 0}</p>
            <p className="text-xs text-amber-100 mt-0.5">membres du personnel</p>
          </div>
          <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <GraduationCap className="h-7 w-7" />
          </div>
        </div>

        {/* Taux de présence — violet */}
        <div className="rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 text-white p-5 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-violet-100 uppercase tracking-wide">Taux de présence</p>
            <p className="text-3xl sm:text-4xl font-bold mt-1">—</p>
            <p className="text-xs text-violet-100 mt-0.5">estimation</p>
          </div>
          <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="h-7 w-7" />
          </div>
        </div>
      </div>

      {/* Répartition garçons/filles + calendrier */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              Répartition par classe ({cycleCourant})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ClassDistribution anneeCouranteId={anneeCouranteId} cycleCourant={cycleCourant} />
          </CardContent>
        </Card>

        {/* Calendrier — carte colorée bleu foncé */}
        <Card className="border-primary/30">
          <CardHeader className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-t-lg">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Calendrier
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center pt-3">
            <Calendar
              mode="single"
              className="p-0"
              classNames={{
                day_today: "bg-primary text-primary-foreground font-bold",
                day_selected: "bg-primary text-primary-foreground",
              }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Hook helper pour éviter les imports circulaires
import { useAppStore as useAppStoreSelector } from "@/lib/store";

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  subValue,
}: {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  color: "primary" | "blue" | "rose" | "emerald" | "amber" | "violet";
  subValue?: string;
}) {
  const colorMap: Record<string, { icon: string; bar: string }> = {
    primary: { icon: "bg-primary text-primary-foreground", bar: "bg-primary" },
    blue: { icon: "bg-blue-600 text-white", bar: "bg-blue-500" },
    rose: { icon: "bg-rose-500 text-white", bar: "bg-rose-400" },
    emerald: { icon: "bg-emerald-600 text-white", bar: "bg-emerald-500" },
    amber: { icon: "bg-amber-500 text-white", bar: "bg-amber-400" },
    violet: { icon: "bg-violet-600 text-white", bar: "bg-violet-500" },
  };
  const c = colorMap[color];
  return (
    <Card className="hover:shadow-lg transition-shadow card-accent">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground font-medium truncate">
              {title}
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-foreground mt-1">
              {value}
            </p>
            {subValue && (
              <p className="text-xs text-muted-foreground mt-0.5">{subValue}</p>
            )}
          </div>
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md ${c.icon}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ClassDistribution({
  anneeCouranteId,
  cycleCourant,
}: {
  anneeCouranteId: string | null;
  cycleCourant: string;
}) {
  const { data } = useQuery({
    queryKey: ["class-distribution", anneeCouranteId, cycleCourant],
    queryFn: async () => {
      const r = await fetch(
        `/api/statistiques/distribution?anneeId=${anneeCouranteId ?? ""}&cycle=${cycleCourant}`
      );
      const j = await r.json();
      return j.data as {
        nom: string;
        garcons: number;
        filles: number;
        total: number;
      }[];
    },
    enabled: !!anneeCouranteId,
  });

  if (!data || data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        Aucune classe trouvée pour ce cycle.
      </p>
    );
  }

  const max = Math.max(...data.map((d) => d.total), 1);

  return (
    <div className="space-y-3 max-h-72 overflow-y-auto custom-scroll pr-1">
      {data.map((c) => (
        <div key={c.nom} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">{c.nom}</span>
            <span className="text-muted-foreground">
              {c.total} (G{c.garcons} / F{c.filles})
            </span>
          </div>
          <div className="flex h-2.5 rounded-full overflow-hidden bg-muted">
            <div
              className="bg-blue-500"
              style={{ width: `${(c.garcons / max) * 100}%` }}
            />
            <div
              className="bg-rose-400"
              style={{ width: `${(c.filles / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
      <div className="flex items-center gap-4 pt-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-blue-500" /> Garçons
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-rose-400" /> Filles
        </span>
      </div>
    </div>
  );
}
