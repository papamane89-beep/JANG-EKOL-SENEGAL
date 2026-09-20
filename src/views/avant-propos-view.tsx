"use client";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PrintOfficialHeader } from "@/components/print-official-header";
import { Button } from "@/components/ui/button";
import {
  BookOpen, Users, School, GraduationCap, ClipboardList, FileText,
  CalendarX2, BarChart3, Wallet, Settings, CalendarDays, Layers, FileBadge,
  Mail, ShieldCheck, Database, WifiOff, Printer, Languages, MessageSquare,
} from "lucide-react";
import { useAppStore } from "@/lib/store";

const CONTACT_EMAIL = "papamane89@gmail.com";

const MODULES = [
  { icon: Settings, label: "Paramètres Établissement", desc: "Configuration de l'école, IA/IEF, logo, cachet et signature du directeur." },
  { icon: Layers, label: "Cycles", desc: "Maternel, Élémentaire, Moyen, Secondaire — avec modes d'évaluation différenciés." },
  { icon: CalendarDays, label: "Année Scolaire", desc: "Gestion des années scolaires, périodes actives et transfert de données." },
  { icon: School, label: "Classes", desc: "Création des classes par étapes (CI/CP, CE1/CE2, CM1/CM2), capacités et salles." },
  { icon: Users, label: "Élèves", desc: "Inscription, matricule automatique, répartition automatique vers les classes." },
  { icon: GraduationCap, label: "Enseignants", desc: "Personnel enseignant avec affectation des classes et matières." },
  { icon: BookOpen, label: "Matières", desc: "Domaines et activités avec barèmes configurables par étape." },
  { icon: ClipboardList, label: "Évaluations", desc: "Saisie des notes, tableau de synthèse, proposition de passage, bulletins." },
  { icon: CalendarX2, label: "Absences", desc: "Registre d'appel mensuel (élémentaire) et heures d'absence (moyen/secondaire)." },
  { icon: BarChart3, label: "Statistiques", desc: "Taux de réussite par classe et par domaine, garçons/filles." },
  { icon: FileBadge, label: "Documents officiels", desc: "Certificats de scolarité, billets d'absence et de retard imprimables." },
  { icon: Wallet, label: "Gestion des paiements", desc: "Reçus de paiement (école privée), 2 reçus par page A4." },
];

