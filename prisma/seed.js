/* eslint-disable */
/**
 * Seed JANG EKOL SENEGAL — Données de base
 *
 * ⚠️ IMPORTANT : l'admin n'est PAS créé ici.
 * L'API /api/auth/login le crée automatiquement au premier login
 * avec le bon hash SHA-256 (voir src/lib/auth.ts).
 *
 * Sinon, le mot de passe serait en clair et verifyPassword() refuserait
 * la connexion.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seed JANG EKOL SENEGAL...\n');

  // ============================================================
  // 1. CYCLES
  // ============================================================
  const cyclesData = [
    { nom: 'MATERNEL',    ordre: 1 },
    { nom: 'ELEMENTAIRE', ordre: 2 },
    { nom: 'MOYEN',       ordre: 3 },
    { nom: 'SECONDAIRE',  ordre: 4 },
  ];

  const cycles = {};
  for (const data of cyclesData) {
    cycles[data.nom] = await prisma.cycle.upsert({
      where: { nom: data.nom },
      update: { ordre: data.ordre },
      create: data,
    });
  }
  console.log('   ✅ Cycles créés :', Object.keys(cycles).join(', '));

  // ============================================================
  // 2. ANNÉE SCOLAIRE ACTIVE
  // ============================================================
  const anneeActive = await prisma.anneeScolaire.upsert({
    where: { libelle: '2025-2026' },
    update: { active: true },
    create: {
      libelle: '2025-2026',
      dateDebut: '2025-10-01',
      dateFin: '2026-07-31',
      active: true,
      periodesActives: 'T1,T2,T3',
    },
  });
  console.log('   ✅ Année scolaire :', anneeActive.libelle);

  await prisma.anneeScolaire.updateMany({
    where: { NOT: { id: anneeActive.id } },
    data: { active: false },
  });

  // ============================================================
  // 3. ÉTABLISSEMENT
  // ============================================================
  const etabExistant = await prisma.etablissement.findFirst();
  if (!etabExistant) {
    await prisma.etablissement.create({
      data: {
        nom: 'JANG EKOL SENEGAL',
        typeEcole: 'PUBLIQUE',
        ia: 'Dakar',
        ief: 'Dakar Plateau',
        telephone: '+221 XX XXX XX XX',
        email: 'contact@jangekol.sn',
        adresse: 'Dakar, Sénégal',
        directeurNom: 'À définir',
        anneeActiveId: anneeActive.id,
      },
    });
    console.log('   ✅ Établissement créé');
  } else {
    await prisma.etablissement.update({
      where: { id: etabExistant.id },
      data: { anneeActiveId: anneeActive.id },
    });
    console.log('   ✅ Établissement mis à jour');
  }

  // ============================================================
  // 4. ADMIN — PAS CRÉÉ ICI
  // ============================================================
  // L'admin est créé automatiquement par l'API /api/auth/login
  // au premier login, avec hashPassword() de src/lib/auth.ts.
  // Cela garantit que le hash correspond à verifyPassword().
  console.log('   ⏭️  Admin : sera créé automatiquement au premier login (admin/admin123)');

  // ============================================================
  // 5. MATIÈRES PAR CYCLE
  // ============================================================

  // --- MATERNEL ---
  const matieresMaternel = [
    { domaine: 'LC',    activite: 'RESSOURCES',  libelle: 'Langage',         sur: 10, coefficient: 1 },
    { domaine: 'LC',    activite: 'COMPETENCES', libelle: 'Langage oral',    sur: 10, coefficient: 1 },
    { domaine: 'MATHS', activite: 'RESSOURCES',  libelle: 'Mathématiques',   sur: 10, coefficient: 1 },
    { domaine: 'ESVS',  activite: 'DDM',         libelle: 'Découverte',      sur: 10, coefficient: 1 },
    { domaine: 'EPSA',  activite: 'ARTS_PLAST',  libelle: 'Arts plastiques', sur: 10, coefficient: 1 },
  ];

  // --- ELEMENTAIRE ---
  const matieresElementaire = [
    { domaine: 'LC',       activite: 'RESSOURCES',  libelle: 'Lecture',              sur: 10, coefficient: 1 },
    { domaine: 'LC',       activite: 'COMPETENCES', libelle: 'Langage',              sur: 10, coefficient: 1 },
    { domaine: 'LC',       activite: 'ARABE',       libelle: 'Arabe',                sur: 10, coefficient: 1, optionnel: true },
    { domaine: 'LC',       activite: 'ANGLAIS',     libelle: 'Anglais',              sur: 10, coefficient: 1, optionnel: true },
    { domaine: 'MATHS',    activite: 'RESSOURCES',  libelle: 'Mathématiques',        sur: 10, coefficient: 1 },
    { domaine: 'MATHS',    activite: 'COMPETENCES', libelle: 'Résolution',           sur: 10, coefficient: 1 },
    { domaine: 'ESVS',     activite: 'DDM',         libelle: 'Découverte',           sur: 10, coefficient: 1 },
    { domaine: 'ESVS',     activite: 'EDD',         libelle: 'Éducation civique',    sur: 10, coefficient: 1 },
    { domaine: 'EPSA',     activite: 'ARTS_PLAST',  libelle: 'Arts plastiques',      sur: 10, coefficient: 1 },
    { domaine: 'EPSA',     activite: 'ED_MUSIC',    libelle: 'Éducation musicale',   sur: 10, coefficient: 1 },
    { domaine: 'ED_RELIG', activite: 'ARABE',       libelle: 'Éducation religieuse', sur: 10, coefficient: 1 },
  ];

  // --- MOYEN ---
  const matieresMoyen = [
    { domaine: 'LC',      activite: 'RESSOURCES', libelle: 'Français',            sur: 20, coefficient: 3 },
    { domaine: 'MATHS',   activite: 'RESSOURCES', libelle: 'Mathématiques',       sur: 20, coefficient: 3 },
    { domaine: 'ANGLAIS', activite: 'ANGLAIS',    libelle: 'Anglais',             sur: 20, coefficient: 2 },
    { domaine: 'LC',      activite: 'ARABE',      libelle: 'Arabe',               sur: 20, coefficient: 2, optionnel: true },
    { domaine: 'ESVS',    activite: 'DDM',        libelle: 'Histoire-Géographie', sur: 20, coefficient: 2 },
    { domaine: 'ESVS',    activite: 'EDD',        libelle: 'Éducation civique',   sur: 20, coefficient: 1 },
    { domaine: 'EPSA',    activite: 'ARTS_PLAST', libelle: 'Arts plastiques',     sur: 20, coefficient: 1 },
  ];

  // --- SECONDAIRE ---
  const matieresSecondaire = [
    { domaine: 'LC',      activite: 'RESSOURCES', libelle: 'Français',            sur: 20, coefficient: 3 },
    { domaine: 'MATHS',   activite: 'RESSOURCES', libelle: 'Mathématiques',       sur: 20, coefficient: 4 },
    { domaine: 'ANGLAIS', activite: 'ANGLAIS',    libelle: 'Anglais',             sur: 20, coefficient: 2 },
    { domaine: 'ESVS',    activite: 'DDM',        libelle: 'Histoire-Géographie', sur: 20, coefficient: 2 },
    { domaine: 'ESVS',    activite: 'EDD',        libelle: 'Éducation civique',   sur: 20, coefficient: 1 },
    { domaine: 'EPSA',    activite: 'ARTS_PLAST', libelle: 'Arts plastiques',     sur: 20, coefficient: 1 },
  ];

  const matieresParCycle = {
    MATERNEL:    matieresMaternel,
    ELEMENTAIRE: matieresElementaire,
    MOYEN:       matieresMoyen,
    SECONDAIRE:  matieresSecondaire,
  };

  for (const [cycleNom, matieres] of Object.entries(matieresParCycle)) {
    const cycleId = cycles[cycleNom].id;
    for (const m of matieres) {
      await prisma.matiere.upsert({
        where: {
          cycleId_domaine_activite: {
            cycleId,
            domaine: m.domaine,
            activite: m.activite,
          },
        },
        update: {
          libelle: m.libelle,
          sur: m.sur,
          coefficient: m.coefficient,
          optionnel: m.optionnel ?? false,
        },
        create: {
          cycleId,
          domaine: m.domaine,
          activite: m.activite,
          libelle: m.libelle,
          sur: m.sur,
          coefficient: m.coefficient,
          optionnel: m.optionnel ?? false,
          actif: true,
        },
      });
    }
    console.log(`   ✅ Matières ${cycleNom} : ${matieres.length}`);
  }

  // ============================================================
  // 6. PARAMÈTRES DE NOTATION (élémentaire, étapes 1-3)
  // ============================================================
  const parametresElementaire = [
    { etape: 1, domaine: 'LC',    activite: 'RESSOURCES',  sur: 10, actif: true },
    { etape: 1, domaine: 'LC',    activite: 'COMPETENCES', sur: 10, actif: true },
    { etape: 1, domaine: 'MATHS', activite: 'RESSOURCES',  sur: 10, actif: true },
    { etape: 1, domaine: 'ESVS',  activite: 'DDM',         sur: 10, actif: true },
    { etape: 2, domaine: 'LC',    activite: 'RESSOURCES',  sur: 10, actif: true },
    { etape: 2, domaine: 'LC',    activite: 'COMPETENCES', sur: 10, actif: true },
    { etape: 2, domaine: 'MATHS', activite: 'RESSOURCES',  sur: 10, actif: true },
    { etape: 2, domaine: 'MATHS', activite: 'COMPETENCES', sur: 10, actif: true },
    { etape: 3, domaine: 'LC',    activite: 'RESSOURCES',  sur: 10, actif: true },
    { etape: 3, domaine: 'LC',    activite: 'COMPETENCES', sur: 10, actif: true },
    { etape: 3, domaine: 'MATHS', activite: 'RESSOURCES',  sur: 10, actif: true },
    { etape: 3, domaine: 'MATHS', activite: 'COMPETENCES', sur: 10, actif: true },
  ];

  const cycleElemId = cycles['ELEMENTAIRE'].id;
  for (const p of parametresElementaire) {
    await prisma.parametreNotation.upsert({
      where: {
        cycleId_etape_domaine_activite: {
          cycleId: cycleElemId,
          etape: p.etape,
          domaine: p.domaine,
          activite: p.activite,
        },
      },
      update: { sur: p.sur, actif: p.actif },
      create: { cycleId: cycleElemId, ...p },
    });
  }
  console.log('   ✅ Paramètres de notation élémentaire créés');

  // ============================================================
  // FIN
  // ============================================================
  console.log('\n✅ Seed terminé avec succès.');
  console.log('\n📋 Connexion :');
  console.log('   Login        : admin');
  console.log('   Mot de passe : admin123');
  console.log('   ⚠️  L\'admin sera créé automatiquement au premier login.');
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });