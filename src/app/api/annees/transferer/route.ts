import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/annees/transferer
// Body: { sourceAnneeId, cibleAnneeId }
// Transfère les classes, élèves (réaffectés) et affectations enseignants
// d'une année source vers une année cible — SANS les notes/bulletins/absences/paiements.
export async function POST(req: NextRequest) {
  try {
    const { sourceAnneeId, cibleAnneeId } = await req.json();

    if (!sourceAnneeId || !cibleAnneeId) {
      return NextResponse.json(
        { error: "sourceAnneeId et cibleAnneeId requis" },
        { status: 400 }
      );
    }

    if (sourceAnneeId === cibleAnneeId) {
      return NextResponse.json(
        { error: "L'année source et cible doivent être différentes" },
        { status: 400 }
      );
    }

    const existingClasses = await db.classe.count({
      where: { anneeScolaireId: cibleAnneeId },
    });

    const classesSource = await db.classe.findMany({
      where: { anneeScolaireId: sourceAnneeId },
    });

    let classesCreated = 0;
    let elevesCreated = 0;
    let affectationsCreated = 0;

    const classeMap = new Map<string, string>();

    let classesCible: { id: string; nom: string }[] = [];
    if (existingClasses > 0) {
      classesCible = await db.classe.findMany({
        where: { anneeScolaireId: cibleAnneeId },
        select: { id: true, nom: true },
      });
    }

    for (const c of classesSource) {
      const existante = classesCible.find((cc) => cc.nom === c.nom);
      if (existante) {
        classeMap.set(c.id, existante.id);
      } else {
        const nouvelle = await db.classe.create({
          data: {
            nom: c.nom,
            cycleId: c.cycleId,
            anneeScolaireId: cibleAnneeId,
            etape: c.etape,
            enseignantPrincipalId: c.enseignantPrincipalId,
            capacite: c.capacite,
            salle: c.salle,
          },
        });
        classeMap.set(c.id, nouvelle.id);
        classesCreated++;
      }
    }

    const elevesSource = await db.eleve.findMany({
      where: { anneeScolaireId: sourceAnneeId },
    });

    const elevesCibleExistants = await db.eleve.findMany({
      where: { anneeScolaireId: cibleAnneeId },
      select: { matricule: true },
    });
    const matriculesExistants = new Set(elevesCibleExistants.map((e) => e.matricule));

    for (const e of elevesSource) {
      if (e.matricule && matriculesExistants.has(e.matricule)) continue;
      const nouvelleClasseId = e.classeId
        ? classeMap.get(e.classeId) ?? null
        : null;
      await db.eleve.create({
        data: {
          matricule: e.matricule,
          prenom: e.prenom,
          nom: e.nom,
          sexe: e.sexe,
          dateNaissance: e.dateNaissance,
          lieuNaissance: e.lieuNaissance,
          adresse: e.adresse,
          telephoneParent: e.telephoneParent,
          nomPere: e.nomPere,
          nomMere: e.nomMere,
          photoPath: e.photoPath,
          classeId: nouvelleClasseId,
          anneeScolaireId: cibleAnneeId,
          redoublant: e.redoublant,
          statut: nouvelleClasseId ? "AFFECTE" : "INSCRIT",
        },
      });
      elevesCreated++;
      if (e.matricule) matriculesExistants.add(e.matricule);
    }

    const affectationsSource = await db.enseignantClasse.findMany({
      include: { classe: true },
    });
    for (const aff of affectationsSource) {
      if (aff.classe?.anneeScolaireId !== sourceAnneeId) continue;
      const nouvelleClasseId = classeMap.get(aff.classeId);
      if (!nouvelleClasseId) continue;
      const exists = await db.enseignantClasse.findUnique({
        where: {
          enseignantId_classeId: {
            enseignantId: aff.enseignantId,
            classeId: nouvelleClasseId,
          },
        },
      });
      if (!exists) {
        await db.enseignantClasse.create({
          data: {
            enseignantId: aff.enseignantId,
            classeId: nouvelleClasseId,
            matiere: aff.matiere,
          },
        });
        affectationsCreated++;
      }
    }

    return NextResponse.json({
      data: { classesCreated, elevesCreated, affectationsCreated },
      message: `Transfert terminé : ${elevesCreated} élève(s), ${classesCreated} classe(s), ${affectationsCreated} affectation(s)`,
    });
  } catch (e: any) {
    console.error("Erreur transfert:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
