"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Printer, FileText, CalendarClock } from "lucide-react";
import { useAppStore } from "@/lib/store";
import {
  DrapeauSenegal,
  MinistereLogo,
} from "@/components/official-logos";

interface Classe {
  id: string;
  nom: string;
  cycle: { nom: string };
}

interface Eleve {
  id: string;
  prenom: string;
  nom: string;
  sexe: string;
  dateNaissance: string;
  lieuNaissance: string;
  classeId: string | null;
  classe?: { nom: string } | null;
  anneeScolaireId: string;
  anneeScolaire?: { libelle: string } | null;
}

export function DocumentsView() {
  const anneeCouranteId = useAppStore((s) => s.anneeCouranteId);
  const cycleCourant = useAppStore((s) => s.cycleCourant);
  const [classeId, setClasseId] = useState("");
  const [eleveId, setEleveId] = useState("");
  const [billetType, setBilletType] = useState<"ABSENCE" | "RETARD">("ABSENCE");
  const [dateDoc, setDateDoc] = useState(new Date().toISOString().slice(0, 10));
  const [motif, setMotif] = useState("");
  const [duree, setDuree] = useState("");

  const { data: etab } = useQuery({
    queryKey: ["etablissement"],
    queryFn: async () => {
      const r = await fetch("/api/etablissement");
      const j = await r.json();
      return j.data;
    },
  });

  const { data: classes } = useQuery({
    queryKey: ["classes-doc", anneeCouranteId, cycleCourant],
    queryFn: async () => {
      const r = await fetch(
        `/api/classes?anneeId=${anneeCouranteId ?? ""}&cycle=${cycleCourant}`
      );
      const j = await r.json();
      return j.data as Classe[];
    },
    enabled: !!anneeCouranteId,
  });

  const currentClasseId = classeId || classes?.[0]?.id || "";
  if (classes && classes.length > 0 && !classeId) {
    setClasseId(classes[0].id);
  }

  const { data: eleves } = useQuery({
    queryKey: ["eleves-doc", currentClasseId, anneeCouranteId],
    queryFn: async () => {
      const r = await fetch(
        `/api/eleves?classeId=${currentClasseId}&anneeId=${anneeCouranteId ?? ""}`
      );
      const j = await r.json();
      return j.data as Eleve[];
    },
    enabled: !!currentClasseId && !!anneeCouranteId,
  });

  const eleve = eleves?.find((e) => e.id === eleveId) ?? null;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <PageHeader
        title="Documents officiels"
        description="Certificats de scolarité, billets d'absence et de retard"
        backTo="dashboard"
      />

      <Tabs defaultValue="certificat">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="certificat" className="gap-1.5">
            <FileText className="h-4 w-4" />
            Certificat de scolarité
          </TabsTrigger>
          <TabsTrigger value="billet" className="gap-1.5">
            <CalendarClock className="h-4 w-4" />
            Billet d&apos;absence / retard
          </TabsTrigger>
        </TabsList>

        {/* Certificat de scolarité */}
        <TabsContent value="certificat">
          <Card className="mb-4 no-print">
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Classe</Label>
                  <Select value={currentClasseId} onValueChange={(v) => { setClasseId(v); setEleveId(""); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {classes?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Élève</Label>
                  <Select value={eleveId} onValueChange={setEleveId}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner un élève" /></SelectTrigger>
                    <SelectContent>
                      {eleves?.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.prenom} {e.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => window.print()} disabled={!eleve}>
                  <Printer className="h-4 w-4 mr-1" />
                  Imprimer le certificat
                </Button>
              </div>
            </CardContent>
          </Card>

          {eleve && (
            <CertificatScolarite
              eleve={eleve}
              etab={etab}
              dateDoc={dateDoc}
            />
          )}
        </TabsContent>

        {/* Billet d'absence / retard */}
        <TabsContent value="billet">
          <Card className="mb-4 no-print">
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Classe</Label>
                  <Select value={currentClasseId} onValueChange={(v) => { setClasseId(v); setEleveId(""); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {classes?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Élève</Label>
                  <Select value={eleveId} onValueChange={setEleveId}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner un élève" /></SelectTrigger>
                    <SelectContent>
                      {eleves?.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.prenom} {e.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Type de billet</Label>
                  <Select
                    value={billetType}
                    onValueChange={(v) => setBilletType(v as "ABSENCE" | "RETARD")}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ABSENCE">Billet d&apos;absence</SelectItem>
                      <SelectItem value="RETARD">Billet de retard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={dateDoc}
                    onChange={(e) => setDateDoc(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Durée (heures / jours)</Label>
                  <Input
                    value={duree}
                    onChange={(e) => setDuree(e.target.value)}
                    placeholder="Ex: 2 heures, 1 journée..."
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Motif</Label>
                  <Textarea
                    value={motif}
                    onChange={(e) => setMotif(e.target.value)}
                    placeholder="Motif de l'absence ou du retard"
                    rows={2}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => window.print()} disabled={!eleve}>
                  <Printer className="h-4 w-4 mr-1" />
                  Imprimer le billet
                </Button>
              </div>
            </CardContent>
          </Card>

          {eleve && (
            <BilletAbsence
              eleve={eleve}
              etab={etab}
              type={billetType}
              dateDoc={dateDoc}
              motif={motif}
              duree={duree}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OfficialHeader({ etab }: { etab: any }) {
  return (
    <div className="flex items-center gap-4 border-b-2 border-primary pb-3 mb-4">
      <DrapeauSenegal className="h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0" />
      <div className="flex-1 text-center">
        <p className="font-bold text-sm sm:text-base">République du Sénégal</p>
        <p className="text-[11px] sm:text-xs text-primary italic">
          Un peuple — Un but — Une foi
        </p>
        <p className="font-semibold text-xs sm:text-sm mt-0.5">
          Ministère de l&apos;Éducation Nationale
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Inspection d&apos;Académie de <span className="font-semibold text-foreground">{etab?.ia ?? "..."}</span>
          {" — "}
          I.E.F de <span className="font-semibold text-foreground">{etab?.ief ?? "..."}</span>
        </p>
      </div>
      <MinistereLogo className="h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0" />
    </div>
  );
}

function formatDateFr(d: string) {
  if (!d) return "……";
  try {
    const date = new Date(d);
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

function CertificatScolarite({
  eleve,
  etab,
  dateDoc,
}: {
  eleve: Eleve;
  etab: any;
  dateDoc: string;
}) {
  const classeNom = eleve.classe?.nom ?? "—";
  const anneeLib = eleve.anneeScolaire?.libelle ?? "—";
  return (
    <div className="print-area bg-white border border-border rounded-lg p-6 sm:p-10 shadow-sm">
      <OfficialHeader etab={etab} />
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold underline uppercase tracking-wide">
          Certificat de scolarité
        </h2>
      </div>
      <div className="text-sm sm:text-base leading-relaxed text-justify space-y-3 px-2">
        <p>
          Je soussigné(e), <strong>{etab?.directeurNom || "Le Directeur / La Directrice"}</strong>,
          Directeur / Directrice de l&apos;école <strong>{etab?.nom ?? "..."}</strong>,
          certifie que l&apos;élève :
        </p>
        <p className="text-center font-bold text-lg my-3">
          {eleve.prenom} {eleve.nom}
        </p>
        <p>
          Né(e) le <strong>{formatDateFr(eleve.dateNaissance)}</strong> à{" "}
          <strong>{eleve.lieuNaissance || "..."}</strong>, de sexe{" "}
          <strong>{eleve.sexe === "M" ? "masculin" : "féminin"}</strong>,
          est régulièrement inscrit(e) à l&apos;école <strong>{etab?.nom ?? "..."}</strong>{" "}
          pour l&apos;année scolaire <strong>{anneeLib}</strong>, en classe de{" "}
          <strong>{classeNom}</strong>.
        </p>
        <p>
          En foi de quoi le présent certificat lui est délivré pour servir et
          valoir ce que de droit.
        </p>
      </div>
      <div className="flex items-end justify-between mt-10 text-sm">
        <div className="text-center">
          <p className="text-muted-foreground">Fait à {etab?.ia ?? "..."}, le</p>
          <p className="font-semibold">{formatDateFr(dateDoc)}</p>
        </div>
        <div className="text-center">
          <div className="h-20 w-40 mx-auto border-b border-dashed border-foreground/40" />
          <p className="mt-1 font-semibold">Le Directeur / La Directrice</p>
        </div>
      </div>
    </div>
  );
}

function BilletAbsence({
  eleve,
  etab,
  type,
  dateDoc,
  motif,
  duree,
}: {
  eleve: Eleve;
  etab: any;
  type: "ABSENCE" | "RETARD";
  dateDoc: string;
  motif: string;
  duree: string;
}) {
  const classeNom = eleve.classe?.nom ?? "—";
  return (
    <div className="print-area bg-white border border-border rounded-lg p-6 sm:p-10 shadow-sm">
      <OfficialHeader etab={etab} />
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold underline uppercase tracking-wide">
          {type === "ABSENCE" ? "Billet d'absence" : "Billet de retard"}
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          École {etab?.nom ?? "..."} — Classe {classeNom}
        </p>
      </div>
      <div className="border-2 border-primary/30 rounded-lg p-4 space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <p>
            <span className="text-muted-foreground">Élève :</span>{" "}
            <strong>{eleve.prenom} {eleve.nom}</strong>
          </p>
          <p>
            <span className="text-muted-foreground">Date :</span>{" "}
            <strong>{formatDateFr(dateDoc)}</strong>
          </p>
          <p>
            <span className="text-muted-foreground">Durée :</span>{" "}
            <strong>{duree || "…"}</strong>
          </p>
          <p>
            <span className="text-muted-foreground">Classe :</span>{" "}
            <strong>{classeNom}</strong>
          </p>
        </div>
        <div>
          <p className="text-muted-foreground mb-1">Motif :</p>
          <div className="min-h-[60px] border border-dashed border-border rounded p-2">
            {motif || <span className="text-muted-foreground italic">À compléter…</span>}
          </div>
        </div>
      </div>
      <div className="flex items-end justify-between mt-8 text-sm">
        <div className="text-center">
          <div className="h-16 w-32 border-b border-dashed border-foreground/40" />
          <p className="mt-1 font-semibold">Signature du Parent</p>
        </div>
        <div className="text-center">
          <div className="h-16 w-32 border-b border-dashed border-foreground/40" />
          <p className="mt-1 font-semibold">Visa du Directeur</p>
        </div>
      </div>
    </div>
  );
}
