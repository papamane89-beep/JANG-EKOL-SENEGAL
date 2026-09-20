import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/enseignants?search=&actif=
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() ?? "";
    const actif = searchParams.get("actif"); // "true" | "false"

    const where: any = {};
    if (actif === "true") where.actif = true;
    if (actif === "false") where.actif = false;
    if (search) {
      where.OR = [
        { prenom: { contains: search } },
        { nom: { contains: search } },
        { telephone: { contains: search } },
        { email: { contains: search } },
        { grade: { contains: search } },
      ];
    }

    const data = await db.enseignant.findMany({
      where,
      orderBy: [{ nom: "asc" }, { prenom: "asc" }],
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

// POST /api/enseignants (create)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.prenom || !body.nom) {
      return NextResponse.json(
        { error: "Prénom et nom sont obligatoires" },
        { status: 400 }
      );
    }

    const data = await db.enseignant.create({
      data: {
        prenom: body.prenom,
        nom: body.nom,
        sexe: body.sexe || "M",
        telephone: body.telephone || "",
        email: body.email || "",
        adresse: body.adresse || "",
        fonction: body.fonction || "ADJOINT",
        specialite: body.specialite || "FRANCAIS",
        grade: body.grade || "",
        actif: body.actif ?? true,
        dateEmbauche: body.dateEmbauche || "",
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

// PATCH /api/enseignants { id, ... }
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...rest } = body;
    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const data = await db.enseignant.update({
      where: { id },
      data: {
        prenom: rest.prenom,
        nom: rest.nom,
        sexe: rest.sexe,
        telephone: rest.telephone,
        email: rest.email,
        adresse: rest.adresse,
        fonction: rest.fonction,
        specialite: rest.specialite,
        grade: rest.grade,
        actif: rest.actif,
        dateEmbauche: rest.dateEmbauche,
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

// DELETE /api/enseignants?id=...
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    // Les affectations N:N sont supprimées en cascade (onDelete: Cascade)
    await db.enseignant.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
