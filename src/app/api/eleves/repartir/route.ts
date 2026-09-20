import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================================================
// POST /api/eleves/repartir
// Affecte des élèves INSCRITS à une classe et passe leur statut
// à AFFECTE.
//
// Body:
//   - { eleveId, classeId } : affecte UN élève à la classe
//   - { classeId }           : affecte TOUS les élèves INSCRITS
//                              de la même année scolaire que la classe
//
// Réponse: { count: number } ou { data: Eleve, count: 1 }
// ============================================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eleveId, classeId } = body;

    if (!classeId) {
      return NextResponse.json(
        { error: "classeId requis" },
        { status: 400 }
      );
    }

    // Vérifier l'existence de la classe
    const classe = await db.classe.findUnique({
      where: { id: classeId },
      select: { id: true, anneeScolaireId: true, nom: true, capacite: true },
    });
    if (!classe) {
      return NextResponse.json(
        { error: "Classe introuvable" },
        { status: 404 }
      );
    }

    // Cas 1 : affectation d'un seul élève
    if (eleveId) {
      const eleve = await db.eleve.update({
        where: { id: eleveId },
        data: { classeId, statut: "AFFECTE" },
        include: {
          classe: {
            select: {
              id: true,
              nom: true,
              cycle: { select: { id: true, nom: true } },
            },
          },
        },
      });
      return NextResponse.json({ data: eleve, count: 1 });
    }

    // Cas 2 : affectation de tous les INSCRITS de l'année à cette classe
    const result = await db.eleve.updateMany({
      where: {
        anneeScolaireId: classe.anneeScolaireId,
        statut: "INSCRIT",
      },
      data: { classeId, statut: "AFFECTE" },
    });

    return NextResponse.json({
      count: result.count,
      classeNom: classe.nom,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
