import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearSecretSantaData, loadSecretSantaData, saveSecretSantaData } from "../../src/utils/storage";
import type { SecretSantaData } from "../../src/utils/types";

const data: SecretSantaData = {
  listName: "Navidad",
  giftAmount: 25000,
  participants: [{ id: "ana", name: "Ana", email: "ana@example.com" }],
};

function makeStorage() {
  const values = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { values.set(key, value); }),
    removeItem: vi.fn((key: string) => { values.delete(key); }),
  };
}

describe("Secret Santa browser storage", () => {
  let storage: ReturnType<typeof makeStorage>;

  beforeEach(() => {
    storage = makeStorage();
    vi.stubGlobal("localStorage", storage);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("returns null for a new browser", () => {
    expect(loadSecretSantaData()).toBeNull();
  });

  it("round-trips the list and participants", () => {
    saveSecretSantaData(data);
    expect(loadSecretSantaData()).toEqual(data);
  });

  it("restores defaults for missing optional fields", () => {
    storage.setItem("secretSantaData", "{}");
    expect(loadSecretSantaData()).toEqual({ participants: [], listName: "", giftAmount: undefined });
  });

  it("preserves a zero budget", () => {
    saveSecretSantaData({ ...data, giftAmount: 0 });
    expect(loadSecretSantaData()?.giftAmount).toBe(0);
  });

  it("keeps an omitted budget undefined instead of converting it to zero", () => {
    saveSecretSantaData({ participants: [], listName: "Sin presupuesto" });
    expect(loadSecretSantaData()?.giftAmount).toBeUndefined();
  });

  it.each(["not json", "null", "{"])("recovers from unreadable stored data: %j", (raw) => {
    storage.setItem("secretSantaData", raw);
    expect(loadSecretSantaData()).toBeNull();
  });

  it("clears app data while preserving unrelated storage", () => {
    saveSecretSantaData(data);
    storage.setItem("theme", "dark");
    clearSecretSantaData();
    expect(loadSecretSantaData()).toBeNull();
    expect(storage.getItem("theme")).toBe("dark");
  });

  it("survives blocked reads", () => {
    storage.getItem.mockImplementation(() => { throw new Error("Storage blocked"); });
    expect(loadSecretSantaData()).toBeNull();
  });

  it("survives quota errors without destroying the existing list", () => {
    saveSecretSantaData(data);
    storage.setItem.mockImplementation(() => { throw new Error("Quota exceeded"); });
    expect(() => saveSecretSantaData({ participants: [] })).not.toThrow();
    expect(loadSecretSantaData()).toEqual(data);
  });

  it("survives blocked deletion", () => {
    storage.removeItem.mockImplementation(() => { throw new Error("Storage blocked"); });
    expect(() => clearSecretSantaData()).not.toThrow();
  });
});
