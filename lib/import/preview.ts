/**
 * Anteprima dell'import: filtra le righe interpretate per periodo, marca i
 * duplicati (gia' importati in precedenza) e abbina i versamenti PAC ai piani
 * esistenti (prima per ISIN, poi per nome). Logica pura, senza accesso al
 * dataset: riceve tutto come parametri.
 */
import type {
  ParsedPacContributionRow,
  ParsedRow,
  ParsedSkippedRow,
  ParsedTransactionRow,
} from "@/lib/import/types";

export type PlanRef = { id: string; name: string; isin?: string };

/** Piano di destinazione di un versamento importato. */
export type PlanTarget =
  | { kind: "existing"; planId: string }
  | { kind: "new"; name: string; isin?: string };

export type PreviewStatus = "new" | "warning" | "duplicate" | "unsupported";

export type PreviewRow =
  | { key: string; status: PreviewStatus; row: ParsedTransactionRow }
  | {
      key: string;
      status: PreviewStatus;
      row: ParsedPacContributionRow;
      planTarget: PlanTarget;
    }
  | { key: string; status: "unsupported"; row: ParsedSkippedRow };

export type ImportPreview = {
  rows: PreviewRow[];
  /** Righe del file fuori dal periodo selezionato (escluse dall'anteprima). */
  outOfPeriod: number;
};

export function normalizePlanName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

/** Trova il piano per ISIN, altrimenti per nome (case-insensitive). */
export function matchPlan(
  plans: PlanRef[],
  planName: string,
  isin?: string
): PlanRef | undefined {
  if (isin) {
    const byIsin = plans.find((plan) => plan.isin?.toUpperCase() === isin);
    if (byIsin) return byIsin;
  }
  const normalized = normalizePlanName(planName);
  return plans.find((plan) => normalizePlanName(plan.name) === normalized);
}

/** Chiave che identifica un piano da creare (piu' righe → stesso nuovo piano). */
export function newPlanKey(target: { name: string; isin?: string }) {
  return target.isin ? `isin:${target.isin}` : `name:${normalizePlanName(target.name)}`;
}

/** Intervallo di date coperto dal file (righe con data valida). */
export function fileDateRange(rows: ParsedRow[]): { from: string; to: string } | null {
  const dates = rows
    .map((row) => row.date)
    .filter((date): date is string => Boolean(date))
    .sort();
  if (dates.length === 0) return null;
  return { from: dates[0], to: dates[dates.length - 1] };
}

export function buildImportPreview(params: {
  rows: ParsedRow[];
  dateFrom?: string;
  dateTo?: string;
  existingExternalIds: Set<string>;
  plans: PlanRef[];
}): ImportPreview {
  const { rows, dateFrom, dateTo, existingExternalIds, plans } = params;
  const seen = new Set<string>();
  const result: PreviewRow[] = [];
  let outOfPeriod = 0;

  for (const row of rows) {
    if (row.date && ((dateFrom && row.date < dateFrom) || (dateTo && row.date > dateTo))) {
      outOfPeriod++;
      continue;
    }
    const key = `${row.line}:${row.externalId}`;

    if (row.kind === "skipped") {
      result.push({ key, status: "unsupported", row });
      continue;
    }

    const duplicate = existingExternalIds.has(row.externalId) || seen.has(row.externalId);
    seen.add(row.externalId);

    if (row.kind === "transaction") {
      result.push({
        key,
        row,
        status: duplicate ? "duplicate" : row.uncertain ? "warning" : "new",
      });
      continue;
    }

    const match = matchPlan(plans, row.planName, row.isin);
    result.push({
      key,
      row,
      status: duplicate ? "duplicate" : "new",
      planTarget: match
        ? { kind: "existing", planId: match.id }
        : { kind: "new", name: row.planName, isin: row.isin },
    });
  }

  result.sort((a, b) => (b.row.date ?? "").localeCompare(a.row.date ?? "") || a.row.line - b.row.line);
  return { rows: result, outOfPeriod };
}

/** Righe selezionabili di default: nuove e con avviso; mai duplicati/non supportate. */
export function isSelectableByDefault(row: PreviewRow) {
  return row.status === "new" || row.status === "warning";
}

export function isSelectable(row: PreviewRow) {
  return row.status !== "unsupported";
}

/** Raccoglie gli externalId gia' presenti nei dati (per marcare i duplicati). */
export function collectExternalIds(params: {
  transactions: Array<{ externalId?: string }>;
  transfers: Array<{ externalIds?: string[] }>;
  plans: Array<{ oneTimeContributions?: Array<{ externalId?: string }> }>;
}): Set<string> {
  const ids = new Set<string>();
  for (const tx of params.transactions) if (tx.externalId) ids.add(tx.externalId);
  for (const tr of params.transfers) for (const id of tr.externalIds ?? []) ids.add(id);
  for (const plan of params.plans) {
    for (const item of plan.oneTimeContributions ?? []) {
      if (item.externalId) ids.add(item.externalId);
    }
  }
  return ids;
}
