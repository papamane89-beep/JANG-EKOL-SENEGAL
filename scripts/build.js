/* eslint-disable @typescript-eslint/no-require-imports */
// scripts/build.js — Build multiplateforme (Windows + Linux + macOS)
// Compile Next.js puis copie tous les fichiers nécessaires vers standalone
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return false;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
  return true;
}

function copyFile(src, dest) {
  if (!fs.existsSync(src)) return false;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  return true;
}

console.log("1/6 — Compilation Next.js...");
execSync("npx next build", { stdio: "inherit", cwd: process.cwd() });

const standaloneDir = path.join(process.cwd(), ".next", "standalone");
const nmStandalone = path.join(standaloneDir, "node_modules");

console.log("2/6 — Copie .next/static vers standalone...");
copyDir(
  path.join(process.cwd(), ".next", "static"),
  path.join(standaloneDir, ".next", "static")
);

console.log("3/6 — Copie public vers standalone...");
copyDir(
  path.join(process.cwd(), "public"),
  path.join(standaloneDir, "public")
);

console.log("4/6 — Copie du client Prisma + engine binaire...");
// @prisma/client (contient le runtime JS)
copyDir(
  path.join(process.cwd(), "node_modules", "@prisma", "client"),
  path.join(nmStandalone, "@prisma", "client")
);
console.log("  ✓ @prisma/client copié");

// .prisma (contient le client généré + engine binaire .node)
copyDir(
  path.join(process.cwd(), "node_modules", ".prisma"),
  path.join(nmStandalone, ".prisma")
);
console.log("  ✓ .prisma (client généré + engine) copié");

// Copier le schéma Prisma
copyFile(
  path.join(process.cwd(), "prisma", "schema.prisma"),
  path.join(standaloneDir, "prisma", "schema.prisma")
);
console.log("  ✓ schema.prisma copié");

console.log("5/6 — Copie de better-sqlite3 (pour create-db.cjs)...");
copyDir(
  path.join(process.cwd(), "node_modules", "better-sqlite3"),
  path.join(nmStandalone, "better-sqlite3")
);
console.log("  ✓ better-sqlite3 copié");

// Copier les dépendances natives de better-sqlite3
const bindings = path.join(process.cwd(), "node_modules", "bindings");
if (fs.existsSync(bindings)) {
  copyDir(bindings, path.join(nmStandalone, "bindings"));
  console.log("  ✓ bindings copié");
}
const fileUriToPath = path.join(process.cwd(), "node_modules", "file-uri-to-path");
if (fs.existsSync(fileUriToPath)) {
  copyDir(fileUriToPath, path.join(nmStandalone, "file-uri-to-path"));
  console.log("  ✓ file-uri-to-path copié");
}

console.log("6/6 — Création de la base template...");
try {
  // Créer une base template avec le schéma complet (pour le premier lancement)
  execSync("npx prisma db push --accept-data-loss", {
    stdio: "inherit",
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: "file:./db/jang-ekol-template.db" },
  });
  console.log("  ✓ Base template créée");
} catch (e) {
  console.log("  ⚠ Base template non créée (non bloquant) :", e.message);
}

console.log("");
console.log("✓ Build terminé — dossier .next/standalone prêt");
console.log("  Contient : Next.js + Prisma client + engine + better-sqlite3");
