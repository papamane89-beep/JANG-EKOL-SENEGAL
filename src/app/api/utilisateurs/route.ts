import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

// Sérialiseur public : jamais exposer motDePasse
function sanitize(u: any) {
  if (!u) return u;
  const { motDePasse, ...rest } = u;
  return rest;
}

// GET /api/utilisateurs
export async function GET() {
  try {
    const data = await db.utilisateur.findMany({
      orderBy: [{ role: "asc" }, { prenom: "asc" }],
    });
    return NextResponse.json({ data: data.map(sanitize) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/utilisateurs — create with hashPassword
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { login, motDePasse, prenom, nom, role, actif } = body;

    if (!login || !motDePasse || !prenom || !nom) {
      return NextResponse.json(
        { error: "Login, mot de passe, prénom et nom requis" },
        { status: 400 }
      );
    }

    // Vérifier login unique
    const exist = await db.utilisateur.findUnique({ where: { login } });
    if (exist) {
      return NextResponse.json(
        { error: "Cet identifiant est déjà utilisé" },
        { status: 409 }
      );
    }

    const data = await db.utilisateur.create({
      data: {
        login,
        motDePasse: hashPassword(motDePasse),
        prenom,
        nom,
        role: role || "ENSEIGNANT",
        actif: actif ?? true,
      },
    });

    return NextResponse.json({ data: sanitize(data) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH /api/utilisateurs — body: { id, login?, prenom?, nom?, role?, actif?, motDePasse? }
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, motDePasse, ...rest } = body;
    if (!id) {
      return NextResponse.json({ error: "id requis" }, { status: 400 });
    }

    const data: any = { ...rest };
    if (data.actif !== undefined) data.actif = !!data.actif;

    // Vérifier login unique si modifié
    if (data.login) {
      const exist = await db.utilisateur.findUnique({
        where: { login: data.login },
      });
      if (exist && exist.id !== id) {
        return NextResponse.json(
          { error: "Cet identifiant est déjà utilisé" },
          { status: 409 }
        );
      }
    }

    // Empêcher la désactivation du dernier admin
    if (data.actif === false || data.role !== undefined) {
      const target = await db.utilisateur.findUnique({ where: { id } });
      if (target && target.role === "ADMIN") {
        const nbAdmins = await db.utilisateur.count({
          where: { role: "ADMIN", actif: true },
        });
        if (nbAdmins <= 1 && (data.actif === false || (data.role && data.role !== "ADMIN"))) {
          return NextResponse.json(
            { error: "Impossible : il faut au moins un compte administrateur actif" },
            { status: 400 }
          );
        }
      }
    }

    if (motDePasse) {
      data.motDePasse = hashPassword(motDePasse);
    }

    const updated = await db.utilisateur.update({
      where: { id },
      data,
    });

    return NextResponse.json({ data: sanitize(updated) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/utilisateurs?id= — empêcher la suppression du dernier admin
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id requis" }, { status: 400 });
    }

    const target = await db.utilisateur.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    if (target.role === "ADMIN") {
      const nbAdmins = await db.utilisateur.count({
        where: { role: "ADMIN", actif: true },
      });
      if (nbAdmins <= 1) {
        return NextResponse.json(
          { error: "Impossible de supprimer le dernier compte administrateur" },
          { status: 400 }
        );
      }
    }

    await db.utilisateur.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
