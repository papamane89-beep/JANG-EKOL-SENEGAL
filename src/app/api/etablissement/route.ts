import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const data = await db.etablissement.findFirst();
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const existing = await db.etablissement.findFirst();
    let data;
    if (existing) {
      data = await db.etablissement.update({
        where: { id: existing.id },
        data: {
          nom: body.nom,
          typeEcole: body.typeEcole,
          ia: body.ia,
          ief: body.ief,
          telephone: body.telephone,
          email: body.email,
          adresse: body.adresse,
          directeurNom: body.directeurNom,
          logoPath: body.logoPath,
          cachetPath: body.cachetPath,
          signaturePath: body.signaturePath,
        },
      });
    } else {
      data = await db.etablissement.create({ data: { ...body } });
    }
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
