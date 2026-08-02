/**
 * Host contattabili dal ponte quotazioni del processo principale.
 *
 * L'elenco e' condiviso tra main e preload ed e' volutamente chiuso: il ponte
 * aggira il CORS, quindi senza restrizione diventerebbe un modo per il renderer
 * di leggere qualunque origine.
 */
const ALLOWED_MARKET_HOSTS = [
  "query1.finance.yahoo.com",
  "query2.finance.yahoo.com",
  "api.twelvedata.com",
  "api.coingecko.com",
  "api.frankfurter.dev",
];

function isAllowedMarketUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return url.protocol === "https:" && ALLOWED_MARKET_HOSTS.includes(url.hostname);
  } catch {
    return false;
  }
}

module.exports = { ALLOWED_MARKET_HOSTS, isAllowedMarketUrl };
