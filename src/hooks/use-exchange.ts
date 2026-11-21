"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ExchangeData } from "@/server/validation";
import type { SecretSantaData } from "@/utils/types";

async function request(method = "GET", data?: unknown): Promise<ExchangeData | null> {
  const result = await fetch("/api/exchange", {
    method, cache: "no-store", credentials: "same-origin",
    ...(data === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
  });
  const value = await result.json();
  if (!result.ok) throw new Error(value.error || "No se pudo completar la operación.");
  return value;
}

export function useExchange() {
  const [exchange, setExchange] = useState<ExchangeData | null>(null);
  const current = useRef<ExchangeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const loadSequence = useRef(0);
  const pending = useRef<{ fingerprint: string; input: SecretSantaData & { id: string; revision: number; saveKey: string } } | null>(null);

  const accept = useCallback((data: ExchangeData | null) => {
    current.current = data;
    setExchange(data);
  }, []);

  const load = useCallback(async () => {
    const sequence = ++loadSequence.current;
    setLoading(true);
    setLoadError("");
    try {
      const data = await request();
      if (sequence === loadSequence.current) accept(data);
    }
    catch (failure) { if (sequence === loadSequence.current) setLoadError(failure instanceof Error ? failure.message : "No se pudo cargar la lista."); }
    finally { if (sequence === loadSequence.current) setLoading(false); }
  }, [accept]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    if (busy || error) window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy, error]);

  async function save(data: SecretSantaData) {
    if (locked.current || loading || loadError) return false;
    const fingerprint = JSON.stringify({ listName: data.listName, giftAmount: data.giftAmount ?? null, participants: data.participants });
    if (pending.current?.fingerprint !== fingerprint) {
      pending.current = { fingerprint, input: { ...data, id: current.current?.id ?? crypto.randomUUID(), revision: current.current?.revision ?? 0, saveKey: crypto.randomUUID() } };
    }
    locked.current = true; setBusy(true); setError("");
    try {
      accept(await request("PUT", pending.current.input));
      pending.current = null;
      return true;
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No se pudo guardar. Intenta nuevamente.");
      return false;
    } finally { locked.current = false; setBusy(false); }
  }

  async function draw(retry: "failed" | "unknown" | null = null) {
    if (locked.current || !current.current || pending.current) throw new Error("Primero guarda los cambios pendientes.");
    locked.current = true; setBusy(true); setError("");
    try {
      let result: ExchangeData | null;
      do {
        result = await request("POST", { action: "draw", id: current.current!.id, revision: current.current!.revision, retry });
        retry = null;
        if (!result) throw new Error("No se pudo cargar el sorteo.");
        accept(result);
      } while (result.delivery.pending > 0);
      if (result.delivery.failed || result.delivery.unknown || result.delivery.sending) {
        throw new Error("El sorteo está guardado. Quedan correos pendientes o sin confirmación; puedes reintentarlos sin cambiar las asignaciones.");
      }
    } catch (failure) {
      // Recover a draw committed before a lost HTTP response. A failed reload
      // leaves current state intact; another attempt will still reuse the draw.
      try { accept(await request()); } catch { /* Keep the last acknowledged state. */ }
      throw failure;
    } finally { locked.current = false; setBusy(false); }
  }

  async function finish(discard = false, archive = false) {
    if (locked.current || !current.current) return false;
    locked.current = true; setBusy(true); setError("");
    try {
      await request(discard ? "DELETE" : "POST", { id: current.current.id, action: archive ? "archive" : "complete" });
      pending.current = null; accept(null);
      return true;
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No se pudo finalizar la lista.");
      return false;
    } finally { locked.current = false; setBusy(false); }
  }

  async function resetSession() {
    try { await request("DELETE", { action: "reset-session" }); await load(); }
    catch { setLoadError("No se pudo reiniciar la sesión."); }
  }

  return { exchange, loading, loadError, busy, error, load, save, draw, finish, resetSession,
    cancelEdit: () => { if (!locked.current) { pending.current = null; setError(""); } },
    hasPending: !!pending.current,
    retrySave: () => pending.current ? save({ listName: pending.current.input.listName, giftAmount: pending.current.input.giftAmount, participants: pending.current.input.participants }) : Promise.resolve(false) };
}
