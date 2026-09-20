import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/enseignants/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await db.enseignant.findUnique({
      where: { id },
      include: {
        affectations: {
          select: {
            id: true,
            classeId: true,
            matiere: true,
            classe: {
              select: { id: true, nom: true, etape: true, cycleId: true },
            },
          },
        },
        classesPrincipal: {
          select: { id: true, nom: true },
        },
        _count: { select: { affectations: true, classesPrincipal: true } },
      },
    });

    if (!data) {
      return NextResponse.json(
        { error: "Enseignant introuvable" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH /api/enseignants/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const data = await db.enseignant.update({
      where: { id },
      data: {
        prenom: body.prenom,
        nom: body.nom,
        sexe: body.sexe,
        telephone: body.telephone,
        email: body.email,
        adresse: body.adresse,
        fonction: body.fonction,
        specialite: body.specialite,
        grade: body.grade,
        actif: body.actif,
        dateEmbauche: body.dateEmbauche,
      },
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

    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/enseignants/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.enseignant.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
