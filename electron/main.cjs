// =====================================================================
// JANG EKOL SENEGAL — Processus principal Electron
// Lance le serveur Next.js (standalone) puis ouvre la fenêtre de l'app
// =====================================================================
/* eslint-disable */
const { app, BrowserWindow, Menu, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn, execSync } = require("child_process");

let nextProcess = null;
let mainWindow = null;
const PORT = 3000;

// ====== SYSTÈME DE LOGS VERS FICHIER ======
const logDir = path.join(app.getPath("userData"), "logs");
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
const logFile = path.join(logDir, `jang-ekol-${new Date().toISOString().slice(0, 10)}.log`);

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try {
    fs.appendFileSync(logFile, line + "\n");
  } catch (e) {
    // ignore
  }
}

log("=== Démarrage de JANG EKOL SENEGAL ===");
log("userData: " + app.getPath("userData"));
log("execPath: " + process.execPath);
log("platform: " + process.platform);
log("isPackaged: " + app.isPackaged);

// ====== ÉTAPE 1 : INITIALISER LA BASE DE DONNÉES ======
function initDatabase() {
  const dbPath = path.join(app.getPath("userData"), "jang-ekol.db");
  log("Chemin base de données: " + dbPath);

  if (fs.existsSync(dbPath)) {
    log("Base de données déjà existante — skip initialisation");
    return true;
  }

  log("Première exécution — création de la base de données...");

  try {
    // Méthode 1 : Utiliser better-sqlite3 directement (le plus robuste)
    const createDbScript = path.join(
      app.isPackaged ? process.resourcesPath : path.join(__dirname, ".."),
      app.isPackaged ? "app" : "",
      "electron",
      "create-db.cjs"
    );

    log("Script create-db: " + createDbScript);
    log("Script existe: " + fs.existsSync(createDbScript));

    if (fs.existsSync(createDbScript)) {
      // Lancer le script avec ELECTRON_RUN_AS_NODE
      execSync(
        `"${process.execPath}" "${createDbScript}" "${dbPath}"`,
        {
          env: {
            ...process.env,
            ELECTRON_RUN_AS_NODE: "1",
            NODE_ENV: "production",
          },
          stdio: "pipe",
          timeout: 30000,
        }
      );
      log("✓ Base créée via create-db.cjs");
      return true;
    }
  } catch (e) {
    log("✗ Erreur create-db.cjs: " + e.message);
  }

  // Méthode 2 : créer un fichier SQLite vide (Prisma le remplira au démarrage)
  try {
    log("Fallback : création d'un fichier SQLite vide...");
    fs.writeFileSync(dbPath, Buffer.alloc(0));
    log("✓ Fichier SQLite vide créé");
    return true;
  } catch (e) {
    log("✗ Impossible de créer la base: " + e.message);
    return false;
  }
}

