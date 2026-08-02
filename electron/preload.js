/**
 * Preload minimale. FinanceGuard desktop e' un'app web pura (export statico
 * Next) e l'unico ponte verso il processo principale serve alle quotazioni: le
 * fonti di dati di mercato gratuite non mandano header CORS, che nel renderer
 * bloccherebbero la richiesta. Il main non e' un browser e quindi non applica
 * la stessa politica.
 *
 * Passa solo l'URL e restituisce solo il corpo come testo: nessuna API di Node
 * viene esposta al renderer.
 */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("financeguardDesktop", {
  marketFetch: (url) => ipcRenderer.invoke("market:fetch", url),
});
