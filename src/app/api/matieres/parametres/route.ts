import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  DOMAINES_ACTIVITES,
  BAREMES_PAR_ETAPE,
} from "@/lib/data";

// GET /api/matieres/parametres?cycleId=&etape=
// Retourne les paramètres de notation pour le cycle/étape
// Si aucun paramètre en base, retourne les barèmes par défaut
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cycleId = searchParams.get("cycleId");
    const etapeParam = searchParams.get("etape");

    if (!cycleId) {
      return NextResponse.json(
        { error: "cycleId requis" },
        { status: 400 }
      );
    }

    const where: any = { cycleId };
    if (etapeParam) where.etape = Number(etapeParam);

    const existing = await db.parametreNotation.findMany({
      where,
      orderBy: [{ etape: "asc" }, { domaine: "asc" }, { activite: "asc" }],
    });

    // Indexer par etape/domaine/activite
    const index: Record<string, any> = {};
    for (const p of existing) {
      const key = `${p.etape}|${p.domaine}|${p.activite}`;
      index[key] = p;
    }

    // Construire la liste fusionnée avec les valeurs par défaut
    const etapes = etapeParam
      ? [Number(etapeParam)]
      : Object.keys(BAREMES_PAR_ETAPE).map(Number);

    const data: any[] = [];
    for (const etape of etapes) {
      const baremes = BAREMES_PAR_ETAPE[etape];
      if (!baremes) continue;
      for (const [domaine, def] of Object.entries(DOMAINES_ACTIVITES)) {
        const activites = (def as any).activites as string[];
        for (const activite of activites) {
          const bareme = baremes[domaine]?.[activite];
          const key = `${etape}|${domaine}|${activite}`;
          const dbParam = index[key];
          data.push({
            id: dbParam?.id ?? null,
            cycleId,
            etape,
            domaine,
            activite,
            sur: dbParam?.sur ?? bareme ?? 10,
            actif: dbParam?.actif ?? true,
            baremeParDefaut: bareme ?? 10,
          });
        }
      }
    }

    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/matieres/parametres
// Body: { cycleId, parametres: [{ etape, domaine, activite, sur, actif }] }
// Upsert: crée ou met à jour chaque ParametreNotation
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cycleId, parametres } = body as {
      cycleId: string;
      parametres: Array<{
        etape: number;
        domaine: string;
        activite: string;
        sur: number;
        actif?: boolean;
      }>;
    };

    if (!cycleId) {
      return NextResponse.json(
        { error: "cycleId requis" },
        { status: 400 }
      );
    }
    if (!Array.isArray(parametres)) {
      return NextResponse.json(
        { error: "parametres doit être un tableau" },
        { status: 400 }
      );
    }

    const operations = [];
    for (const p of parametres) {
      operations.push(
        db.parametreNotation.upsert({
          where: {
            cycleId_etape_domaine_activite: {
              cycleId,
              etape: Number(p.etape),
              domaine: p.domaine,
              activite: p.activite,
            },
          },
          create: {
            cycleId,
            etape: Number(p.etape),
            domaine: p.domaine,
            activite: p.activite,
            sur: Number(p.sur) ?? 10,
            actif: p.actif ?? true,
          },
          update: {
            sur: Number(p.sur),
            ...(p.actif !== undefined ? { actif: p.actif } : {}),
          },
        })
      );
    }

    await db.$transaction(operations);

    return NextResponse.json({
      ok: true,
      count: operations.length,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
