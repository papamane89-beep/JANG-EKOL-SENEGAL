import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/statistiques/distribution?anneeId=...&cycle=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const anneeId = searchParams.get("anneeId");
    const cycleNom = searchParams.get("cycle");

    const cycle = cycleNom
      ? await db.cycle.findUnique({ where: { nom: cycleNom } })
      : null;

    const classes = await db.classe.findMany({
      where: {
        ...(anneeId ? { anneeScolaireId: anneeId } : {}),
        ...(cycle ? { cycleId: cycle.id } : {}),
      },
      include: {
        eleves: { select: { sexe: true } },
      },
      orderBy: { nom: "asc" },
    });

    const data = classes.map((c) => {
      const garcons = c.eleves.filter((e) => e.sexe === "M").length;
      const filles = c.eleves.filter((e) => e.sexe === "F").length;
      return {
        nom: c.nom,
        garcons,
        filles,
        total: c.eleves.length,
      };
    });

    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
