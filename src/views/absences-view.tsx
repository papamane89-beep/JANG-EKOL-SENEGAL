"use client";

import { useState, useMemo } from "react";
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
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Plus,
  Trash2,
  Loader2,
  Printer,
  CalendarX2,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
interface AbsenceRecord {
  id: string;
  eleveId: string;
  classeId: string;
  anneeScolaireId: string;
  date: string; // YYYY-MM-DD
  periode: string; // MATIN | APRESMIDI | JOURNEE
  type: string; // ABSENCE | RETARD
  justifiee: boolean;
  motif: string;
  nbHeures: number;
  eleve?: { id: string; prenom: string; nom: string; matricule: string };
  classe?: { id: string; nom: string };
}

interface CycleItem {
  id: string;
  nom: string;
  ordre: number;
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

type CellStatus = "P" | "A" | "R";

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

const JOURS_SEMAINE = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

function getSchoolDaysForMonth(monthStr: string) {
  if (!monthStr || !/^\d{4}-\d{2}$/.test(monthStr)) return [];
  const [year, month] = monthStr.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const days: {
    date: string;
    dow: number; // 0=dimanche, 6=samedi
    dayNum: number;
    periodes: string[]; // MATIN, APRESMIDI
  }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    const dow = date.getDay();
    if (dow === 0 || dow === 6) continue; // skip weekend
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(
      d
    ).padStart(2, "0")}`;
    let periodes: string[] = [];
    // mardi (2) / jeudi (4) = journée entière → MATIN + APRESMIDI
    if (dow === 2 || dow === 4) periodes = ["MATIN", "APRESMIDI"];
    // lundi (1), mercredi (3), vendredi (5) = demi-journée → MATIN seulement
    else if (dow === 1 || dow === 3 || dow === 5) periodes = ["MATIN"];
    days.push({ date: dateStr, dow, dayNum: d, periodes });
  }
  return days;
}

// ----------------------------------------------------------------------------
// Main View
// ----------------------------------------------------------------------------
export function AbsencesView() {
  const cycleCourant = useAppStore((s) => s.cycleCourant);
  const anneeCouranteId = useAppStore((s) => s.anneeCouranteId);

  const isRegistre = cycleCourant === "ELEMENTAIRE" || cycleCourant === "MATERNEL";

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Absences"
        description={
          isRegistre
            ? "Registre d'appel mensuel — Élémentaire / Maternel"
            : "Gestion des absences et retards — Moyen / Secondaire"
        }
        backTo="dashboard"
      />
      {isRegistre ? (
        <RegistreMensuel
          cycleCourant={cycleCourant}
          anneeCouranteId={anneeCouranteId}
        />
      ) : (
        <ListeAbsences
          cycleCourant={cycleCourant}
          anneeCouranteId={anneeCouranteId}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Composant: Registre Mensuel (ELEMENTAIRE / MATERNEL)
// ----------------------------------------------------------------------------
function RegistreMensuel({
  cycleCourant,
  anneeCouranteId,
}: {
  cycleCourant: string;
  anneeCouranteId: string | null;
}) {
  const today = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}`;

  const [selectedClasseId, setSelectedClasseId] = useState<string>("");
  const [mois, setMois] = useState<string>(defaultMonth);

  // Charger cycles et classes
  const { data: cycles } = useQuery<CycleItem[]>({
    queryKey: ["cycles"],
    queryFn: async () => {
      const r = await fetch("/api/cycles");
      const j = await r.json();
      return j.data as CycleItem[];
    },
  });

  const cycleId = useMemo(
    () => cycles?.find((c) => c.nom === cycleCourant)?.id,
    [cycles, cycleCourant]
  );

