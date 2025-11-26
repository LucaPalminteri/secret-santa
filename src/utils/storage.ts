import { SecretSantaData } from "./types";

const STORAGE_KEY = "secretSantaData";

export function loadSecretSantaData(): SecretSantaData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      participants: parsed.participants || [],
      listName: parsed.listName || "",
      giftAmount: parsed.giftAmount ?? undefined,
    };
  } catch (e) {
    console.error("Failed to load secret santa data from storage", e);
    return null;
  }
}

export function saveSecretSantaData(data: SecretSantaData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save secret santa data to storage", e);
  }
}

export function clearSecretSantaData() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error("Failed to clear secret santa data from storage", e);
  }
}
