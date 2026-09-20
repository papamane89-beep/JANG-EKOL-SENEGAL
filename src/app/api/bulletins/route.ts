import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getBaremeMap, baremeKey } from "@/lib/baremes";

// GET /api/bulletins?classeId=&periode=&anneeId=
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const classeId = searchParams.get("classeId");
    const periode = searchParams.get("periode");
    const anneeId = searchParams.get("anneeId");

    const bulletins = await db.bulletin.findMany({
      where: {
        ...(classeId ? { classeId } : {}),
        ...(periode ? { periode } : {}),
        ...(anneeId ? { anneeScolaireId: anneeId } : {}),
      },
      include: {
        eleve: { select: { id: true, prenom: true, nom: true, sexe: true, dateNaissance: true } },
        classe: { include: { cycle: true, enseignantPrincipal: true } },
      },
      orderBy: [{ eleve: { nom: "asc" } }, { eleve: { prenom: "asc" } }],
    });

    return NextResponse.json({ data: bulletins });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/bulletins/generate — génère les bulletins pour une classe/période
// Utilise les barèmes RÉELS par étape
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { classeId, periode, anneeScolaireId } = body;

    if (!classeId || !periode || !anneeScolaireId) {
      return NextResponse.json(
        { error: "classeId, periode, anneeScolaireId requis" },
        { status: 400 }
      );
    }

    const classe = await db.classe.findUnique({
      where: { id: classeId },
      include: { cycle: true },
    });
    if (!classe)
      return NextResponse.json({ error: "Classe introuvable" }, { status: 404 });

    const matieres = await db.matiere.findMany({
      where: { cycleId: classe.cycleId, actif: true },
      orderBy: { ordre: "asc" },
    });

    const baremeMap = await getBaremeMap(classe.cycleId, classe.etape);

    const eleves = await db.eleve.findMany({
      where: { classeId },
      orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    });

    const notes = await db.note.findMany({
      where: { classeId, periode, anneeScolaireId },
    });

    const eleveNotesMap = new Map<
      string,
      { total: number; sur: number }
    >();
    for (const e of eleves) eleveNotesMap.set(e.id, { total: 0, sur: 0 });
    for (const n of notes) {
      const entry = eleveNotesMap.get(n.eleveId);
      if (!entry) continue;
      const matiere = matieres.find((m) => m.id === n.matiereId);
      const surReel = matiere
        ? baremeMap.get(baremeKey(matiere.domaine, matiere.activite)) ?? n.sur
        : n.sur;
      entry.total += n.valeur;
      entry.sur += surReel;
    }

    const lignes = eleves.map((e) => {
      const entry = eleveNotesMap.get(e.id)!;
      const moyenne = entry.sur > 0 ? (entry.total / entry.sur) * 10 : 0;
      return { eleve: e, total: entry.total, surTotal: entry.sur, moyenne: Math.round(moyenne * 100) / 100 };
    });

    const sorted = [...lignes].sort((a, b) => b.moyenne - a.moyenne);
    const effectif = sorted.length;
    const rangMap = new Map<string, number>();
    let rang = 1;
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i].moyenne < sorted[i - 1].moyenne) rang = i + 1;
      rangMap.set(sorted[i].eleve.id, rang);
    }

    const results = [];
    for (const l of lignes) {
      const decision = l.moyenne >= 4.5 ? "PASSAGE" : "REDOUBLAGE";
      let moyTrim1 = 0, moyTrim2 = 0, moyTrim3 = 0, moyAnnuelle = 0, rangAnnuel = 0;
      if (periode === "T3") {
        const existingB1 = await db.bulletin.findUnique({
          where: {
            eleveId_classeId_anneeScolaireId_periode: {
              eleveId: l.eleve.id, classeId, anneeScolaireId, periode: "T1",
            },
          },
        });
        const existingB2 = await db.bulletin.findUnique({
          where: {
            eleveId_classeId_anneeScolaireId_periode: {
              eleveId: l.eleve.id, classeId, anneeScolaireId, periode: "T2",
            },
          },
        });
        moyTrim1 = existingB1?.moyenne ?? 0;
        moyTrim2 = existingB2?.moyenne ?? 0;
        moyTrim3 = l.moyenne;
        moyAnnuelle = Math.round(((moyTrim1 + moyTrim2 + moyTrim3) / 3) * 100) / 100;
      }

      const data = await db.bulletin.upsert({
        where: {
          eleveId_classeId_anneeScolaireId_periode: {
            eleveId: l.eleve.id, classeId, anneeScolaireId, periode,
          },
        },
        update: {
          total: l.total,
          moyenne: l.moyenne,
          rang: rangMap.get(l.eleve.id) ?? 0,
          effectif,
          decision,
          moyTrim1, moyTrim2, moyTrim3, moyAnnuelle,
        },
        create: {
          eleveId: l.eleve.id, classeId, anneeScolaireId, periode,
          total: l.total, moyenne: l.moyenne, rang: rangMap.get(l.eleve.id) ?? 0,
          effectif, decision, moyTrim1, moyTrim2, moyTrim3, moyAnnuelle,
        },
      });
      results.push(data);
    }

    return NextResponse.json({ data: results, count: results.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH — mettre à jour la décision du bulletin
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { eleveId, classeId, anneeScolaireId, periode, decision } = body;
    const data = await db.bulletin.update({
      where: {
        eleveId_classeId_anneeScolaireId_periode: {
          eleveId, classeId, anneeScolaireId, periode,
        },
      },
      data: { decision },
    });
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
