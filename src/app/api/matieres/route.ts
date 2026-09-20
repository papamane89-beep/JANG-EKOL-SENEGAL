import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/matieres?cycleId=
// Retourne les matières avec leur nombre de notes
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cycleId = searchParams.get("cycleId");

    const where: any = {};
    if (cycleId) where.cycleId = cycleId;

    const data = await db.matiere.findMany({
      where,
      orderBy: [{ ordre: "asc" }, { domaine: "asc" }, { activite: "asc" }],
      include: {
        cycle: { select: { id: true, nom: true } },
        _count: { select: { notes: true } },
      },
    });

    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/matieres (create)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.cycleId) {
      return NextResponse.json(
        { error: "cycleId requis" },
        { status: 400 }
      );
    }
    if (!body.domaine || !body.activite) {
      return NextResponse.json(
        { error: "domaine et activite requis" },
        { status: 400 }
      );
    }

    const data = await db.matiere.create({
      data: {
        cycleId: body.cycleId,
        domaine: body.domaine,
        activite: body.activite,
        libelle: body.libelle || "",
        sur: Number(body.sur) || 10,
        coefficient: Number(body.coefficient) || 1,
        actif: body.actif ?? true,
        optionnel: body.optionnel ?? false,
        ordre: Number(body.ordre) || 0,
      },
      include: {
        cycle: { select: { id: true, nom: true } },
        _count: { select: { notes: true } },
      },
    });

    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH /api/matieres { id, ... }
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...rest } = body;
    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const data: any = {};
    if (rest.libelle !== undefined) data.libelle = rest.libelle;
    if (rest.sur !== undefined) data.sur = Number(rest.sur);
    if (rest.coefficient !== undefined)
      data.coefficient = Number(rest.coefficient);
    if (rest.actif !== undefined) data.actif = rest.actif;
    if (rest.optionnel !== undefined) data.optionnel = rest.optionnel;
    if (rest.ordre !== undefined) data.ordre = Number(rest.ordre);
    if (rest.domaine !== undefined) data.domaine = rest.domaine;
    if (rest.activite !== undefined) data.activite = rest.activite;

    const updated = await db.matiere.update({
      where: { id },
      data,
      include: {
        cycle: { select: { id: true, nom: true } },
        _count: { select: { notes: true } },
      },
    });

    return NextResponse.json({ data: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/matieres?id=
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    await db.matiere.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
