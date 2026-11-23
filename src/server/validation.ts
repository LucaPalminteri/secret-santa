import { AppError } from "./errors";
import { validateEmail } from "@/utils/utils";
import type { SecretSantaData } from "@/utils/types";

export function uuid(value: unknown): string {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new AppError("Identificador inválido.");
  }
  return value;
}

export function draftInput(input: unknown) {
  if (!input || typeof input !== "object") throw new AppError("Datos inválidos.");
  const data = input as Record<string, unknown>;
  const id = uuid(data.id);
  const saveKey = uuid(data.saveKey);
  if (!Number.isSafeInteger(data.revision) || Number(data.revision) < 0) throw new AppError("Revisión inválida.");
  if (typeof data.listName !== "string" || !data.listName.trim() || data.listName.trim().length > 120) {
    throw new AppError("El nombre de la lista debe tener entre 1 y 120 caracteres.");
  }
  const giftAmount = data.giftAmount;
  if (giftAmount !== undefined && giftAmount !== null && (typeof giftAmount !== "number" || !Number.isFinite(giftAmount) || giftAmount < 0 || giftAmount > 9999999999.99 || Math.abs(giftAmount * 100 - Math.round(giftAmount * 100)) > 0.0001)) {
    throw new AppError("El presupuesto debe ser positivo y tener hasta dos decimales.");
  }
  if (!Array.isArray(data.participants) || data.participants.length > 50) throw new AppError("Se permiten hasta 50 participantes.");
  const ids = new Set<string>();
  const emails = new Set<string>();
  const people = data.participants.map((item: unknown) => {
    if (!item || typeof item !== "object") throw new AppError("Participante inválido.");
    const person = item as Record<string, unknown>;
    const personId = uuid(person.id);
    if (typeof person.name !== "string" || !person.name.trim() || person.name.trim().length > 100) throw new AppError("Nombre de participante inválido.");
    if (typeof person.email !== "string") throw new AppError("Correo inválido.");
    const email = person.email.trim().toLowerCase();
    if (email.length > 254 || !validateEmail(email)) throw new AppError("Correo inválido.");
    if (ids.has(personId) || emails.has(email)) throw new AppError("Hay participantes o correos duplicados.");
    ids.add(personId); emails.add(email);
    return { id: personId, name: person.name.trim(), email };
  });
  return { id, saveKey, revision: Number(data.revision), listName: data.listName.trim(), giftAmount: giftAmount == null ? null : giftAmount.toFixed(2), participants: people };
}

export type DraftInput = ReturnType<typeof draftInput>;
export type DeliverySummary = Record<"pending" | "sending" | "sent" | "failed" | "unknown", number>;
export interface ExchangeData extends SecretSantaData {
  id: string;
  revision: number;
  status: "draft" | "drawn";
  delivery: DeliverySummary;
}
