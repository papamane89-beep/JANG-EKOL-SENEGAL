import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/statistiques/classe?classeId=&periode=&anneeId=
// Statistiques de réussite par classe + par domaine
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const classeId = searchParams.get("classeId");
    const periode = searchParams.get("periode");
    const anneeId = searchParams.get("anneeId");

    if (!classeId || !anneeId) {
      return NextResponse.json(
        { error: "classeId et anneeId requis" },
        { status: 400 }
      );
    }

    const classe = await db.classe.findUnique({
      where: { id: classeId },
      include: { cycle: true, anneeScolaire: true },
    });

    if (!classe)
      return NextResponse.json({ error: "Classe introuvable" }, { status: 404 });

    const eleves = await db.eleve.findMany({
      where: { classeId },
      orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    });

    const total = eleves.length;
    const garcons = eleves.filter((e) => e.sexe === "M").length;
    const filles = eleves.filter((e) => e.sexe === "F").length;

    // Notes pour la période
    const notesWhere = periode
      ? { classeId, periode, anneeScolaireId: anneeId }
      : { classeId, anneeScolaireId: anneeId };

    const notes = await db.note.findMany({ where: notesWhere });

    // Élèves ayant composé (au moins une note)
    const elevesAvecNotes = new Set(notes.map((n) => n.eleveId));
    const ontCompose = elevesAvecNotes.size;
    const garconsCompose = eleves.filter(
      (e) => e.sexe === "M" && elevesAvecNotes.has(e.id)
    ).length;
    const fillesCompose = eleves.filter(
      (e) => e.sexe === "F" && elevesAvecNotes.has(e.id)
    ).length;

    // Élèves ayant la moyenne (>= 5/10 par activité cumulée, ou moyenne >= 5/10)
    // Calcul moyenne par élève
    const eleveTotale = new Map<string, { total: number; sur: number }>();
    for (const n of notes) {
      const e = eleveTotale.get(n.eleveId) ?? { total: 0, sur: 0 };
      e.total += n.valeur;
      e.sur += n.sur;
      eleveTotale.set(n.eleveId, e);
    }
    const elevesMoyenne = new Map<string, number>();
    for (const [id, t] of eleveTotale) {
      elevesMoyenne.set(id, t.sur > 0 ? (t.total / t.sur) * 10 : 0);
    }
    const ontEuLaMoyenne = Array.from(elevesMoyenne.values()).filter(
      (m) => m >= 5
    ).length;
    const garconsMoyenne = eleves.filter(
      (e) => e.sexe === "M" && (elevesMoyenne.get(e.id) ?? 0) >= 5
    ).length;
    const fillesMoyenne = eleves.filter(
      (e) => e.sexe === "F" && (elevesMoyenne.get(e.id) ?? 0) >= 5
    ).length;

    const tauxReussite = ontCompose > 0
      ? Math.round((ontEuLaMoyenne / ontCompose) * 100)
      : 0;

    // Statistiques par domaine/activité
    const matieres = await db.matiere.findMany({
      where: { cycleId: classe.cycleId, actif: true },
      orderBy: { ordre: "asc" },
    });

    const statsDomaine = matieres.map((m) => {
      const mNotes = notes.filter((n) => n.matiereId === m.id);
      const eleveIds = new Set(mNotes.map((n) => n.eleveId));
      const g = eleves.filter(
        (e) => e.sexe === "M" && eleveIds.has(e.id)
      ).length;
      const f = eleves.filter(
        (e) => e.sexe === "F" && eleveIds.has(e.id)
      ).length;
      // Moyenne par activité
      const totalAct = mNotes.reduce((s, n) => s + n.valeur, 0);
      const surAct = mNotes.reduce((s, n) => s + n.sur, 0);
      const moyAct = surAct > 0 ? (totalAct / surAct) * 10 : 0;
      const ayantMoy = Array.from(eleveIds).filter((id) => {
        const eNotes = mNotes.filter((n) => n.eleveId === id);
        const t = eNotes.reduce((s, n) => s + n.valeur, 0);
        const s = eNotes.reduce((s, n) => s + n.sur, 0);
        return s > 0 && (t / s) * 10 >= 5;
      }).length;
      return {
        matiereId: m.id,
        domaine: m.domaine,
        activite: m.activite,
        garcons: g,
        filles: f,
        total: g + f,
        ayantMoyenne: ayantMoy,
        moyenne: Math.round(moyAct * 100) / 100,
        pourcentage:
          g + f > 0 ? Math.round((ayantMoy / (g + f)) * 100) : 0,
      };
    });

    return NextResponse.json({
      data: {
        classe: classe.nom,
        cycle: classe.cycle.nom,
        anneeLibelle: classe.anneeScolaire?.libelle ?? "",
        effectif: { garcons, filles, total },
        ontCompose: { garcons: garconsCompose, filles: fillesCompose, total: ontCompose },
        ontEuLaMoyenne: { garcons: garconsMoyenne, filles: fillesMoyenne, total: ontEuLaMoyenne },
        tauxReussite,
        statsDomaine,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
