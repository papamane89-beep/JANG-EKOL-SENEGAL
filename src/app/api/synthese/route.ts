import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/synthese?classeId=&anneeId=
// Synthèse annuelle par élève: moy T1, T2, T3, moy annuelle, rang annuel, décision
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const classeId = searchParams.get("classeId");
    const anneeId = searchParams.get("anneeId");

    if (!classeId || !anneeId) {
      return NextResponse.json(
        { error: "classeId et anneeId requis" },
        { status: 400 }
      );
    }

    const classe = await db.classe.findUnique({
      where: { id: classeId },
      include: { cycle: true },
    });
    if (!classe)
      return NextResponse.json({ error: "Classe introuvable" }, { status: 404 });

    // Périodes selon le cycle
    const periodes =
      classe.cycle.nom === "ELEMENTAIRE"
        ? ["T1", "T2", "T3"]
        : ["S1", "S2"];

    const eleves = await db.eleve.findMany({
      where: { classeId },
      orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    });

    // Récupérer les bulletins existants par élève/période
    const bulletins = await db.bulletin.findMany({
      where: { classeId, anneeScolaireId: anneeId },
    });
    const bullMap = new Map<
      string,
      Record<string, { moyenne: number; rang: number; total: number }>
    >();
    for (const b of bulletins) {
      const m = bullMap.get(b.eleveId) ?? {};
      m[b.periode] = {
        moyenne: b.moyenne,
        rang: b.rang,
        total: b.total,
      };
      bullMap.set(b.eleveId, m);
    }

    // Calculer la moyenne annuelle
    const lignes = eleves.map((e) => {
      const b = bullMap.get(e.id) ?? {};
      const moyennes = periodes
        .map((p) => b[p]?.moyenne ?? 0)
        .filter((m) => m > 0);
      const moyAnnuelle =
        moyennes.length > 0
          ? Math.round((moyennes.reduce((s, m) => s + m, 0) / moyennes.length) * 100) / 100
          : 0;
      const decision = moyAnnuelle >= 4.5 ? "PASSAGE" : "REDOUBLAGE";
      return {
        eleveId: e.id,
        prenom: e.prenom,
        nom: e.nom,
        sexe: e.sexe,
        moyT1: b["T1"]?.moyenne ?? 0,
        moyT2: b["T2"]?.moyenne ?? 0,
        moyT3: b["T3"]?.moyenne ?? 0,
        moyS1: b["S1"]?.moyenne ?? 0,
        moyS2: b["S2"]?.moyenne ?? 0,
        moyAnnuelle,
        rangT1: b["T1"]?.rang ?? 0,
        rangT2: b["T2"]?.rang ?? 0,
        rangT3: b["T3"]?.rang ?? 0,
        decision,
        bullExists: bullMap.has(e.id),
      };
    });

    // Rang annuel
    const sorted = [...lignes]
      .filter((l) => l.moyAnnuelle > 0)
      .sort((a, b) => b.moyAnnuelle - a.moyAnnuelle);
    const rangMap = new Map<string, number>();
    let rang = 1;
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i].moyAnnuelle < sorted[i - 1].moyAnnuelle)
        rang = i + 1;
      rangMap.set(sorted[i].eleveId, rang);
    }
    const effectif = sorted.length;
    const data = lignes.map((l) => ({
      ...l,
      rangAnnuel: rangMap.get(l.eleveId) ?? 0,
      effectif,
    }));

    return NextResponse.json({
      data: { periodes, eleves: data, effectif, cycleNom: classe.cycle.nom },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
