import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/paiements?classeId=&anneeId=
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const classeId = searchParams.get("classeId") || undefined;
    const anneeId = searchParams.get("anneeId") || undefined;

    const where: any = {};
    if (classeId) where.classeId = classeId;
    if (anneeId) where.anneeScolaireId = anneeId;

    const data = await db.paiement.findMany({
      where,
      include: {
        eleve: { select: { id: true, prenom: true, nom: true, matricule: true } },
        classe: { select: { id: true, nom: true } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/paiements — auto-génère recuNumero
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eleveId, classeId, anneeScolaireId, montant, date, motif } = body;

    if (!eleveId || !classeId || !anneeScolaireId || montant == null) {
      return NextResponse.json(
        { error: "Élève, classe, année et montant requis" },
        { status: 400 }
      );
    }

    // Générer un numéro de reçu unique : REC-YYYY-{seq}
    const year = new Date().getFullYear();
    const prefix = `REC-${year}-`;
    const last = await db.paiement.findFirst({
      where: { recuNumero: { startsWith: prefix } },
      orderBy: { recuNumero: "desc" },
    });
    let seq = 1;
    if (last && last.recuNumero) {
      const m = last.recuNumero.match(/(\d+)$/);
      if (m) seq = parseInt(m[1], 10) + 1;
    }
    const recuNumero = `${prefix}${String(seq).padStart(4, "0")}`;

    const data = await db.paiement.create({
      data: {
        eleveId,
        classeId,
        anneeScolaireId,
        montant: Number(montant),
        date: date || new Date().toISOString().slice(0, 10),
        motif: motif || "SCOLARITE",
        recuNumero,
      },
      include: {
        eleve: { select: { id: true, prenom: true, nom: true, matricule: true } },
        classe: { select: { id: true, nom: true } },
      },
    });

    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH /api/paiements — body: { id, montant, date, motif, ... }
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, montant, date, motif } = body;
    if (!id) {
      return NextResponse.json({ error: "id requis" }, { status: 400 });
    }

    const data: any = {};
    if (montant != null) data.montant = Number(montant);
    if (date != null) data.date = date;
    if (motif != null) data.motif = motif;

    const updated = await db.paiement.update({
      where: { id },
      data,
      include: {
        eleve: { select: { id: true, prenom: true, nom: true, matricule: true } },
        classe: { select: { id: true, nom: true } },
      },
    });

    return NextResponse.json({ data: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/paiements?id=
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id requis" }, { status: 400 });
    }
    await db.paiement.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
