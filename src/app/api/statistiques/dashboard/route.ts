import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/statistiques/dashboard?anneeId=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const anneeId = searchParams.get("anneeId");

    const eleveWhere = anneeId ? { anneeScolaireId: anneeId } : {};
    const classeWhere = anneeId ? { anneeScolaireId: anneeId } : {};

    const [totalEleves, garcons, nbClasses, nbEnseignants] = await Promise.all([
      db.eleve.count({ where: eleveWhere }),
      db.eleve.count({ where: { ...eleveWhere, sexe: "M" } }),
      db.classe.count({ where: classeWhere }),
      db.enseignant.count({ where: { actif: true } }),
    ]);

    const filles = totalEleves - garcons;

    return NextResponse.json({
      data: { totalEleves, garcons, filles, nbClasses, nbEnseignants },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