  const { data: classes, isLoading: loadingClasses } = useQuery<ClasseItem[]>({
    queryKey: ["classes", cycleCourant, anneeCouranteId],
    queryFn: async () => {
      const r = await fetch(
        `/api/classes?cycleId=${cycleId ?? ""}&anneeId=${anneeCouranteId ?? ""}`
      );
      const j = await r.json();
      return j.data as ClasseItem[];
    },
    enabled: !!cycleId && !!anneeCouranteId,
  });

  // Sélection auto de la 1ère classe
  const currentClasse = useMemo(() => {
    if (!classes || classes.length === 0) return null;
    return classes.find((c) => c.id === selectedClasseId) ?? classes[0];
  }, [classes, selectedClasseId]);

  // Charger élèves de la classe
  const { data: eleves, isLoading: loadingEleves } = useQuery<EleveItem[]>({
    queryKey: ["eleves-classe", currentClasse?.id],
    queryFn: async () => {
      const r = await fetch(
        `/api/eleves?classeId=${currentClasse?.id ?? ""}`
      );
      const j = await r.json();
      return j.data as EleveItem[];
    },
    enabled: !!currentClasse?.id,
  });

  // Charger absences du mois
  const { data: absences, isLoading: loadingAbsences } = useQuery<
    AbsenceRecord[]
  >({
    queryKey: ["absences", currentClasse?.id, anneeCouranteId, mois],
    queryFn: async () => {
      const r = await fetch(
        `/api/absences?classeId=${currentClasse?.id ?? ""}&anneeId=${
          anneeCouranteId ?? ""
        }&mois=${mois}`
      );
      const j = await r.json();
      return j.data as AbsenceRecord[];
    },
    enabled: !!currentClasse?.id && !!anneeCouranteId,
  });

  const schoolDays = useMemo(() => getSchoolDaysForMonth(mois), [mois]);

  // Construire un index: `${eleveId}|${date}|${periode}` -> record
  const absenceMap = useMemo(() => {
    const m = new Map<string, AbsenceRecord>();
    if (absences) {
      for (const a of absences) {
        m.set(`${a.eleveId}|${a.date}|${a.periode}`, a);
      }
    }
    return m;
  }, [absences]);

  const qc = useQueryClient();

