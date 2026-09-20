import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword, createSession } from "@/lib/auth";

// Bootstrap : si aucun utilisateur n'existe, créer l'admin par défaut
async function ensureAdminExists() {
  try {
    const count = await db.utilisateur.count();
    if (count === 0) {
      await db.utilisateur.create({
        data: {
          login: "admin",
          motDePasse: hashPassword("admin123"),
          nom: "Administrateur",
          prenom: "Super",
          role: "ADMIN",
          actif: true,
        },
      });
      console.log("[bootstrap] Utilisateur admin créé (admin/admin123)");
    }
  } catch (e) {
    console.error("[bootstrap] Erreur création admin:", e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { login, motDePasse } = await req.json();
    if (!login || !motDePasse) {
      return NextResponse.json(
        { error: "Login et mot de passe requis" },
        { status: 400 }
      );
    }

    // S'assurer qu'au moins l'admin existe (bootstrap automatique)
    await ensureAdminExists();

    const user = await db.utilisateur.findUnique({
      where: { login },
    });

    if (!user || !user.actif) {
      return NextResponse.json(
        { error: "Identifiants invalides ou compte désactivé" },
        { status: 401 }
      );
    }

    if (!verifyPassword(motDePasse, user.motDePasse)) {
      return NextResponse.json(
        { error: "Identifiants invalides" },
        { status: 401 }
      );
    }

    const token = createSession({
      id: user.id,
      login: user.login,
      nom: user.nom,
      prenom: user.prenom,
      role: user.role,
    });

    const res = NextResponse.json({
      data: {
        id: user.id,
        login: user.login,
        nom: user.nom,
        prenom: user.prenom,
        role: user.role,
      },
    });
    res.cookies.set("jang_token", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    return res;
  } catch (e: any) {
    console.error("[login] Erreur:", e);
    return NextResponse.json(
      { error: "Erreur lors de la connexion: " + (e.message || "erreur inconnue") },
      { status: 500 }
    );
  }
}