// ====== ÉTAPE 2 : DÉMARRER LE SERVEUR NEXT.JS ======
function startNextServer() {
  const serverFile = app.isPackaged
    ? path.join(process.resourcesPath, "app", ".next", "standalone", "server.js")
    : path.join(__dirname, "..", ".next", "standalone", "server.js");

  log("Fichier serveur: " + serverFile);
  log("Serveur existe: " + fs.existsSync(serverFile));

  if (!fs.existsSync(serverFile)) {
    log("✗ ERREUR: server.js introuvable!");
    return false;
  }

  const serverDir = path.dirname(serverFile);
  const dbPath = path.join(app.getPath("userData"), "jang-ekol.db");
  const dbUrl = "file:" + dbPath.replace(/\\/g, "/");

  log("Dossier serveur: " + serverDir);
  log("DATABASE_URL: " + dbUrl);

  // ELECTRON_RUN_AS_NODE=1 : force l'exécutable Electron à agir comme Node.js
  nextProcess = spawn(process.execPath, [serverFile], {
    cwd: serverDir,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      PORT: String(PORT),
      HOSTNAME: "127.0.0.1",
      NODE_ENV: "production",
      DATABASE_URL: dbUrl,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  nextProcess.stdout?.on("data", (d) => {
    const msg = d.toString().trim();
    log("[next] " + msg);
  });

  nextProcess.stderr?.on("data", (d) => {
    const msg = d.toString().trim();
    log("[next-err] " + msg);
  });

  nextProcess.on("exit", (code) => {
    log("Serveur Next.js arrêté (code " + code + ")");
  });

  nextProcess.on("error", (err) => {
    log("✗ Erreur spawn serveur: " + err.message);
  });

  return true;
}

// ====== ÉTAPE 3 : ATTENDRE QUE LE SERVEUR SOIT PRÊT ======
function waitForServer(cb, attempts = 0) {
  const http = require("http");
  const url = `http://127.0.0.1:${PORT}`;

  const req = http.get(url, (res) => {
    if (res.statusCode === 200 || res.statusCode === 302) {
      log("✓ Serveur prêt (tentative " + (attempts + 1) + ")");
      cb(true);
    } else {
      retry();
    }
  });

  req.on("error", () => retry());
  req.setTimeout(2000, () => {
    req.destroy();
    retry();
  });

  function retry() {
    if (attempts < 120) {
      setTimeout(() => waitForServer(cb, attempts + 1), 500);
    } else {
      log("✗ Serveur non prêt après 60 secondes");
      cb(false);
    }
  }
}

// ====== ÉTAPE 4 : CRÉER LA FENÊTRE ======
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    backgroundColor: "#1e3a8a",
    title: "JANG EKOL SENEGAL",
    icon: path.join(
      app.isPackaged ? process.resourcesPath : path.join(__dirname, ".."),
      app.isPackaged ? "app" : "",
      "public",
      "resources",
      "app-logo.ico"
    ),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.maximize();
  mainWindow.once("ready-to-show", () => mainWindow.show());

  waitForServer((ok) => {
    if (ok) {
      log("Chargement de l'URL: http://127.0.0.1:" + PORT);
      mainWindow.loadURL("http://127.0.0.1:" + PORT);
    } else {
      log("✗ Affichage de la page d'erreur");
      const logPath = logFile.replace(/\\/g, "/");
      mainWindow.loadURL(
        "data:text/html;charset=utf-8," +
          encodeURIComponent(
            `<html><head><meta charset="utf-8"><title>Erreur</title></head>` +
              `<body style="font-family:Segoe UI,sans-serif;padding:40px;background:#1e3a8a;color:white;max-width:800px;margin:0 auto;">` +
              `<h1 style="color:#fbbf24;">⚠ Erreur de démarrage</h1>` +
              `<p>Le serveur local n'a pas pu démarrer.</p>` +
              `<h3>Solutions :</h3>` +
              `<ol>` +
              `<li><b>Relancez l'application</b> (fermez et rouvrez)</li>` +
              `<li>Vérifiez que le port 3000 n'est pas occupé</li>` +
              `<li>Consultez les logs :</li>` +
              `</ol>` +
              `<p style="background:#000;color:#0f0;padding:15px;border-radius:8px;font-family:Consolas,monospace;font-size:12px;word-break:break-all;">` +
              logPath + `</p>` +
              `<p>Transmettez ce fichier log à l'assistance : <b>papamane89@gmail.com</b></p>` +
              `</body></html>`
          )
      );
    }
  });

  mainWindow.on("closed", () => (mainWindow = null));
}

// ====== MENU ======
function buildMenu() {
  const template = [
    {
      label: "Fichier",
      submenu: [
        { role: "reload", label: "Recharger" },
        { role: "toggledevtools", label: "Outils développeur" },
        { type: "separator" },
        { role: "print", label: "Imprimer" },
        { type: "separator" },
        {
          label: "Ouvrir le dossier des logs",
          click: () => {
            const { shell } = require("electron");
            shell.openPath(logDir);
          },
        },
        { type: "separator" },
        { role: "quit", label: "Quitter" },
      ],
    },
    {
      label: "Affichage",
      submenu: [
        { role: "togglefullscreen", label: "Plein écran" },
        { role: "zoomin", label: "Zoom +" },
        { role: "zoomout", label: "Zoom -" },
        { role: "resetzoom", label: "Zoom reset" },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ====== CYCLE DE VIE ELECTRON ======
app.whenReady().then(() => {
  log("Electron prêt — initialisation...");

  // 1. Initialiser la base de données
  const dbOk = initDatabase();
  if (!dbOk) {
    dialog.showErrorBox(
      "Erreur base de données",
      "Impossible d'initialiser la base de données.\n\nLogs : " + logFile
    );
  }

  // 2. Démarrer le serveur Next.js
  const serverOk = startNextServer();
  if (!serverOk) {
    dialog.showErrorBox(
      "Erreur fatale",
      "Le fichier server.js est introuvable. L'installation est peut-être corrompue.\n\nLogs : " + logFile
    );
    app.quit();
    return;
  }

  // 3. Créer la fenêtre
  createWindow();
  buildMenu();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    if (nextProcess) {
      try {
        if (process.platform === "win32") {
          spawn("taskkill", ["/pid", nextProcess.pid, "/f", "/t"]);
        } else {
          nextProcess.kill();
        }
      } catch (e) {
        log("Erreur fermeture serveur: " + e.message);
      }
    }
    app.quit();
  }
});

app.on("before-quit", () => {
  if (nextProcess) {
    try {
      if (process.platform === "win32") {
        spawn("taskkill", ["/pid", nextProcess.pid, "/f", "/t"]);
      } else {
        nextProcess.kill();
      }
    } catch (e) {
      log("Erreur fermeture serveur: " + e.message);
    }
  }
});