  // Mutation: créer / mettre à jour une absence (P→A ou P→R ou A→R etc.)
  const upsertMutation = useMutation({
    mutationFn: async (vars: {
      eleveId: string;
      date: string;
      periode: string;
      type: "ABSENCE" | "RETARD";
    }) => {
      const r = await fetch("/api/absences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eleveId: vars.eleveId,
          classeId: currentClasse?.id,
          anneeScolaireId: anneeCouranteId,
          date: vars.date,
          periode: vars.periode,
          type: vars.type,
          justifiee: false,
          motif: "",
          nbHeures: 0,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Erreur");
      return j.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["absences", currentClasse?.id, anneeCouranteId, mois],
      });
    },
    onError: (e: any) => toast.error(e.message || "Erreur"),
  });

  // Mutation: supprimer (repasser à présent)
  const deleteMutation = useMutation({
    mutationFn: async (vars: {
      eleveId: string;
      date: string;
      periode: string;
    }) => {
      const params = new URLSearchParams({
        eleveId: vars.eleveId,
        date: vars.date,
        periode: vars.periode,
      });
      const r = await fetch(`/api/absences?${params.toString()}`, {
        method: "DELETE",
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Erreur");
      return j;
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["absences", currentClasse?.id, anneeCouranteId, mois],
      });
    },
    onError: (e: any) => toast.error(e.message || "Erreur"),
  });

  const handleCellChange = (
    eleveId: string,
    date: string,
    periode: string,
    newStatus: CellStatus
  ) => {
    if (newStatus === "P") {
      deleteMutation.mutate({ eleveId, date, periode });
    } else {
      upsertMutation.mutate({
        eleveId,
        date,
        periode,
        type: newStatus === "A" ? "ABSENCE" : "RETARD",
      });
    }
  };

  const getCellStatus = (
    eleveId: string,
    date: string,
    periode: string
  ): CellStatus => {
    const rec = absenceMap.get(`${eleveId}|${date}|${periode}`);
    if (!rec) return "P";
    return rec.type === "RETARD" ? "R" : "A";
  };

  // Stats par élève
  const totalSchoolDays = schoolDays.length;
  const studentStats = (() => {
    if (!eleves) return new Map<string, { abs: number; ret: number; rate: number }>();
    const m = new Map<string, { abs: number; ret: number; rate: number }>();
    for (const e of eleves) {
      let abs = 0;
      let ret = 0;
      const absentDays = new Set<string>();
      for (const d of schoolDays) {
        for (const p of d.periodes) {
          const s = getCellStatus(e.id, d.date, p);
          if (s === "A") {
            abs++;
            absentDays.add(d.date);
          } else if (s === "R") {
            ret++;
          }
        }
      }
      const rate = totalSchoolDays > 0 ? (absentDays.size / totalSchoolDays) * 100 : 0;
      m.set(e.id, { abs, ret, rate });
    }
    return m;
  })();

  const loading =
    loadingClasses || loadingEleves || loadingAbsences;

  if (!anneeCouranteId) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Veuillez sélectionner une année scolaire dans la barre supérieure.
        </CardContent>
      </Card>
    );
  }

  if (loadingClasses) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!classes || classes.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <CalendarX2 className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Aucune classe trouvée pour ce cycle. Créez d&apos;abord des classes
            dans le module « Classes ».
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs font-medium">Classe</Label>
              <Select
                value={currentClasse?.id ?? ""}
                onValueChange={setSelectedClasseId}
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
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs font-medium">Mois</Label>
              <Input
                type="month"
                value={mois}
                onChange={(e) => setMois(e.target.value)}
                className="w-full"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => window.print()}
              className="gap-2"
            >
              <Printer className="h-4 w-4" />
              Imprimer le registre
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Légende */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground print:hidden">
        <span className="font-medium">Légende :</span>
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
          P — Présent
        </Badge>
        <Badge className="bg-rose-100 text-rose-700 border-rose-200">
          A — Absent
        </Badge>
        <Badge className="bg-amber-100 text-amber-700 border-amber-200">
          R — Retard
        </Badge>
        <span className="italic">
          Lundi / Mercredi / Vendredi : demi-journée (matin). Mardi / Jeudi :
          journée entière.
        </span>
      </div>

      {/* Registre */}
      <Card className="print:shadow-none print:border-0">
        <CardHeader className="pb-3 print:hidden">
          <CardTitle className="text-base">
            Registre d&apos;appel — {currentClasse?.nom} — {mois}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 print:p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !eleves || eleves.length === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center">
              Aucun élève dans cette classe.
            </p>
          ) : (
            <div className="overflow-x-auto custom-scroll max-h-[70vh] print:max-h-none print:overflow-visible">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <TableRow>
                    <TableHead className="sticky left-0 z-20 bg-card border-r border-border min-w-[180px] sm:min-w-[220px]">
                      Élève
                    </TableHead>
                    {schoolDays.map((d) =>
                      d.periodes.map((p, idx) => (
                        <TableHead
                          key={`${d.date}-${p}`}
                          className={cn(
                            "text-center min-w-[36px] px-1 border-r border-border",
                            idx === 0 && "border-l",
                            d.periodes.length > 1 && idx === 1 && "bg-muted/40"
                          )}
                          title={`${JOURS_SEMAINE[d.dow]} ${d.dayNum} — ${p}`}
                        >
                          <div className="flex flex-col items-center">
                            <span className="font-semibold">{d.dayNum}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {JOURS_SEMAINE[d.dow][0]}
                              {d.periodes.length > 1
                                ? p === "MATIN"
                                  ? " M"
                                  : " A"
                                : ""}
                            </span>
                          </div>
                        </TableHead>
                      ))
                    )}
                    <TableHead className="sticky right-0 z-20 bg-card text-center min-w-[80px] border-l border-border">
                      Taux
                    </TableHead>
                  </TableRow>
                </thead>
                <tbody>
                  {eleves.map((e) => {
                    const st = studentStats.get(e.id) ?? {
                      abs: 0,
                      ret: 0,
                      rate: 0,
                    };
                    return (
                      <TableRow key={e.id} className="hover:bg-transparent">
                        <TableCell className="sticky left-0 z-10 bg-card border-r border-border font-medium text-foreground">
                          <div className="flex flex-col">
                            <span className="truncate">
                              {e.prenom} {e.nom}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {e.matricule || "—"}
                            </span>
                          </div>
                        </TableCell>
                        {schoolDays.map((d) =>
                          d.periodes.map((p, idx) => {
                            const status = getCellStatus(e.id, d.date, p);
                            return (
                              <TableCell
                                key={`${d.date}-${p}`}
                                className={cn(
                                  "p-1 text-center border-r border-border",
                                  idx === 0 && "border-l",
                                  d.periodes.length > 1 && idx === 1 && "bg-muted/30"
                                )}
                              >
                                <AttendanceCell
                                  status={status}
                                  onChange={(s) =>
                                    handleCellChange(e.id, d.date, p, s)
                                  }
                                />
                              </TableCell>
                            );
                          })
                        )}
                        <TableCell className="sticky right-0 z-10 bg-card border-l border-border text-center">
                          <span
                            className={cn(
                              "text-xs font-bold",
                              st.rate >= 25
                                ? "text-rose-600"
                                : st.rate >= 10
                                ? "text-amber-600"
                                : "text-emerald-600"
                            )}
                          >
                            {st.rate.toFixed(1)}%
                          </span>
                          <div className="text-[10px] text-muted-foreground">
                            {st.abs} abs
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="px-4 py-3 text-xs text-muted-foreground border-t border-border print:hidden">
            <p>
              <strong>Note :</strong> Le taux d&apos;absence mensuel est calculé
              en jours (au moins une absence sur la journée). Il n&apos;apparaît
              pas sur les bulletins scolaires.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Cellule d&apos;appel — bouton + dropdown P/A/R
function AttendanceCell({
  status,
  onChange,
}: {
  status: CellStatus;
  onChange: (s: CellStatus) => void;
}) {
  const colors: Record<CellStatus, string> = {
    P: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200",
    A: "bg-rose-100 text-rose-700 hover:bg-rose-200 border-rose-200",
    R: "bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200",
  };
  const icons: Record<CellStatus, React.ReactNode> = {
    P: <CheckCircle2 className="h-3 w-3" />,
    A: <XCircle className="h-3 w-3" />,
    R: <Clock className="h-3 w-3" />,
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "h-7 w-7 rounded-md border text-[11px] font-bold flex items-center justify-center gap-0.5 transition print:hidden",
            colors[status]
          )}
          aria-label={`Statut: ${status}`}
        >
          {status}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="min-w-[140px]">
        <DropdownMenuItem onClick={() => onChange("P")}>
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>Présent (P)</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange("A")}>
          <XCircle className="h-4 w-4 text-rose-600" />
          <span>Absent (A)</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange("R")}>
          <Clock className="h-4 w-4 text-amber-600" />
          <span>Retard (R)</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ----------------------------------------------------------------------------
// Composant: Liste des Absences (MOYEN / SECONDAIRE)
// ----------------------------------------------------------------------------
function ListeAbsences({
  cycleCourant,
  anneeCouranteId,
}: {
  cycleCourant: string;
  anneeCouranteId: string | null;
}) {
  const [selectedClasseId, setSelectedClasseId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: cycles } = useQuery<CycleItem[]>({
    queryKey: ["cycles"],
    queryFn: async () => {
      const r = await fetch("/api/cycles");
      const j = await r.json();
      return j.data as CycleItem[];
    },
  });

  const cycleId = useMemo(
    () => cycles?.find((c) => c.nom === cycleCourant)?.id,
    [cycles, cycleCourant]
  );

  const { data: classes } = useQuery<ClasseItem[]>({
    queryKey: ["classes", cycleCourant, anneeCouranteId],
    queryFn: async () => {
      const r = await fetch(
        `/api/classes?cycleId=${cycleId ?? ""}&anneeId=${anneeCouranteId ?? ""}`
      );
      const j = await r.json();
      return j.data as ClasseItem[];
    },
    enabled: !!cycleId && !!anneeCouranteId,
  });

  const { data: absences, isLoading } = useQuery<AbsenceRecord[]>({
    queryKey: ["absences", selectedClasseId || "all", anneeCouranteId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedClasseId) params.set("classeId", selectedClasseId);
      if (anneeCouranteId) params.set("anneeId", anneeCouranteId);
      const r = await fetch(`/api/absences?${params.toString()}`);
      const j = await r.json();
      return j.data as AbsenceRecord[];
    },
    enabled: !!anneeCouranteId,
  });

  const filtered = useMemo(() => {
    if (!absences) return [];
    const s = search.trim().toLowerCase();
    if (!s) return absences;
    return absences.filter((a) => {
      const full = `${a.eleve?.prenom ?? ""} ${a.eleve?.nom ?? ""}`.toLowerCase();
      return full.includes(s);
    });
  }, [absences, search]);

  if (!anneeCouranteId) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Veuillez sélectionner une année scolaire dans la barre supérieure.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs font-medium">Classe</Label>
              <Select
                value={selectedClasseId}
                onValueChange={setSelectedClasseId}
              >
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
              <Label className="text-xs font-medium">Rechercher un élève</Label>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nom ou prénom..."
                className="w-full"
              />
            </div>
            <CreateAbsenceDialog
              open={dialogOpen}
              onOpenChange={setDialogOpen}
              classes={classes ?? []}
              anneeCouranteId={anneeCouranteId}
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center">
              Aucune absence enregistrée.
            </p>
          ) : (
            <div className="overflow-x-auto custom-scroll max-h-[65vh]">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow>
                    <TableHead>Élève</TableHead>
                    <TableHead>Classe</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Période</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-center">Heures</TableHead>
                    <TableHead className="text-center">Justifiée</TableHead>
                    <TableHead>Motif</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((a) => (
                    <AbsenceRow key={a.id} absence={a} />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AbsenceRow({ absence }: { absence: AbsenceRecord }) {
  const qc = useQueryClient();

  const toggleJustif = useMutation({
    mutationFn: async (val: boolean) => {
      const r = await fetch("/api/absences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: absence.id,
          eleveId: absence.eleveId,
          classeId: absence.classeId,
          anneeScolaireId: absence.anneeScolaireId,
          date: absence.date,
          periode: absence.periode,
          type: absence.type,
          justifiee: val,
          motif: absence.motif,
          nbHeures: absence.nbHeures,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      return j.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["absences"] });
      toast.success("Statut justifié mis à jour");
    },
    onError: (e: any) => toast.error(e.message || "Erreur"),
  });

  const del = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/absences?id=${absence.id}`, {
        method: "DELETE",
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      return j;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["absences"] });
      toast.success("Absence supprimée");
    },
    onError: (e: any) => toast.error(e.message || "Erreur"),
  });

  return (
    <TableRow>
      <TableCell className="font-medium">
        {absence.eleve ? `${absence.eleve.prenom} ${absence.eleve.nom}` : "—"}
      </TableCell>
      <TableCell>
        <Badge variant="outline">{absence.classe?.nom ?? "—"}</Badge>
      </TableCell>
      <TableCell>
        {absence.date
          ? new Date(absence.date + "T00:00:00").toLocaleDateString("fr-FR")
          : "—"}
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className="text-[10px]">
          {absence.periode === "MATIN"
            ? "Matin"
            : absence.periode === "APRESMIDI"
            ? "Après-midi"
            : "Journée"}
        </Badge>
      </TableCell>
      <TableCell>
        {absence.type === "RETARD" ? (
          <Badge className="bg-amber-100 text-amber-700 border-amber-200">
            Retard
          </Badge>
        ) : (
          <Badge className="bg-rose-100 text-rose-700 border-rose-200">
            Absence
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-center font-semibold">
        {absence.nbHeures}h
      </TableCell>
      <TableCell className="text-center">
        <Switch
          checked={absence.justifiee}
          onCheckedChange={(v) => toggleJustif.mutate(v)}
          disabled={toggleJustif.isPending}
          aria-label="Justifiée"
        />
      </TableCell>
      <TableCell className="max-w-[200px] truncate text-muted-foreground">
        {absence.motif || "—"}
      </TableCell>
      <TableCell className="text-right">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            if (
              confirm(
                "Supprimer cette absence ? Les heures seront retirées du bulletin."
              )
            ) {
              del.mutate();
            }
          }}
          disabled={del.isPending}
          className="text-rose-600 hover:text-rose-700"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

// ----------------------------------------------------------------------------
// Dialog de création d&apos;absence (MOYEN / SECONDAIRE)
// ----------------------------------------------------------------------------
function CreateAbsenceDialog({
  open,
  onOpenChange,
  classes,
  anneeCouranteId,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  classes: ClasseItem[];
  anneeCouranteId: string;
}) {
  const [classeId, setClasseId] = useState("");
  const [eleveId, setEleveId] = useState("");
  const [date, setDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [periode, setPeriode] = useState("MATIN");
  const [type, setType] = useState("ABSENCE");
  const [nbHeures, setNbHeures] = useState("2");
  const [justifiee, setJustifiee] = useState(false);
  const [motif, setMotif] = useState("");

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
      const r = await fetch("/api/absences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eleveId,
          classeId,
          anneeScolaireId: anneeCouranteId,
          date,
          periode,
          type,
          justifiee,
          motif,
          nbHeures: Number(nbHeures) || 0,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Erreur");
      return j.data;
    },
    onSuccess: () => {
      toast.success("Absence enregistrée");
      qc.invalidateQueries({ queryKey: ["absences"] });
      onOpenChange(false);
      // reset
      setEleveId("");
      setMotif("");
      setJustifiee(false);
      setNbHeures("2");
    },
    onError: (e: any) => toast.error(e.message || "Erreur"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eleveId || !classeId || !date) {
      toast.error("Élève, classe et date requis");
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(b) => {
        onOpenChange(b);
      }}
    >
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nouvelle absence
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto custom-scroll">
        <DialogHeader>
          <DialogTitle>Enregistrer une absence / retard</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Classe</Label>
            <Select value={classeId} onValueChange={(v) => { setClasseId(v); setEleveId(""); }}>
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
            <Select value={eleveId} onValueChange={setEleveId} disabled={!classeId}>
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
              <Label className="text-xs font-medium">Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Période</Label>
              <Select value={periode} onValueChange={setPeriode}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MATIN">Matin</SelectItem>
                  <SelectItem value="APRESMIDI">Après-midi</SelectItem>
                  <SelectItem value="JOURNEE">Journée</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ABSENCE">Absence</SelectItem>
                  <SelectItem value="RETARD">Retard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Nb d&apos;heures</Label>
              <Input
                type="number"
                min={0}
                max={12}
                value={nbHeures}
                onChange={(e) => setNbHeures(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Motif</Label>
            <Input
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Maladie, rendez-vous administratif..."
            />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Absence justifiée</p>
              <p className="text-xs text-muted-foreground">
                Cocher si justificatif fourni
              </p>
            </div>
            <Switch checked={justifiee} onCheckedChange={setJustifiee} />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