export function AvantProposView() {
  const setView = useAppStore((s) => s.setView);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Avant-propos"
        description="Présentation de l'application JANG EKOL SENEGAL"
        backTo="dashboard"
        actions={
          <Button variant="outline" size="sm" onClick={() => setView("dashboard")}>
            Accéder au tableau de bord
          </Button>
        }
      />

      <Card className="mb-5">
        <CardContent className="p-4 sm:p-5">
          <PrintOfficialHeader />
        </CardContent>
      </Card>

      <Card className="mb-5 card-accent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="h-5 w-5 text-primary" />
            Présentation de l&apos;application
          </CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-foreground/90 space-y-3 leading-relaxed">
          <p>
            <strong>JANG EKOL SENEGAL</strong> est une application de gestion
            scolaire complète, conçue pour répondre aux besoins spécifiques du
            système éducatif sénégalais. Elle s&apos;adresse aux directeurs
            d&apos;école, aux enseignants et à l&apos;administration pour
            centraliser et automatiser l&apos;ensemble des tâches liées à la
            gestion d&apos;un établissement scolaire.
          </p>
          <p>
            Cette application permet de gérer efficacement les{" "}
            <strong>inscriptions des élèves</strong>, la{" "}
            <strong>création des classes par étapes</strong>, l&apos;organisation
            du <strong>corps enseignant</strong>, la{" "}
            <strong>saisie des notes</strong> avec des barèmes conformes aux
            exigences pédagogiques (langue, mathématiques, ESVS, EPSA, arabe,
            anglais), la <strong>génération automatique des bulletins</strong>,
            le <strong>suivi des absences</strong>, les{" "}
            <strong>statistiques de réussite</strong> ainsi que la{" "}
            <strong>gestion des paiements</strong> pour les écoles privées.
          </p>
          <p>
            Conçue pour fonctionner <strong>hors-ligne</strong> avec une base de
            données locale, elle garantit la disponibilité permanente des
            informations et la confidentialité des données scolaires, sans
            dépendre d&apos;une connexion internet.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <Card className="card-accent">
          <CardContent className="p-4 text-center">
            <div className="h-11 w-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2">
              <WifiOff className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-sm">Fonctionnement hors-ligne</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Base de données locale SQLite, aucune connexion internet requise.
            </p>
          </CardContent>
        </Card>
        <Card className="card-accent">
          <CardContent className="p-4 text-center">
            <div className="h-11 w-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mx-auto mb-2">
              <Database className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-sm">Données centralisées</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Élèves, classes, enseignants, notes, bulletins et statistiques réunis.
            </p>
          </CardContent>
        </Card>
        <Card className="card-accent">
          <CardContent className="p-4 text-center">
            <div className="h-11 w-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-2">
              <Printer className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-sm">Documents officiels</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Bulletins, certificats, reçus et listes imprimables avec en-tête officielle.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Layers className="h-5 w-5 text-primary" />
            Modules de l&apos;application
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {MODULES.map((m) => {
              const Icon = m.icon;
              return (
                <div key={m.label} className="flex items-start gap-3 rounded-lg border border-border p-3 hover:bg-muted/40 transition-colors">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-sm">{m.label}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{m.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-5 bg-primary/5 border-primary/30">
        <CardContent className="p-4 flex items-start gap-3">
          <ShieldCheck className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-foreground">Conformité au système éducatif sénégalais</p>
            <p className="text-muted-foreground mt-1">
              L&apos;application respecte les structures officielles : Inspection
              d&apos;Académie (IA), Inspection de l&apos;Éducation et de la Formation
              (IEF), cycles d&apos;enseignement, barèmes d&apos;évaluation par étape, et
              modèles officiels de bulletins et de statistiques.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Languages className="h-5 w-5 text-primary" />
            Langues et communication
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-foreground/90 leading-relaxed">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-2 mb-1">
                <Languages className="h-4 w-4 text-primary" />
                <h4 className="font-semibold">Langue et Compétence (LC)</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Le domaine LC (Ressources et Compétences) couvre l&apos;enseignement
                de la langue française — lecture, expression écrite et orale —
                socle fondamental de la réussite scolaire.
              </p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="h-4 w-4 text-primary" />
                <h4 className="font-semibold">Arabe &amp; Anglais</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Activités optionnelles activables par le directeur selon la
                disponibilité. L&apos;arabe relève de l&apos;éducation religieuse ;
                l&apos;anglais initie à une langue étrangère.
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-border p-3 bg-muted/30">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="h-4 w-4 text-primary" />
              <h4 className="font-semibold">Communication école-famille</h4>
            </div>
            <p className="text-xs text-muted-foreground">
              L&apos;application facilite la communication entre les acteurs de la
              communauté éducative : <strong>directeur</strong>,{" "}
              <strong>enseignants</strong> et <strong>parents d&apos;élèves</strong>.
              Les bulletins de notes, certificats de scolarité, billets d&apos;absence
              et de retard, ainsi que les reçus de paiement constituent des
              supports officiels qui renseignent les familles sur la scolarité
              de leurs enfants et formalisent les échanges avec l&apos;administration.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="gradient-primary border-0 text-primary-foreground">
        <CardContent className="p-5 text-center">
          <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3">
            <Mail className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-lg">Contact</h3>
          <p className="text-sm text-primary-foreground/85 mt-1 max-w-md mx-auto">
            Pour toute question, assistance technique ou suggestion
            d&apos;amélioration concernant l&apos;application JANG EKOL SENEGAL,
            n&apos;hésitez pas à nous écrire.
          </p>
          <a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-lg bg-white text-primary font-semibold text-sm hover:bg-white/90 transition-colors">
            <Mail className="h-4 w-4" />
            {CONTACT_EMAIL}
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
