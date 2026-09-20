import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/absences?classeId=&anneeId=&mois=YYYY-MM
// Si mois fourni, on filtre par préfixe de date YYYY-MM
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const classeId = searchParams.get("classeId") || undefined;
    const anneeId = searchParams.get("anneeId") || undefined;
    const mois = searchParams.get("mois") || undefined; // YYYY-MM
    const eleveId = searchParams.get("eleveId") || undefined;

    const where: any = {};
    if (classeId) where.classeId = classeId;
    if (anneeId) where.anneeScolaireId = anneeId;
    if (eleveId) where.eleveId = eleveId;
    if (mois) {
      // Préfixe sur la date YYYY-MM-DD
      where.date = { startsWith: mois };
    }

    const data = await db.absence.findMany({
      where,
      include: {
        eleve: { select: { id: true, prenom: true, nom: true, matricule: true } },
        classe: { select: { id: true, nom: true } },
      },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/absences
// Crée une absence. Si type=ABSENCE/RETARD pour MOYEN/SECONDAIRE, on utilise nbHeures.
// Pour ELEMENTAIRE/MATERNEL, on stocke date + periode (MATIN/APRESMIDI/JOURNEE).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      eleveId,
      classeId,
      anneeScolaireId,
      date,
      periode,
      type,
      justifiee,
      motif,
      nbHeures,
    } = body;

    if (!eleveId || !classeId || !anneeScolaireId || !date) {
      return NextResponse.json(
        { error: "Élève, classe, année et date requis" },
        { status: 400 }
      );
    }

    // Vérifier qu'une absence identique n'existe pas déjà (même élève, date, periode)
    const existante = await db.absence.findFirst({
      where: {
        eleveId,
        date,
        periode: periode || "JOURNEE",
      },
    });

    if (existante) {
      // Mettre à jour l'enregistrement existant (comportement idempotent pour le registre)
      const data = await db.absence.update({
        where: { id: existante.id },
        data: {
          type: type || "ABSENCE",
          justifiee: !!justifiee,
          motif: motif || "",
          nbHeures: Number(nbHeures ?? 0),
        },
      });
      return NextResponse.json({ data });
    }

    const data = await db.absence.create({
      data: {
        eleveId,
        classeId,
        anneeScolaireId,
        date,
        periode: periode || "JOURNEE",
        type: type || "ABSENCE",
        justifiee: !!justifiee,
        motif: motif || "",
        nbHeures: Number(nbHeures ?? 0),
      },
    });
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/absences?id=
// Soit supprime une absence précise, soit supprime l'absence d'un élève
// pour une date/periode donnée (utile pour repasser en "présent").
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const eleveId = searchParams.get("eleveId") || undefined;
    const date = searchParams.get("date") || undefined;
    const periode = searchParams.get("periode") || undefined;

    if (id) {
      await db.absence.delete({ where: { id } });
      return NextResponse.json({ ok: true });
    }

    if (eleveId && date) {
      await db.absence.deleteMany({
        where: {
          eleveId,
          date,
          ...(periode ? { periode } : {}),
        },
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { error: "id ou (eleveId + date) requis" },
      { status: 400 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
