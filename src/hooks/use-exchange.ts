"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import type { ExchangeData } from "@/server/validation";
import type { SecretSantaData } from "@/utils/types";

type SaveCommand = SecretSantaData & { id: string; revision: number; saveKey: string };

class RequestError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

async function request(method = "GET", data?: unknown): Promise<ExchangeData | null> {
  let result: Response;
  try {
    result = await fetch("/api/exchange", {
      method, cache: "no-store", credentials: "same-origin",
      ...(data === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
    });
  } catch {
    throw new Error("No se pudo conectar. Revisa tu conexión e intenta nuevamente.");
  }
  let value;
  try { value = await result.json(); }
  catch { throw new Error("No se pudo confirmar la respuesta. Intenta nuevamente."); }
  if (!result.ok) throw new RequestError(value.error || "No se pudo completar la operación.", result.status);
  return value;
}

export function useExchange() {
  // The visible draft can be ahead of the last acknowledged server revision.
  const [exchange, setExchange] = useState<ExchangeData | null>(null);
  const current = useRef<ExchangeData | null>(null);
  const draftId = useRef<string | null>(null);
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(true);
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const paused = useRef(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const loadSequence = useRef(0);
  const pending = useRef<SaveCommand | null>(null);
  const desired = useRef<SecretSantaData | null>(null);
  const activeSave = useRef<Promise<boolean> | null>(null);

  const accept = useCallback((data: ExchangeData | null) => {
    current.current = data;
    draftId.current = data?.id ?? null;
    setExchange(data);
  }, []);

  const load = useCallback(async () => {
    // A background refresh must not replace unsaved optimistic changes.
    if (activeSave.current || pending.current || desired.current || locked.current) return;
    const sequence = ++loadSequence.current;
    loadingRef.current = true;
    setLoading(true);
    setLoadError("");
    try {
      const data = await request();
      if (sequence === loadSequence.current) accept(data);
    }
    catch (failure) { if (sequence === loadSequence.current) setLoadError(failure instanceof Error ? failure.message : "No se pudo cargar la lista."); }
    finally {
      if (sequence === loadSequence.current) { loadingRef.current = false; setLoading(false); }
    }
  }, [accept]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    if (busy || saving || saveError) window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy, saving, saveError]);

  function flush(): Promise<boolean> {
    if (activeSave.current) return activeSave.current;
    if (!pending.current && !desired.current) return Promise.resolve(true);
    paused.current = false;
    setSaveError("");
    setSaving(true);
    const run = async () => {
      try {
        while (pending.current || desired.current) {
          if (!pending.current) {
            pending.current = { ...desired.current!, id: draftId.current!, revision: current.current?.revision ?? 0, saveKey: uuidv4() };
            desired.current = null;
          }
          const command = pending.current;
          try {
            const saved = await request("PUT", command);
            if (!saved) throw new Error("No se pudo confirmar el guardado.");
            current.current = saved;
            pending.current = null;
            // An older response must never replace a newer optimistic edit.
            if (!desired.current) setExchange(saved);
          } catch (failure) {
            // Definitive validation failures can be corrected locally. Network
            // failures keep the exact command/key: it may already be committed.
            if (failure instanceof RequestError && [400, 413, 415, 422].includes(failure.status)) {
              desired.current ??= { listName: command.listName, giftAmount: command.giftAmount, participants: command.participants };
              pending.current = null;
            }
            paused.current = true;
            setSaveError(failure instanceof Error ? failure.message : "No se pudo guardar. Intenta nuevamente.");
            return false;
          }
        }
        return true;
      } finally {
        activeSave.current = null;
        setSaving(false);
      }
    };
    activeSave.current = run();
    return activeSave.current;
  }

  function save(data: SecretSantaData): boolean {
    if (locked.current || loadingRef.current || loadError || current.current?.status === "drawn") return false;
    draftId.current ??= uuidv4();
    desired.current = { ...data, participants: data.participants.map((person) => ({ ...person })) };
    setExchange({
      id: draftId.current, revision: current.current?.revision ?? 0, status: "draft",
      delivery: current.current?.delivery ?? { pending: 0, sending: 0, sent: 0, failed: 0, unknown: 0 },
      ...desired.current,
    });
    setError("");
    if (!paused.current) void flush();
    return true;
  }

  async function discardChanges() {
    if (activeSave.current || locked.current) return;
    locked.current = true; setBusy(true);
    try {
      const saved = await request();
      pending.current = null; desired.current = null; paused.current = false;
      setSaveError(""); setError(""); accept(saved);
    } catch (failure) {
      setSaveError(failure instanceof Error ? failure.message : "No se pudo recuperar la versión guardada.");
    } finally { locked.current = false; setBusy(false); }
  }

  async function draw(retry: "failed" | "unknown" | null = null) {
    if (locked.current || !draftId.current) throw new Error("Primero crea una lista.");
    locked.current = true; setBusy(true); setError("");
    try {
      // Starting the draw is immediate, but it must use the fully saved roster.
      if (!await flush()) throw new Error("No se pudieron guardar los cambios. Reintenta el guardado antes de sortear.");
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
      // Recover a committed draw, but never overwrite unsaved draft changes.
      if (!pending.current && !desired.current) {
        try { accept(await request()); } catch { /* Keep the last acknowledged state. */ }
      }
      throw failure;
    } finally { locked.current = false; setBusy(false); }
  }

  async function finish(discard = false, archive = false) {
    if (locked.current || !draftId.current) return false;
    locked.current = true; setBusy(true); setError("");
    try {
      if (!await flush()) return false;
      await request(discard ? "DELETE" : "POST", { id: current.current!.id, action: archive ? "archive" : "complete" });
      accept(null);
      return true;
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No se pudo finalizar la lista.");
      return false;
    } finally { locked.current = false; setBusy(false); }
  }

  async function resetSession() {
    if (activeSave.current || pending.current || desired.current || locked.current) return;
    try { await request("DELETE", { action: "reset-session" }); await load(); }
    catch { setLoadError("No se pudo reiniciar la sesión."); }
  }

  return { exchange, loading, loadError, busy, saving, saveError, error, load, save, draw, finish, resetSession,
    discardChanges, hasPending: !!pending.current || !!desired.current, retrySave: flush };
}
