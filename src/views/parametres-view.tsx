"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import { Save, Building2, Upload, Stamp } from "lucide-react";
import { toast } from "sonner";
import { IA_LIST, getIEFList } from "@/lib/data";
import { EtabLogo } from "@/components/official-logos";

interface Etab {
  id: string;
  nom: string;
  typeEcole: string;
  ia: string;
  ief: string;
  telephone: string;
  email: string;
  adresse: string;
  directeurNom: string;
  logoPath?: string | null;
  cachetPath?: string | null;
  signaturePath?: string | null;
}

export function ParametresView() {
  const qc = useQueryClient();
  const { data: etab, isLoading } = useQuery({
    queryKey: ["etablissement"],
    queryFn: async () => {
      const r = await fetch("/api/etablissement");
      const j = await r.json();
      return j.data as Etab | null;
    },
  });

  const [form, setForm] = useState<Etab | null>(null);

  // Synchroniser form avec etab (dès que les données arrivent)
  useEffect(() => {
    if (etab) setForm(etab);
  }, [etab]);

  const saveMutation = useMutation({
    mutationFn: async (body: Etab) => {
      const r = await fetch("/api/etablissement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      return j;
    },
    onSuccess: () => {
      toast.success("Paramètres enregistrés");
      qc.invalidateQueries({ queryKey: ["etablissement"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const iefList = form?.ia ? getIEFList(form.ia) : [];

  // Upload fichier
  const uploadFile = async (
    file: File,
    field: "logoPath" | "cachetPath" | "signaturePath"
  ) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("field", field);
    try {
      const r = await fetch("/api/etablissement/upload", {
        method: "POST",
        body: fd,
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setForm((f) => (f ? { ...f, [field]: j.data } : f));
      qc.invalidateQueries({ queryKey: ["etablissement"] });
      toast.success("Fichier importé");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <PageHeader title="Paramètres Établissement" backTo="dashboard" />
        <p className="text-sm text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  // Si pas d'établissement en base, créer un formulaire vierge
  if (!form) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <PageHeader
          title="Paramètres Établissement"
          description="Configurez votre établissement"
          backTo="dashboard"
          actions={
            <Button
              onClick={() =>
                setForm({
                  id: "",
                  nom: "",
                  typeEcole: "PUBLIQUE",
                  ia: "Dakar",
                  ief: "Dakar Plateau",
                  telephone: "",
                  email: "",
                  adresse: "",
                  directeurNom: "",
                  logoPath: null,
                  cachetPath: null,
                  signaturePath: null,
                })
              }
            >
              <Save className="h-4 w-4 mr-1" />
              Créer la fiche établissement
            </Button>
          }
        />
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Aucun établissement configuré. Cliquez sur « Créer la fiche établissement » pour commencer.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <PageHeader
        title="Paramètres Établissement"
        description="Configuration de l'école et des informations officielles"
        backTo="dashboard"
        actions={
          <Button
            onClick={() => saveMutation.mutate(form)}
            disabled={saveMutation.isPending}
          >
            <Save className="h-4 w-4 mr-1" />
            Enregistrer
          </Button>
        }
      />

      <div className="space-y-5">
        {/* Informations générales */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-5 w-5 text-primary" />
              Informations générales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nom de l&apos;école *</Label>
              <Input
                value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
                placeholder="Ex: École élémentaire JANG EKOL"
              />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Type d&apos;école</p>
                <p className="text-xs text-muted-foreground">
                  Les paiements sont masqués pour les écoles publiques
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm">Publique</span>
                <Switch
                  checked={form.typeEcole === "PRIVEE"}
                  onCheckedChange={(v) =>
                    setForm({ ...form, typeEcole: v ? "PRIVEE" : "PUBLIQUE" })
                  }
                />
                <span className="text-sm">Privée</span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Inspection d&apos;Académie (I.A)</Label>
                <Select
                  value={form.ia}
                  onValueChange={(v) =>
                    setForm({ ...form, ia: v, ief: getIEFList(v)[0] ?? "" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner l'IA" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {IA_LIST.map((ia) => (
                      <SelectItem key={ia} value={ia}>
                        {ia}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Inspection de l&apos;Éducation et de la Formation (I.E.F)</Label>
                <Select
                  value={form.ief}
                  onValueChange={(v) => setForm({ ...form, ief: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner l'IEF" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {iefList.map((ief) => (
                      <SelectItem key={ief} value={ief}>
                        {ief}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Téléphone</Label>
                <Input
                  value={form.telephone}
                  onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                  placeholder="+221 33 ..."
                />
              </div>
              <div className="space-y-2">
                <Label>Adresse mail</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="ecole@email.sn"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Adresse</Label>
              <Textarea
                value={form.adresse}
                onChange={(e) => setForm({ ...form, adresse: e.target.value })}
                placeholder="Adresse complète de l'école"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Nom du Directeur / de la Directrice</Label>
              <Input
                value={form.directeurNom}
                onChange={(e) => setForm({ ...form, directeurNom: e.target.value })}
                placeholder="Prénom et Nom du directeur"
              />
            </div>
          </CardContent>
        </Card>

        {/* Logo et cachet */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Stamp className="h-5 w-5 text-primary" />
              Logo, Cachet et Signature
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Logo */}
              <div className="space-y-2">
                <Label>Logo de l&apos;école</Label>
                <div className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-4">
                  <EtabLogo className="h-20 w-20 rounded-lg" path={form.logoPath} />
                  <label className="cursor-pointer">
                    <span className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      <Upload className="h-3 w-3" />
                      Importer logo
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadFile(f, "logoPath");
                      }}
                    />
                  </label>
                </div>
              </div>
              {/* Cachet */}
              <div className="space-y-2">
                <Label>Cachet du Directeur</Label>
                <div className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-4">
                  {form.cachetPath ? (
                    <img
                      src={form.cachetPath}
                      alt="Cachet"
                      className="h-20 w-20 object-contain"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                      <span className="text-[10px] text-muted-foreground text-center px-2">
                        Cachet
                      </span>
                    </div>
                  )}
                  <label className="cursor-pointer">
                    <span className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      <Upload className="h-3 w-3" />
                      Importer cachet
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadFile(f, "cachetPath");
                      }}
                    />
                  </label>
                </div>
              </div>
              {/* Signature */}
              <div className="space-y-2">
                <Label>Signature du Directeur</Label>
                <div className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-4">
                  {form.signaturePath ? (
                    <img
                      src={form.signaturePath}
                      alt="Signature"
                      className="h-20 w-20 object-contain"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                      <span className="text-[10px] text-muted-foreground text-center px-2">
                        Signature
                      </span>
                    </div>
                  )}
                  <label className="cursor-pointer">
                    <span className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      <Upload className="h-3 w-3" />
                      Importer signature
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadFile(f, "signaturePath");
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
