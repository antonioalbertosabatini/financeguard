/**
 * Wrapper Electron per la versione desktop di FinanceGuard.
 *
 * L'app e' un export statico Next.js (cartella `out/`) 100% client-side: nessun
 * server. In sviluppo carichiamo il dev server di Next; in produzione serviamo
 * `out/` tramite uno schema custom `app://` registrato come "secure" e
 * "standard". Lo schema custom risolve i percorsi assoluti degli asset
 * (`/_next/...`) — che con `file://` si romperebbero — e soprattutto fornisce un
 * secure context, necessario perche' Web Crypto (`crypto.subtle`, usato per la
 * cifratura del vault) sia disponibile.
 */
const { app, BrowserWindow, ipcMain, protocol, net } = require("electron");
const path = require("path");
const fs = require("fs");
const { pathToFileURL } = require("url");
const { isAllowedMarketUrl } = require("./market-hosts.cjs");

const isDev = !app.isPackaged;
const OUT_DIR = path.join(__dirname, "..", "out");
const DEV_URL = "http://localhost:3000";

protocol.registerSchemesAsPrivileged([
  {
    scheme: "app",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
    },
  },
]);

/** Risolve un pathname della richiesta a un file dentro out/ (con fallback SPA). */
function resolveFile(pathname) {
  const clean = decodeURIComponent(pathname).replace(/^\/+/, "");
  if (clean === "") return path.join(OUT_DIR, "index.html");

  const direct = path.join(OUT_DIR, clean);
  if (fs.existsSync(direct) && fs.statSync(direct).isFile()) return direct;

  // Route senza estensione (es. /accounts) -> accounts.html
  const asHtml = path.join(OUT_DIR, `${clean}.html`);
  if (fs.existsSync(asHtml)) return asHtml;

  // Fallback SPA: l'app fa routing client-side a partire da index.html
  return path.join(OUT_DIR, "index.html");
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 480,
    minHeight: 640,
    backgroundColor: "#0a0a0a",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  if (isDev) {
    win.loadURL(DEV_URL);
  } else {
    win.loadURL("app://local/index.html");
  }
}

/**
 * Ponte quotazioni: le fonti di mercato gratuite non mandano header CORS, che
 * nel renderer bloccherebbero la risposta. Qui non c'e' politica di same-origin,
 * ma l'accesso resta limitato agli host noti.
 */
ipcMain.handle("market:fetch", async (_event, url) => {
  if (!isAllowedMarketUrl(url)) {
    throw new Error("Host non consentito");
  }
  const response = await net.fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.text();
});

app.whenReady().then(() => {
  if (!isDev) {
    protocol.handle("app", (request) => {
      const { pathname } = new URL(request.url);
      const file = resolveFile(pathname);
      return net.fetch(pathToFileURL(file).toString());
    });
  }

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
