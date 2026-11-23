import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { draftInput } from "../../src/server/validation";

function input() {
  return { id: randomUUID(), saveKey: randomUUID(), revision: 0, listName: " Navidad ", giftAmount: 12.34,
    participants: [{ id: randomUUID(), name: " Ana ", email: " ANA@EXAMPLE.COM " }] };
}

describe("server draft validation", () => {
  it("normalizes names and email addresses and preserves decimal budgets", () => {
    expect(draftInput(input())).toMatchObject({ listName: "Navidad", giftAmount: "12.34", participants: [{ name: "Ana", email: "ana@example.com" }] });
  });
  it.each([null, undefined, 0])("preserves optional/zero budgets: %s", (giftAmount) => {
    expect(draftInput({ ...input(), giftAmount }).giftAmount).toBe(giftAmount === 0 ? "0.00" : null);
  });
  it.each([-1, Infinity, NaN, 1.234, "20", 10000000000])("rejects invalid budgets: %s", (giftAmount) => {
    expect(() => draftInput({ ...input(), giftAmount })).toThrow();
  });
  it.each([null, {}, { ...input(), listName: " " }, { ...input(), revision: -1 }, { ...input(), id: "not-a-uuid" }])("rejects malformed drafts", (value) => {
    expect(() => draftInput(value)).toThrow();
  });
  it("rejects duplicate emails and participant IDs", () => {
    const data = input();
    expect(() => draftInput({ ...data, participants: [...data.participants, { ...data.participants[0], id: randomUUID(), email: "ana@example.com" }] })).toThrow("duplicados");
    expect(() => draftInput({ ...data, participants: [...data.participants, { ...data.participants[0], email: "other@example.com" }] })).toThrow("duplicados");
  });
  it("limits list size before database or SMTP access", () => {
    expect(() => draftInput({ ...input(), participants: Array.from({ length: 51 }, () => ({})) })).toThrow("50");
  });
});
