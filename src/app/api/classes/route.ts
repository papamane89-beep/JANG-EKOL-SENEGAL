import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

// ============================================================
// GET /api/classes?anneeId=&cycleId=&cycle=
// Filtre par anneeId (obligatoire pour scoped queries) et cycleId
// ou cycle (nom du cycle, ex: ELEMENTAIRE) — pratique côté vue
// Inclut _count eleves + enseignantPrincipal + cycle
// ============================================================
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const anneeId = searchParams.get("anneeId") || undefined;
    const cycleIdParam = searchParams.get("cycleId") || undefined;
    const cycleNom = searchParams.get("cycle") || undefined;

    // Résolution cycleId si seulement cycle (nom) fourni
    let cycleId = cycleIdParam;
    if (!cycleId && cycleNom) {
      const c = await db.cycle.findUnique({ where: { nom: cycleNom } });
      if (c) cycleId = c.id;
    }

    const where: Prisma.ClasseWhereInput = {
      ...(anneeId ? { anneeScolaireId: anneeId } : {}),
      ...(cycleId ? { cycleId } : {}),
    };

    const data = await db.classe.findMany({
      where,
      include: {
        enseignantPrincipal: {
          select: { id: true, prenom: true, nom: true, telephone: true },
        },
        cycle: { select: { id: true, nom: true, ordre: true } },
        _count: { select: { eleves: true } },
      },
      orderBy: [{ etape: "asc" }, { nom: "asc" }],
    });

    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ============================================================
// POST /api/classes
// Body: { nom, cycleId, anneeScolaireId, etape?, enseignantPrincipalId?,
//         capacite?, salle? }
// ============================================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.nom || !body.cycleId || !body.anneeScolaireId) {
      return NextResponse.json(
        { error: "Champs requis: nom, cycleId, anneeScolaireId" },
        { status: 400 }
      );
    }

    // Vérifier l'unicité (nom + anneeScolaireId)
    const exists = await db.classe.findFirst({
      where: { nom: body.nom, anneeScolaireId: body.anneeScolaireId },
    });
    if (exists) {
      return NextResponse.json(
        { error: `Une classe "${body.nom}" existe déjà pour cette année` },
        { status: 400 }
      );
    }

    const data = await db.classe.create({
      data: {
        nom: body.nom,
        cycleId: body.cycleId,
        anneeScolaireId: body.anneeScolaireId,
        etape: body.etape ? Number(body.etape) : 0,
        enseignantPrincipalId: body.enseignantPrincipalId || null,
        capacite: body.capacite ? Number(body.capacite) : 40,
        salle: body.salle || "",
      },
      include: {
        enseignantPrincipal: { select: { id: true, prenom: true, nom: true } },
        cycle: { select: { id: true, nom: true, ordre: true } },
        _count: { select: { eleves: true } },
      },
    });

    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ============================================================
// PATCH /api/classes
// Body: { id, ...champs à mettre à jour }
// ============================================================
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...rest } = body;
    if (!id) {
      return NextResponse.json({ error: "id requis" }, { status: 400 });
    }

    const data = await db.classe.update({
      where: { id },
      data: {
        ...(rest.nom !== undefined ? { nom: rest.nom } : {}),
        ...(rest.cycleId !== undefined ? { cycleId: rest.cycleId } : {}),
        ...(rest.anneeScolaireId !== undefined
          ? { anneeScolaireId: rest.anneeScolaireId }
          : {}),
        ...(rest.etape !== undefined ? { etape: Number(rest.etape) } : {}),
        ...(rest.enseignantPrincipalId !== undefined
          ? { enseignantPrincipalId: rest.enseignantPrincipalId || null }
          : {}),
        ...(rest.capacite !== undefined ? { capacite: Number(rest.capacite) } : {}),
        ...(rest.salle !== undefined ? { salle: rest.salle } : {}),
      },
      include: {
        enseignantPrincipal: { select: { id: true, prenom: true, nom: true } },
        cycle: { select: { id: true, nom: true, ordre: true } },
        _count: { select: { eleves: true } },
      },
    });

    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ============================================================
// DELETE /api/classes?id=
// ============================================================
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id requis" }, { status: 400 });
    }
    await db.classe.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
