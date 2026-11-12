/**
 * Parser CSV (RFC 4180) senza dipendenze: virgolette, virgolette raddoppiate,
 * a capo dentro i campi, BOM iniziale e separatore rilevato automaticamente
 * (virgola, punto e virgola o tab) dalla riga di intestazione.
 */

const CANDIDATE_DELIMITERS = [",", ";", "\t"] as const;

export function detectDelimiter(text: string): string {
  const counts = new Map<string, number>(
    CANDIDATE_DELIMITERS.map((d) => [d, 0])
  );
  let inQuotes = false;
  for (const char of text) {
    if (char === '"') inQuotes = !inQuotes;
    else if (!inQuotes && (char === "\n" || char === "\r")) break;
    else if (!inQuotes && counts.has(char)) {
      counts.set(char, (counts.get(char) ?? 0) + 1);
    }
  }
  let best = ",";
  let bestCount = 0;
  for (const [delimiter, count] of counts) {
    if (count > bestCount) {
      best = delimiter;
      bestCount = count;
    }
  }
  return best;
}

export function parseCsv(input: string, delimiter?: string): string[][] {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const sep = delimiter ?? detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === sep) {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Scarta le righe completamente vuote (es. a capo finale).
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}
