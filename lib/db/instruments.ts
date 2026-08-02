/**
 * Anagrafica degli strumenti posseduti. Un record nasce quando si registra la
 * prima operazione su un titolo e vive in dataset.instruments come collezione
 * piatta: sono pochi record, non ha senso partizionarli per anno come i trade.
 */
import { commit, getDataset, getDeviceId } from "@/lib/storage/data-store";
import { AppError } from "@/lib/i18n/app-error";
import { generateId } from "@/lib/db/index";
import { trackDelete, trackInstrumentUpsert } from "@/lib/sync/sync-metadata";
import {
  instrumentSchema,
  instrumentsFileSchema,
  type Instrument,
  type InstrumentInput,
} from "@/lib/schemas/instrument";

export async function getInstruments(): Promise<Instrument[]> {
  return instrumentsFileSchema.parse({
    instruments: getDataset().instruments,
  }).instruments;
}

export async function createInstrument(
  input: InstrumentInput
): Promise<Instrument> {
  const instrument = instrumentSchema.parse({ ...input, id: generateId("ins") });
  const dataset = getDataset();
  dataset.instruments.push(instrument);
  trackInstrumentUpsert(dataset, instrument, getDeviceId());
  commit();
  return instrument;
}

/**
 * Riusa lo strumento gia' presente con lo stesso simbolo: registrare due
 * acquisti dello stesso ETF non deve creare due righe in portafoglio.
 */
export async function findOrCreateInstrument(
  input: InstrumentInput
): Promise<Instrument> {
  const existing = getDataset().instruments.find(
    (item) => item.symbol === input.symbol && item.kind === input.kind
  );
  if (existing) return existing;
  return createInstrument(input);
}

export async function updateInstrument(
  id: string,
  input: InstrumentInput
): Promise<Instrument> {
  const instruments = getDataset().instruments;
  const index = instruments.findIndex((item) => item.id === id);
  if (index === -1) throw new AppError("errors.instrumentNotFound");

  const previous = instruments[index];
  const updated = instrumentSchema.parse({ ...input, id });
  instruments[index] = updated;
  trackInstrumentUpsert(getDataset(), updated, getDeviceId(), previous);
  commit();
  return updated;
}

export async function deleteInstrument(id: string): Promise<void> {
  const dataset = getDataset();
  dataset.instruments = dataset.instruments.filter((item) => item.id !== id);
  trackDelete(dataset, "instrument", id, getDeviceId());
  commit();
}
