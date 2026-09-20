import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const active = searchParams.get("active");

    const where = active === "true" ? { active: true } : {};
    const data = await db.anneeScolaire.findMany({
      where,
      orderBy: { libelle: "desc" },
    });
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.active) {
      // Désactiver les autres
      await db.anneeScolaire.updateMany({
        where: { active: true },
        data: { active: false },
      });
    }
    const data = await db.anneeScolaire.create({
      data: {
        libelle: body.libelle,
        dateDebut: body.dateDebut || "",
        dateFin: body.dateFin || "",
        active: body.active ?? false,
        periodesActives: body.periodesActives || "T1,T2,T3",
      },
    });
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, active, ...rest } = body;
    if (active) {
      await db.anneeScolaire.updateMany({
        where: { active: true },
        data: { active: false },
      });
    }
    const data = await db.anneeScolaire.update({
      where: { id },
      data: { active, ...rest },
    });
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });
    await db.anneeScolaire.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
