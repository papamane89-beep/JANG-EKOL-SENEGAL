import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// PATCH /api/proposition
// Body: { eleveId, classeId, anneeScolaireId, decision }
// Met à jour la décision (PASSAGE / REDOUBLAGE) — modifiable par le directeur
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { eleveId, classeId, anneeScolaireId, decision } = body;

    if (!eleveId || !classeId || !anneeScolaireId || !decision) {
      return NextResponse.json(
        { error: "eleveId, classeId, anneeScolaireId, decision requis" },
        { status: 400 }
      );
    }

    // Trouver le bulletin T3 (ou S2) et mettre à jour la décision
    const periode = "T3";
    const existing = await db.bulletin.findUnique({
      where: {
        eleveId_classeId_anneeScolaireId_periode: {
          eleveId,
          classeId,
          anneeScolaireId,
          periode,
        },
      },
    });

    if (existing) {
      const data = await db.bulletin.update({
        where: { id: existing.id },
        data: { decision },
      });
      return NextResponse.json({ data });
    }

    // Créer un bulletin minimal si inexistant
    const data = await db.bulletin.create({
      data: {
        eleveId,
        classeId,
        anneeScolaireId,
        periode,
        decision,
      },
    });
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
