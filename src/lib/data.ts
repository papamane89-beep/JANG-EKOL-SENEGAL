// Données de référence pour le Sénégal — Inspection d'Académie (IA) et IEF

export const IA_IEF: Record<string, string[]> = {
  Dakar: ["Dakar Plateau", "Grand Dakar", "Parcelles Assainies"],
  Thiès: ["Thiès Ville", "Thiès Département", "Tivaouane", "Ngaye-Mékhé"],
  "Saint-Louis": ["Saint-Louis Commune", "Saint-Louis Département", "Dagana", "Rosso Béthio"],
  Diourbel: ["Diourbel", "Mbacké", "Bambey", "Touba"],
  Fatick: ["Fatick", "Foundiougne", "Gossas", "Sokone"],
  Kaolack: ["Kaolack", "Nioro du Rip", "Guinguinéo", "Keur Madiabel"],
  Kolda: ["Kolda", "Velingara", "Médina Yoro Foulah"],
  Louga: ["Louga", "Louga 2", "Kébémer", "Linguère", "Dahra"],
  Tambacounda: ["Tambacounda", "Koumpentoum", "Bakel"],
  Ziguinchor: ["Ziguinchor", "Bignona 1", "Bignona 2", "Oussouye"],
  Kaffrine: ["Kaffrine", "Kounghuel", "Birkelane", "Malem Hoddar"],
  Kédougou: ["Kédougou", "Salémata", "Saraya"],
  Matam: ["Matam", "Kanel", "Ranérou"],
  Sédhiou: ["Sédhiou", "Goudomp", "Bounkiling"],
  Mbour: ["Mbour 1", "Mbour 2", "Sindia"],
  "Pikine-Guédiawaye": ["Keur Massar", "Pikine", "Guédiawaye", "Thiaroye", "Yeumbeul"],
  Podor: ["Podor", "Ndioum", "Pété"],
  Rufisque: ["Diamniadio", "Sangalkam", "Rufisque"],
};

export const IA_LIST = Object.keys(IA_IEF);

export function getIEFList(ia: string): string[] {
  return IA_IEF[ia] || [];
}

// Cycles
export const CYCLES = [
  { nom: "MATERNEL", ordre: 1 },
  { nom: "ELEMENTAIRE", ordre: 2 },
  { nom: "MOYEN", ordre: 3 },
  { nom: "SECONDAIRE", ordre: 4 },
] as const;

// Étapes élémentaire
export const ETAPES_ELEMENTAIRE = [
  { etape: 1, classes: ["CI", "CP"], libelle: "Première étape (CI - CP)" },
  { etape: 2, classes: ["CE1", "CE2"], libelle: "Deuxième étape (CE1 - CE2)" },
  { etape: 3, classes: ["CM1", "CM2"], libelle: "Troisième étape (CM1 - CM2)" },
] as const;

// Domaines et activités (élémentaire) avec barèmes par étape
export const DOMAINES_ACTIVITES = {
  LC: { libelle: "LC", activites: ["Ressources", "Compétences"] },
  MATHS: { libelle: "Maths", activites: ["Ressources", "Compétences"] },
  ESVS: { libelle: "E.S.V.S", activites: ["DDM", "EDD"] },
  EPSA: { libelle: "E.P.S.A", activites: ["Arts.Plast", "Ed.Music"] },
  ED_RELIG: { libelle: "Ed.Relig", activites: ["Arabe"] },
  ANGLAIS: { libelle: "Anglais", activites: ["Anglais"] },
} as const;

// Barèmes par défaut selon l'étape (élémentaire)
export const BAREMES_PAR_ETAPE: Record<
  number,
  Record<string, Record<string, number>>
> = {
  1: {
    LC: { Ressources: 50, Compétences: 10 },
    MATHS: { Ressources: 40, Compétences: 20 },
    ESVS: { DDM: 30, EDD: 20 },
    EPSA: { "Arts.Plast": 10, "Ed.Music": 10 },
    ED_RELIG: { Arabe: 10 },
    ANGLAIS: { Anglais: 10 },
  },
  2: {
    LC: { Ressources: 50, Compétences: 10 },
    MATHS: { Ressources: 40, Compétences: 10 },
    ESVS: { DDM: 30, EDD: 20 },
    EPSA: { "Arts.Plast": 10, "Ed.Music": 10 },
    ED_RELIG: { Arabe: 10 },
    ANGLAIS: { Anglais: 10 },
  },
  3: {
    LC: { Ressources: 40, Compétences: 60 },
    MATHS: { Ressources: 40, Compétences: 60 },
    ESVS: { DDM: 40, EDD: 40 },
    EPSA: { "Arts.Plast": 10, "Ed.Music": 10 },
    ED_RELIG: { Arabe: 10 },
    ANGLAIS: { Anglais: 10 },
  },
};

// Périodes par cycle
export function getPeriodes(cycleNom: string): string[] {
  switch (cycleNom) {
    case "MATERNEL":
      return [];
    case "ELEMENTAIRE":
      return ["T1", "T2", "T3"];
    case "MOYEN":
    case "SECONDAIRE":
      return ["S1", "S2"];
    default:
      return [];
  }
}

// Périodes actives filtrées par cycle ET par les périodes actives de l'année
export function getPeriodesActives(cycleNom: string, periodesActives: string[]): string[] {
  const cyclePeriodes = getPeriodes(cycleNom);
  return cyclePeriodes.filter((p) => periodesActives.includes(p));
}

export const PERIODE_LIBELLE: Record<string, string> = {
  T1: "1er Trimestre",
  T2: "2ème Trimestre",
  T3: "3ème Trimestre",
  S1: "1er Semestre",
  S2: "2ème Semestre",
};

// Fonctions enseignant
export const FONCTIONS = [
  "Adjoint",
  "Adjointe",
  "Directeur",
  "Directrice",
  "Suppléant",
  "Suppléante",
] as const;

// Spécialités enseignant
export const SPECIALITES = ["Français", "Arabe", "Anglais"] as const;

// Types de paiement
export const MOTIFS_PAIEMENT = [
  "SCOLARITE",
  "INSCRIPTION",
  "CANTINE",
  "TRANSPORT",
  "FRAIS_EXAMEN",
] as const;

// ============================================================
// ESSAIS (spécifique CM2 — évaluation d'admission)
// Domaines et activités évalués lors des essais
// ============================================================
export const ESSAI_SUBJECTS = [
  { domaine: "LC", libelle: "LC", activites: ["Ressources", "Compétences"] },
  { domaine: "MATHS", libelle: "Maths", activites: ["Ressources", "Compétences"] },
  { domaine: "ESVS", libelle: "E.S.V.S", activites: ["DDM", "EDD"] },
  { domaine: "EPSA", libelle: "E.P.S.A", activites: ["Arts.Plast"] },
  { domaine: "ED_RELIG", libelle: "Arabe", activites: ["Arabe"], optionnel: true },
] as const;

// Barèmes des essais (fixes, étape 3 pour CM2)
export const ESSAI_BAREMES: Record<string, Record<string, number>> = {
  LC: { Ressources: 40, Compétences: 60 },
  MATHS: { Ressources: 40, Compétences: 60 },
  ESVS: { DDM: 40, EDD: 40 },
  EPSA: { "Arts.Plast": 10 },
  ED_RELIG: { Arabe: 10 },
};
