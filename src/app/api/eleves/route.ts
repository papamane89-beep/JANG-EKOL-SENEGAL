import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

// ============================================================
// Génération automatique du matricule au format JES-YYYY-NNN
// NNN = numéro séquentiel (sur 3 chiffres, complété à gauche par 0)
// ============================================================
async function generateMatricule(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `JES-${year}-`;
  const existing = await db.eleve.findMany({
    where: { matricule: { startsWith: prefix } },
    select: { matricule: true },
  });
  let maxNum = 0;
  for (const e of existing) {
    const numStr = e.matricule.substring(prefix.length);
    const num = parseInt(numStr, 10);
    if (!isNaN(num) && num > maxNum) maxNum = num;
  }
  return `${prefix}${String(maxNum + 1).padStart(3, "0")}`;
}

// ============================================================
// GET /api/eleves?classeId=&anneeId=&search=
// search filtre sur prenom / nom / matricule
// ============================================================
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const classeId = searchParams.get("classeId") || undefined;
    const anneeId = searchParams.get("anneeId") || undefined;
    const search = searchParams.get("search")?.trim() || undefined;

    const where: Prisma.EleveWhereInput = {
      ...(classeId ? { classeId } : {}),
      ...(anneeId ? { anneeScolaireId: anneeId } : {}),
      ...(search
        ? {
            OR: [
              { prenom: { contains: search } },
              { nom: { contains: search } },
              { matricule: { contains: search } },
            ],
          }
        : {}),
    };

    const data = await db.eleve.findMany({
      where,
      include: {
        classe: {
          select: {
            id: true,
            nom: true,
            cycle: { select: { id: true, nom: true } },
          },
        },
      },
      orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    });

    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ============================================================
// POST /api/eleves
// Body: { prenom, nom, sexe?, dateNaissance?, lieuNaissance?,
//         adresse?, telephoneParent?, nomPere?, nomMere?,
//         anneeScolaireId, classeId?, redoublant?, matricule? }
// - matricule auto-généré si vide (JES-YYYY-NNN)
// - statut = AFFECTE si classeId fourni, sinon INSCRIT
// ============================================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.prenom || !body.nom || !body.anneeScolaireId) {
      return NextResponse.json(
        { error: "Champs requis: prenom, nom, anneeScolaireId" },
        { status: 400 }
      );
    }

    // Matricule auto-généré si vide
    const matricule = body.matricule?.trim() || (await generateMatricule());

    // Vérifier unicité matricule
    const exists = await db.eleve.findUnique({
      where: { matricule },
      select: { id: true },
    });
    if (exists) {
      return NextResponse.json(
        { error: `Matricule ${matricule} déjà utilisé` },
        { status: 400 }
      );
    }

    const data = await db.eleve.create({
      data: {
        matricule,
        prenom: body.prenom,
        nom: body.nom,
        sexe: body.sexe || "M",
        dateNaissance: body.dateNaissance || "",
        lieuNaissance: body.lieuNaissance || "",
        adresse: body.adresse || "",
        telephoneParent: body.telephoneParent || "",
        nomPere: body.nomPere || "",
        nomMere: body.nomMere || "",
        anneeScolaireId: body.anneeScolaireId,
        classeId: body.classeId || null,
        redoublant: body.redoublant ?? false,
        statut: body.classeId ? "AFFECTE" : "INSCRIT",
      },
      include: {
        classe: {
          select: {
            id: true,
            nom: true,
            cycle: { select: { id: true, nom: true } },
          },
        },
      },
    });

    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ============================================================
// PATCH /api/eleves
// Body: { id, ...champs }
// - si classeId modifié : statut -> AFFECTE (si classeId fourni)
//   ou INSCRIT (si classeId = null)
// ============================================================
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...rest } = body;
    if (!id) {
      return NextResponse.json({ error: "id requis" }, { status: 400 });
    }

    // Si classeId est modifié, ajuster le statut en conséquence
    let statut: string | undefined = rest.statut;
    if (rest.classeId !== undefined) {
      statut = rest.classeId ? "AFFECTE" : "INSCRIT";
    }

    const data = await db.eleve.update({
      where: { id },
      data: {
        ...(rest.matricule !== undefined ? { matricule: rest.matricule } : {}),
        ...(rest.prenom !== undefined ? { prenom: rest.prenom } : {}),
        ...(rest.nom !== undefined ? { nom: rest.nom } : {}),
        ...(rest.sexe !== undefined ? { sexe: rest.sexe } : {}),
        ...(rest.dateNaissance !== undefined
          ? { dateNaissance: rest.dateNaissance }
          : {}),
        ...(rest.lieuNaissance !== undefined
          ? { lieuNaissance: rest.lieuNaissance }
          : {}),
        ...(rest.adresse !== undefined ? { adresse: rest.adresse } : {}),
        ...(rest.telephoneParent !== undefined
          ? { telephoneParent: rest.telephoneParent }
          : {}),
        ...(rest.nomPere !== undefined ? { nomPere: rest.nomPere } : {}),
        ...(rest.nomMere !== undefined ? { nomMere: rest.nomMere } : {}),
        ...(rest.classeId !== undefined
          ? { classeId: rest.classeId || null }
          : {}),
        ...(rest.redoublant !== undefined ? { redoublant: rest.redoublant } : {}),
        ...(statut !== undefined ? { statut } : {}),
      },
      include: {
        classe: {
          select: {
            id: true,
            nom: true,
            cycle: { select: { id: true, nom: true } },
          },
        },
      },
    });

    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ============================================================
// DELETE /api/eleves?id=
// ============================================================
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id requis" }, { status: 400 });
    }
    await db.eleve.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
