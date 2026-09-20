import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/enseignants/affectations
// Body: { enseignantId, classeIds: string[], matiere: string }
// Affectation multiple classes (spécialistes Arabe/Anglais)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { enseignantId, classeIds, matiere } = body as {
      enseignantId: string;
      classeIds: string[];
      matiere: string;
    };

    if (!enseignantId) {
      return NextResponse.json(
        { error: "enseignantId requis" },
        { status: 400 }
      );
    }
    if (!Array.isArray(classeIds) || classeIds.length === 0) {
      return NextResponse.json(
        { error: "Au moins une classe à affecter" },
        { status: 400 }
      );
    }

    // Vérifier l'enseignant
    const enseignant = await db.enseignant.findUnique({
      where: { id: enseignantId },
      select: { id: true, specialite: true },
    });
    if (!enseignant) {
      return NextResponse.json(
        { error: "Enseignant introuvable" },
        { status: 404 }
      );
    }

    // Récupérer les affectations existantes pour ne pas dupliquer
    const existing = await db.enseignantClasse.findMany({
      where: {
        enseignantId,
        classeId: { in: classeIds },
      },
      select: { classeId: true },
    });
    const existingSet = new Set(existing.map((e) => e.classeId));
    const toCreate = classeIds.filter(
      (cid: string) => !existingSet.has(cid)
    );

    if (toCreate.length > 0) {
      await db.enseignantClasse.createMany({
        data: toCreate.map((classeId: string) => ({
          enseignantId,
          classeId,
          matiere: matiere || enseignant.specialite || "",
        })),
      });
    }

    const data = await db.enseignant.findUnique({
      where: { id: enseignantId },
      include: {
        affectations: {
          select: {
            id: true,
            classeId: true,
            matiere: true,
            classe: { select: { id: true, nom: true } },
          },
        },
        _count: { select: { affectations: true, classesPrincipal: true } },
      },
    });

    return NextResponse.json({
      data,
      created: toCreate.length,
      skipped: existingSet.size,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/enseignants/affectations?enseignantId=&classeId=
// ou body: { enseignantId, classeIds } / { affectationId }
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const enseignantId = searchParams.get("enseignantId");
    const classeId = searchParams.get("classeId");

    if (enseignantId && classeId) {
      // Supprimer une affectation spécifique
      await db.enseignantClasse.deleteMany({
        where: { enseignantId, classeId },
      });
      return NextResponse.json({ ok: true });
    }

    // Sinon lire le body
    const body = await req.json().catch(() => ({}));
    if (body.affectationId) {
      await db.enseignantClasse.delete({
        where: { id: body.affectationId },
      });
      return NextResponse.json({ ok: true });
    }
    if (body.enseignantId && Array.isArray(body.classeIds)) {
      await db.enseignantClasse.deleteMany({
        where: {
          enseignantId: body.enseignantId,
          classeId: { in: body.classeIds },
        },
      });
      return NextResponse.json({ ok: true, count: body.classeIds.length });
    }
    if (body.enseignantId) {
      // Supprimer toutes les affectations de l'enseignant
      await db.enseignantClasse.deleteMany({
        where: { enseignantId: body.enseignantId },
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { error: "Paramètres insuffisants" },
      { status: 400 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
