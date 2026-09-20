import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { CYCLES, DOMAINES_ACTIVITES, BAREMES_PAR_ETAPE } from "@/lib/data";

export async function POST() {
  try {
    // 1. Cycles
    for (const c of CYCLES) {
      await db.cycle.upsert({
        where: { nom: c.nom },
        update: { ordre: c.ordre },
        create: { nom: c.nom, ordre: c.ordre },
      });
    }

    // 2. Admin par défaut (login: admin / mdp: admin123)
    const existingAdmin = await db.utilisateur.findUnique({
      where: { login: "admin" },
    });
    if (!existingAdmin) {
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
    }

    // 3. Établissement par défaut
    const existingEtab = await db.etablissement.findFirst();
    if (!existingEtab) {
      await db.etablissement.create({
        data: {
          nom: "École élémentaire JANG EKOL",
          typeEcole: "PUBLIQUE",
          ia: "Dakar",
          ief: "Dakar Plateau",
          telephone: "",
          email: "",
          adresse: "",
          directeurNom: "",
        },
      });
    }

    // 4. Année scolaire par défaut
    const existingAnnee = await db.anneeScolaire.findFirst();
    if (!existingAnnee) {
      await db.anneeScolaire.create({
        data: {
          libelle: "2024-2025",
          dateDebut: "2024-10-01",
          dateFin: "2025-07-31",
          active: true,
        },
      });
    }

    // 5. Paramètres de notation (élémentaire) par étape
    const cycleElementaire = await db.cycle.findUnique({
      where: { nom: "ELEMENTAIRE" },
    });
    if (cycleElementaire) {
      for (const etape of [1, 2, 3]) {
        const baremes = BAREMES_PAR_ETAPE[etape];
        for (const [domaine, activites] of Object.entries(
          DOMAINES_ACTIVITES
        )) {
          for (const activite of activites.activites) {
            const sur = baremes[domaine]?.[activite] ?? 10;
            const optionnel = domaine === "ED_RELIG" || domaine === "ANGLAIS";
            const existingP = await db.parametreNotation.findFirst({
              where: { cycleId: cycleElementaire.id, etape, domaine, activite },
            });
            if (existingP) {
              await db.parametreNotation.update({
                where: { id: existingP.id },
                data: { sur },
              });
            } else {
              await db.parametreNotation.create({
                data: {
                  cycleId: cycleElementaire.id,
                  etape,
                  domaine,
                  activite,
                  sur,
                  actif: !optionnel,
                },
              });
            }
          }
        }
      }

      // Créer les matières élémentaire (domaine + activité)
      for (const [domaine, info] of Object.entries(DOMAINES_ACTIVITES)) {
        for (const activite of info.activites) {
          const optionnel = domaine === "ED_RELIG" || domaine === "ANGLAIS";
          const existing = await db.matiere.findFirst({
            where: { cycleId: cycleElementaire.id, domaine, activite },
          });
          if (!existing) {
            await db.matiere.create({
              data: {
                cycleId: cycleElementaire.id,
                domaine,
                activite,
                sur: 10,
                optionnel,
                actif: !optionnel,
                ordre: Object.keys(DOMAINES_ACTIVITES).indexOf(domaine) * 10 + info.activites.indexOf(activite),
              },
            });
          }
        }
      }
    }

    // 6. Classes par défaut (élémentaire) pour l'année active
    const anneeActive = await db.anneeScolaire.findFirst({
      where: { active: true },
    });
    if (cycleElementaire && anneeActive) {
      const classesByEtape = [
        { etape: 1, classes: ["CI", "CP"] },
        { etape: 2, classes: ["CE1", "CE2"] },
        { etape: 3, classes: ["CM1", "CM2"] },
      ];
      for (const { etape, classes } of classesByEtape) {
        for (const nom of classes) {
          const exists = await db.classe.findFirst({
            where: {
              nom,
              cycleId: cycleElementaire.id,
              anneeScolaireId: anneeActive.id,
            },
          });
          if (!exists) {
            await db.classe.create({
              data: {
                nom,
                cycleId: cycleElementaire.id,
                anneeScolaireId: anneeActive.id,
                etape,
                capacite: 40,
              },
            });
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Base de données initialisée avec succès",
    });
  } catch (e: any) {
    console.error("Seed error:", e);
    return NextResponse.json(
      { error: "Erreur lors de l'initialisation: " + e.message },
      { status: 500 }
    );
  }
}
