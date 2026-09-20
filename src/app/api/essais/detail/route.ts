import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/essais/detail?id=essaiId
// Retourne l'essai avec ses élèves + notes + calculs (total, moyenne, rang, décision)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });

    const essai = await db.essai.findUnique({
      where: { id },
      include: {
        classe: { include: { cycle: true } },
        anneeScolaire: true,
        eleves: {
          include: {
            eleve: { select: { id: true, prenom: true, nom: true, sexe: true } },
          },
          orderBy: [{ eleve: { nom: "asc" } }, { eleve: { prenom: "asc" } }],
        },
        notes: true,
      },
    });

    if (!essai) {
      return NextResponse.json({ error: "Essai introuvable" }, { status: 404 });
    }

    return NextResponse.json({ data: essai });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/essais/detail — gestion des élèves et notes
// Body: { essaiId, action: "addEleve"|"removeEleve"|"saveNotes", eleveId?, notes? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { essaiId, action } = body;

    if (!essaiId || !action) {
      return NextResponse.json(
        { error: "essaiId et action requis" },
        { status: 400 }
      );
    }

    // Ajouter un élève à l'essai
    if (action === "addEleve") {
      const { eleveId } = body;
      if (!eleveId)
        return NextResponse.json({ error: "eleveId requis" }, { status: 400 });

      try {
        await db.essaiEleve.create({
          data: { essaiId, eleveId },
        });
      } catch {
        // déjà présent
      }
      return NextResponse.json({ ok: true });
    }

    // Retirer un élève de l'essai (+ ses notes)
    if (action === "removeEleve") {
      const { eleveId } = body;
      if (!eleveId)
        return NextResponse.json({ error: "eleveId requis" }, { status: 400 });

      await db.essaiNote.deleteMany({
        where: { essaiId, eleveId },
      });
      await db.essaiEleve.deleteMany({
        where: { essaiId, eleveId },
      });
      return NextResponse.json({ ok: true });
    }

    // Sauvegarder les notes (batch)
    if (action === "saveNotes") {
      const { notes } = body as {
        notes: {
          eleveId: string;
          domaine: string;
          activite: string;
          valeur: number;
          sur: number;
        }[];
      };

      for (const n of notes) {
        const existing = await db.essaiNote.findUnique({
          where: {
            essaiId_eleveId_domaine_activite: {
              essaiId,
              eleveId: n.eleveId,
              domaine: n.domaine,
              activite: n.activite,
            },
          },
        });
        if (existing) {
          await db.essaiNote.update({
            where: { id: existing.id },
            data: { valeur: n.valeur, sur: n.sur },
          });
        } else {
          await db.essaiNote.create({
            data: {
              essaiId,
              eleveId: n.eleveId,
              domaine: n.domaine,
              activite: n.activite,
              valeur: n.valeur,
              sur: n.sur,
            },
          });
        }
      }
      return NextResponse.json({ ok: true, count: notes.length });
    }

    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
