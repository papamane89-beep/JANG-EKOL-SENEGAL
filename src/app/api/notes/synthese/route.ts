import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getBaremeMap, baremeKey } from "@/lib/baremes";

// GET /api/notes/synthese?classeId=&periode=&anneeId=
// Retourne pour chaque élève: notes par activité + total + moyenne (sur 10) + rang
// Utilise les barèmes RÉELS par étape (ParametreNotation / BAREMES_PAR_ETAPE)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const classeId = searchParams.get("classeId");
    const periode = searchParams.get("periode");
    const anneeId = searchParams.get("anneeId");

    if (!classeId || !periode || !anneeId) {
      return NextResponse.json(
        { error: "classeId, periode, anneeId requis" },
        { status: 400 }
      );
    }

    const classe = await db.classe.findUnique({
      where: { id: classeId },
      include: { cycle: true },
    });

    if (!classe) {
      return NextResponse.json({ error: "Classe introuvable" }, { status: 404 });
    }

    // Récupérer les matières actives du cycle
    const matieres = await db.matiere.findMany({
      where: { cycleId: classe.cycleId, actif: true },
      orderBy: { ordre: "asc" },
    });

    // Récupérer les barèmes réels pour l'étape de la classe
    const baremeMap = await getBaremeMap(classe.cycleId, classe.etape);

    // Enrichir les matières avec le sur réel
    const matieresAvecSur = matieres.map((m) => ({
      id: m.id,
      domaine: m.domaine,
      activite: m.activite,
      sur: baremeMap.get(baremeKey(m.domaine, m.activite)) ?? m.sur ?? 10,
      coefficient: m.coefficient,
      optionnel: m.optionnel,
      ordre: m.ordre,
    }));

    // Récupérer les élèves de la classe
    const eleves = await db.eleve.findMany({
      where: { classeId },
      orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    });

    // Récupérer toutes les notes de cette classe/période
    const notes = await db.note.findMany({
      where: { classeId, periode, anneeScolaireId: anneeId },
    });

    // Construire la synthèse avec barèmes réels
    const eleveNotesMap = new Map<
      string,
      { total: number; sur: number; notes: Record<string, { valeur: number; sur: number; appreciation: string }> }
    >();

    for (const e of eleves) {
      eleveNotesMap.set(e.id, { total: 0, sur: 0, notes: {} });
    }

    for (const n of notes) {
      const entry = eleveNotesMap.get(n.eleveId);
      if (!entry) continue;
      // Sur réel (du barème par étape), prioritaire sur le sur stocké
      const matiere = matieres.find((m) => m.id === n.matiereId);
      const surReel = matiere
        ? baremeMap.get(baremeKey(matiere.domaine, matiere.activite)) ?? n.sur
        : n.sur;
      entry.notes[n.matiereId] = {
        valeur: n.valeur,
        sur: surReel,
        appreciation: n.appreciation,
      };
      entry.total += n.valeur;
      entry.sur += surReel;
    }

    // Calculer moyenne sur 10
    const lignes = eleves.map((e) => {
      const entry = eleveNotesMap.get(e.id)!;
      const moyenne = entry.sur > 0 ? (entry.total / entry.sur) * 10 : 0;
      return {
        eleveId: e.id,
        prenom: e.prenom,
        nom: e.nom,
        sexe: e.sexe,
        notes: entry.notes,
        total: entry.total,
        surTotal: entry.sur,
        moyenne: Math.round(moyenne * 100) / 100,
      };
    });

    // Calculer le rang
    const sorted = [...lignes].sort((a, b) => b.moyenne - a.moyenne);
    const effectif = sorted.length;
    const rangMap = new Map<string, number>();
    let rang = 1;
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i].moyenne < sorted[i - 1].moyenne) {
        rang = i + 1;
      }
      rangMap.set(sorted[i].eleveId, rang);
    }

    const data = lignes.map((l) => ({
      ...l,
      rang: rangMap.get(l.eleveId) ?? 0,
      effectif,
    }));

    // Sur total maximum possible (somme des barèmes des matières actives)
    const surMaxTotal = matieresAvecSur.reduce((s, m) => s + m.sur, 0);

    return NextResponse.json({
      data: {
        matieres: matieresAvecSur,
        eleves: data,
        effectif,
        surMaxTotal,
        cycleNom: classe.cycle.nom,
        etape: classe.etape,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
