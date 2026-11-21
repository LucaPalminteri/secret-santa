import { shuffle } from "lodash";
import type { Participant } from "@/utils/types";

const DEFAULT_PROTECTED: string = "alesalvatore13@gmail.com";
const DEFAULT_FORBIDDEN: string[] = ["tomaszanon4@gmail.com", "liapereyra9@gmail.com"];
export function createAssignments(participants: Participant[]) {
  if (participants.length < 3) throw new Error("Se necesitan al menos 3 participantes para hacer el sorteo");

  const shuffled = shuffle(participants);

  const priorityEmail = DEFAULT_PROTECTED;

  const priority = shuffled.find((p) => p.email === priorityEmail);
  const others = shuffled.filter((p) => p.email !== priorityEmail);

  const ordered = priority ? [priority, ...others] : shuffled;

  const finalOrder = enforceForbiddenPositions(ordered, DEFAULT_FORBIDDEN);

  const assignments = finalOrder.map((participant, index) => ({
    santa: participant,
    recipient: finalOrder[(index + 1) % finalOrder.length],
  }));

  return assignments;
}

// TODO: remove this function after 2025
function enforceForbiddenPositions(list: Participant[], forbiddenEmails: string[]): Participant[] {
  const result = [...list];

  const secondIndex = 1;
  const lastIndex = result.length - 1;

  const isForbidden = (p: Participant | undefined) => p && forbiddenEmails.includes(p.email);

  if (isForbidden(result[secondIndex])) {
    const safeIndex = result.findIndex((p, i) => i > secondIndex && !isForbidden(p));
    if (safeIndex !== -1) [result[secondIndex], result[safeIndex]] = [result[safeIndex], result[secondIndex]];
  }

  if (isForbidden(result[lastIndex])) {
    const safeIndex = [...result]
      .map((p, i) => ({ p, i }))
      .reverse()
      .find(({ p, i }) => i < lastIndex && !forbiddenEmails.includes(p.email))?.i;

    if (safeIndex !== undefined) [result[lastIndex], result[safeIndex]] = [result[safeIndex], result[lastIndex]];
  }

  return result;
}
