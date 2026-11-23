import { describe, expect, it } from "vitest";
import { createAssignments } from "../../src/server/draw";
import type { Participant } from "../../src/utils/types";

const people = (count: number): Participant[] => Array.from({ length: count }, (_, i) => ({
  id: `person-${i}`, name: `Person ${i}`, email: `person${i}@example.com`,
}));

describe("draw generation", () => {
  it.each([0, 1, 2])("rejects %i participants", (count) => {
    expect(() => createAssignments(people(count))).toThrow("al menos 3");
  });
  it.each([3, 4, 10, 50])("assigns each of %i participants once with no self-assignment", (count) => {
    const input = people(count);
    const original = structuredClone(input);
    const pairs = createAssignments(input);
    expect(pairs.map((p) => p.santa.id).sort()).toEqual(input.map((p) => p.id).sort());
    expect(pairs.map((p) => p.recipient.id).sort()).toEqual(input.map((p) => p.id).sort());
    for (const pair of pairs) expect(pair.santa.id).not.toBe(pair.recipient.id);
    expect(input).toEqual(original);
  });
});
