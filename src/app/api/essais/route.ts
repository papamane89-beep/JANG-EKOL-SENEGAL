import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/essais?classeId=&anneeId=
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const classeId = searchParams.get("classeId");
    const anneeId = searchParams.get("anneeId");

    const data = await db.essai.findMany({
      where: {
        ...(classeId ? { classeId } : {}),
        ...(anneeId ? { anneeScolaireId: anneeId } : {}),
      },
      include: {
        classe: { select: { id: true, nom: true } },
        _count: { select: { eleves: true } },
      },
      orderBy: { numero: "asc" },
    });

    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST — créer un essai
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { libelle, classeId, anneeScolaireId, date } = body;

    if (!classeId || !anneeScolaireId) {
      return NextResponse.json(
        { error: "classeId et anneeScolaireId requis" },
        { status: 400 }
      );
    }

    // Calculer le numéro
    const count = await db.essai.count({
      where: { classeId, anneeScolaireId },
    });

    const data = await db.essai.create({
      data: {
        libelle: libelle || `Essai ${count + 1}`,
        classeId,
        anneeScolaireId,
        date: date || "",
        numero: count + 1,
      },
      include: {
        classe: { select: { id: true, nom: true } },
        _count: { select: { eleves: true } },
      },
    });

    return NextResponse.json({ data });
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
    await db.essai.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
