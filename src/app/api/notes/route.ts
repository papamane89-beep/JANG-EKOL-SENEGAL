import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/notes?classeId=&periode=&anneeId=
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const classeId = searchParams.get("classeId");
    const periode = searchParams.get("periode");
    const anneeId = searchParams.get("anneeId");

    const notes = await db.note.findMany({
      where: {
        ...(classeId ? { classeId } : {}),
        ...(periode ? { periode } : {}),
        ...(anneeId ? { anneeScolaireId: anneeId } : {}),
      },
      include: {
        eleve: { select: { id: true, prenom: true, nom: true, sexe: true } },
        matiere: { select: { id: true, domaine: true, activite: true, sur: true, coefficient: true } },
      },
      orderBy: [{ eleve: { nom: "asc" } }, { eleve: { prenom: "asc" } }],
    });

    return NextResponse.json({ data: notes });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/notes — upsert une note (création ou mise à jour)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eleveId, matiereId, classeId, anneeScolaireId, periode, valeur, sur, appreciation } = body;

    const data = await db.note.upsert({
      where: {
        eleveId_matiereId_classeId_anneeScolaireId_periode: {
          eleveId,
          matiereId,
          classeId,
          anneeScolaireId,
          periode,
        },
      },
      update: { valeur, sur, appreciation },
      create: {
        eleveId,
        matiereId,
        classeId,
        anneeScolaireId,
        periode,
        valeur,
        sur,
        appreciation,
      },
    });

    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH — batch upsert
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    // body: { anneeScolaireId, classeId, periode, notes: [{eleveId, matiereId, valeur, sur, appreciation}] }
    const { anneeScolaireId, classeId, periode, notes } = body as {
      anneeScolaireId: string;
      classeId: string;
      periode: string;
      notes: {
        eleveId: string;
        matiereId: string;
        valeur: number;
        sur: number;
        appreciation?: string;
      }[];
    };

    const results = [];
    for (const n of notes) {
      const r = await db.note.upsert({
        where: {
          eleveId_matiereId_classeId_anneeScolaireId_periode: {
            eleveId: n.eleveId,
            matiereId: n.matiereId,
            classeId,
            anneeScolaireId,
            periode,
          },
        },
        update: {
          valeur: n.valeur,
          sur: n.sur,
          appreciation: n.appreciation ?? "",
        },
        create: {
          eleveId: n.eleveId,
          matiereId: n.matiereId,
          classeId,
          anneeScolaireId,
          periode,
          valeur: n.valeur,
          sur: n.sur,
          appreciation: n.appreciation ?? "",
        },
      });
      results.push(r);
    }

    return NextResponse.json({ data: results, count: results.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE ?id=
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });
    await db.note.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
