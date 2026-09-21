/* eslint-disable */
// scripts/build.js — Build Windows-compatible (Prisma + sharp)
// ⚠️ UN SEUL build Next.js, en mode Webpack (évite le bug Turbopack + Prisma)
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`   ⚠️  Source introuvable : ${src}`);
    return false;
  }
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
  return true;
}

// ============================================================
// 1. GÉNÉRER LE CLIENT PRISMA (AVANT next build)
// ============================================================
console.log("\n▶ 0/3 — Génération du client Prisma...");
execSync("npx prisma generate", { stdio: "inherit", shell: true });

const prismaEnginePath = "node_modules/.prisma/client/query_engine-windows.dll.node";
if (!fs.existsSync(prismaEnginePath)) {
  console.error("❌ query_engine-windows.dll.node introuvable après prisma generate");
  process.exit(1);
}
const engineSize = fs.statSync(prismaEnginePath).size;
console.log(`   ✅ Prisma engine : ${(engineSize / 1024 / 1024).toFixed(1)} Mo`);

// ============================================================
// 2. BUILD NEXT.JS (UN SEUL FOIS, EN WEBPACK)
// ============================================================
console.log("\n▶ 1/3 — Compilation Next.js (webpack)...");
execSync("npx next build --webpack", { stdio: "inherit", shell: true });

const standalone = ".next/standalone";
if (!fs.existsSync(standalone)) {
  console.error("❌ .next/standalone introuvable. Vérifiez output: 'standalone'.");
  process.exit(1);
}

// ============================================================
// 3. COPIE DES FICHIERS STATIQUES + PACKAGES NATIFS
// ============================================================
console.log("\n▶ 2/3 — Copie des fichiers statiques et packages natifs...");
copyDir(".next/static", path.join(standalone, ".next", "static"));
copyDir("public", path.join(standalone, "public"));

const natives = [
  ["node_modules/@prisma/client",  path.join(standalone, "node_modules", "@prisma", "client")],
  ["node_modules/@prisma/engines", path.join(standalone, "node_modules", "@prisma", "engines")],
  ["node_modules/.prisma",         path.join(standalone, "node_modules", ".prisma")],
  ["node_modules/prisma",          path.join(standalone, "node_modules", "prisma")],
  ["node_modules/sharp",           path.join(standalone, "node_modules", "sharp")],
  ["node_modules/@img",            path.join(standalone, "node_modules", "@img")],
];
for (const [from, to] of natives) {
  if (copyDir(from, to)) console.log(`   ✅ ${from}`);
}

if (fs.existsSync("prisma/schema.prisma")) {
  const dest = path.join(standalone, "prisma", "schema.prisma");
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync("prisma/schema.prisma", dest);
  console.log("   ✅ prisma/schema.prisma");
}

// ============================================================
// 4. VÉRIFICATION FINALE
// ============================================================
console.log("\n▶ 3/3 — Vérification...");

const standaloneEngine = path.join(standalone, "node_modules", ".prisma", "client", "query_engine-windows.dll.node");
if (fs.existsSync(standaloneEngine)) {
  const size = fs.statSync(standaloneEngine).size;
  console.log(`   ✅ Prisma engine dans le standalone : ${(size / 1024 / 1024).toFixed(1)} Mo`);
} else {
  console.error("   ❌ Prisma engine MANQUANT dans le standalone !");
  process.exit(1);
}

// Vérifier qu'il n'y a PAS de module hashed
const chunksDir = path.join(standalone, ".next", "server", "chunks");
if (fs.existsSync(chunksDir)) {
  let hashedCount = 0;
  for (const file of fs.readdirSync(chunksDir)) {
    if (!file.endsWith(".js")) continue;
    const content = fs.readFileSync(path.join(chunksDir, file), "utf8");
    if (content.includes("@prisma/client-2c3a283f134fdcb6")) {
      hashedCount++;
    }
  }
  if (hashedCount > 0) {
    console.error(`   ❌ ${hashedCount} fichier(s) contiennent le module hashed @prisma/client-2c3a283f134fdcb6`);
    console.error("   → Webpack n'a pas correctement externalisé Prisma.");
    process.exit(1);
  } else {
    console.log("   ✅ Aucun module hashed détecté");
  }
}

console.log("\n✅ Build terminé — .next/standalone prêt.\n");