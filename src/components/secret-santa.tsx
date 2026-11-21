"use client";

import { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// using simpler panel style for summary — card primitives not needed here
// table UI not used in minimalist list
import { Toaster } from "@/components/ui/toaster";
import { Gift, Pencil, Trash2, Plus, UserPlus, X, Check, HelpCircle } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { useExchange } from "@/hooks/use-exchange";
import { Spinner } from "./spinner";
import { validateEmail } from "@/utils/utils";
import { Participant } from "@/utils/types";
import StepFlow from "./step-flow";
import Modal from "./modal";
import AssignLoading from "./assign-loading";

export default function SecretSantaApp() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const remote = useExchange();
  const readOnly = remote.exchange?.status === "drawn";
  const [assignError, setAssignError] = useState("");
  const [listName, setListName] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [giftAmount, setGiftAmount] = useState<number | undefined>(undefined);
  const [isAssigning, setIsAssigning] = useState<boolean>(false);
  const [assignStatus, setAssignStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [assignDuration, setAssignDuration] = useState<number>(3000);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [flowStarted, setFlowStarted] = useState<boolean>(false);
  const [flowComplete, setFlowComplete] = useState<boolean>(false);
  const [ctaVisible, setCtaVisible] = useState<boolean>(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!remote.exchange) {
      if (!remote.loading && !remote.loadError) {
        setParticipants([]); setListName(""); setGiftAmount(undefined);
        setFlowComplete(false); setFlowStarted(false);
        setShowEditList(false); setShowAddParticipant(false);
      }
      return;
    }
    setParticipants(remote.exchange.participants);
    setListName(remote.exchange.listName || "");
    setGiftAmount(remote.exchange.giftAmount);
    setFlowComplete(true);
    setFlowStarted(false);
  }, [remote.exchange, remote.loading, remote.loadError]);

  useEffect(() => {
    // small delay to trigger the CTA mount animation
    const t = setTimeout(() => setCtaVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  const addParticipant = async () => {
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Por favor, ingresa un nombre.",
        variant: "destructive",
      });
      return;
    }

    if (!email.trim()) {
      toast({
        title: "Error",
        description: "Por favor, ingresa un correo electrónico.",
        variant: "destructive",
      });
      return;
    }

    if (!validateEmail(email.trim())) {
      toast({
        title: "Error",
        description: "Por favor, ingresa un correo electrónico válido.",
        variant: "destructive",
      });
      return;
    }

    const duplicateEmail = participants.some((p) => p.id !== editingId && p.email.toLowerCase() === email.trim().toLowerCase());
    if (duplicateEmail) {
      toast({
        title: "Error",
        description: "Este correo electrónico ya está registrado.",
        variant: "destructive",
      });
      return;
    }

    const next = editingId
      ? participants.map((p) => p.id === editingId ? { ...p, name: name.trim(), email: email.trim() } : p)
      : [...participants, { id: uuidv4(), name: name.trim(), email: email.trim() }];
    if (await remote.save({ participants: next, listName, giftAmount })) {
      setEditingId(null);
      setName(""); setEmail(""); setShowAddParticipant(false);
    }
  };

  const removeParticipant = async (id: string) => {
    await remote.save({ participants: participants.filter((p) => p.id !== id), listName, giftAmount });
  };

  const handleEditParticipant = (id: string) => {
    const participant = participants.find((p) => p.id === id);
    if (participant) {
      setEditingId(id);
      setName(participant.name);
      setEmail(participant.email);
      setShowAddParticipant(true);
    }
  };

  const handleAssign = async (retry: "failed" | "unknown" | null = null) => {
    if (participants.length < 3 || remote.busy) return;
    setAssignDuration(3000);
    setAssignStatus("loading");
    setIsAssigning(true);
    setAssignError("");
    try {
      await remote.draw(retry);
      setAssignStatus("success");
    } catch (failure) {
      setAssignError(failure instanceof Error ? failure.message : "No se pudieron enviar los correos. Intenta nuevamente.");
      setAssignStatus("error");
    } finally { setIsAssigning(false); }
  };

  // loading overlay messages
  const assignMessages = [
    "Se están barajando los nombres...",
    "Preparando los sobres virtuales...",
    "Mirando la lista dos veces...",
    "¡Casi listo! Enviando notificaciones...",
  ];

  const resetApp = () => {
    setParticipants([]);
    setShowAddParticipant(false);
    setShowEditList(false);
    setEditingId(null);
    setName(""); setEmail("");
    setListName("");
    setGiftAmount(undefined);
    setFlowStarted(false);
    setFlowComplete(false);
  };

  // local UI state for minimalist cards + modal
  const [showEditList, setShowEditList] = useState<boolean>(false);
  const [listNameDraft, setListNameDraft] = useState<string>(listName);
  const [giftAmountDraft, setGiftAmountDraft] = useState<number | string>(giftAmount ?? "");
  const [showAddParticipant, setShowAddParticipant] = useState<boolean>(false);
  const nameRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setListNameDraft(listName);
    setGiftAmountDraft(giftAmount ?? "");
  }, [flowComplete, listName, giftAmount]);

  useEffect(() => {
    if (showAddParticipant || showEditList) {
      // small delay to ensure modal mounts
      setTimeout(() => nameRef.current?.focus(), 50);
    }
  }, [showAddParticipant, showEditList]);

  if (remote.loading || remote.loadError) return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-4 p-6 text-center">
      <p role="status">{remote.loading ? "Cargando tu lista..." : remote.loadError}</p>
      {remote.loadError && <>
        <Button onClick={() => void remote.load()}>Reintentar carga</Button>
        <Button variant="outline" onClick={() => void remote.resetSession()}>Volver a empezar sin recuperar la lista anterior</Button>
      </>}
    </main>
  );

  return (
    <>
      <Toaster />
      {assignStatus !== "idle" ? (
        <AssignLoading
          open={true}
          messages={assignMessages}
          fullScreen
          status={assignStatus}
          duration={assignDuration}
          errorMessage={assignError}
          onDone={async () => {
            if (assignStatus === "success") {
              if (!await remote.finish()) {
                toast({ title: "No se pudo cerrar la lista", description: "Pulsa Listo para reintentar. Los correos enviados no se repetirán.", variant: "destructive" });
                return;
              }
              resetApp();
            }
            setAssignStatus("idle");
          }}
        />
      ) : (
        <div className="min-h-dvh bg-gradient-to-b from-red-100 to-green-100 p-2 sm:p-4 flex flex-col items-center justify-center gap-6">
          <div className="text-center text-sm" aria-live="polite">
            <p role="status">{remote.busy ? "Guardando cambios..." : remote.exchange ? "Guardado" : ""}</p>
            {remote.error && !showAddParticipant && !showEditList && <div role="alert" className="text-red-700 space-y-2">
              <p>{remote.error}</p>
              {remote.hasPending && <Button variant="outline" disabled={remote.busy} onClick={async () => {
                if (await remote.retrySave()) { setShowAddParticipant(false); setShowEditList(false); setEditingId(null); setName(""); setEmail(""); }
              }}>Reintentar guardado</Button>}
              <Button variant="outline" onClick={() => window.location.reload()}>Recargar lista guardada</Button>
            </div>}
          </div>
          <div className="relative w-full max-w-[720px] mx-auto h-auto px-1">
            {/* CTA (overlays with StepFlow) */}
            <div
              className={`absolute inset-0 flex items-center justify-center
                ${
                  flowStarted || flowComplete
                    ? "opacity-0 pointer-events-none cta-exit"
                    : ctaVisible
                    ? "opacity-100 translate-y-0 cta-entrance"
                    : "opacity-0 translate-y-4"
                }`}
            >
              <div
                className="relative w-full px-4 py-10 text-center"
                style={
                  {
                    // custom stagger timings for CTA micro-animations
                    // title, subtitle, buttons, and blob can be tuned here
                    "--cta-title-delay": "180ms",
                    "--cta-sub-delay": "340ms",
                    "--cta-buttons-delay": "540ms",
                    "--cta-btn-primary-delay": "700ms",
                    "--cta-btn-ghost-delay": "820ms",
                    "--cta-blob-delay": "60ms",
                  } as React.CSSProperties
                }
              >
                {/* decorative blob */}
                <div
                  className={`absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/3 w-[min(60vw,380px)] h-[min(60vw,380px)] rounded-full bg-gradient-to-r from-pink-300 to-amber-200 opacity-30 blur-2xl pointer-events-none ${
                    ctaVisible ? "cta-blob" : ""
                  }`}
                  aria-hidden
                />
                <div className="relative z-10">
                  <h1 className={`text-3xl sm:text-4xl font-extrabold mb-3 ${ctaVisible ? "cta-title" : "opacity-0"}`}>Secret Santa</h1>
                  <p className={`text-sm sm:text-base mb-6 max-w-lg mx-auto text-muted-foreground ${ctaVisible ? "cta-sub" : "opacity-0"}`}>
                    Organiza intercambios con un flujo limpio y guiado. Empieza en segundos desde tu móvil.
                  </p>
                  <div className={`flex flex-col sm:flex-row items-center justify-center ${ctaVisible ? "cta-buttons" : "opacity-0"} gap-3 sm:gap-5`}>
                    <Button
                      onClick={() => setFlowStarted(true)}
                      className="cta-btn-primary w-full sm:w-auto px-6 py-3 text-base sm:text-lg transform transition-all duration-300 hover:scale-105 bg-gradient-to-r from-red-500 to-pink-500 text-white"
                    >
                      Empezar ahora
                    </Button>
                  </div>

                  {/* helper link moved to bottom of screen */}
                </div>
              </div>
            </div>

            {/* StepFlow overlay — only mount StepFlow when visible to avoid hidden-input focus */}
            {flowStarted && !flowComplete ? (
              <div className="absolute inset-0 transition-opacity duration-700 ease-in-out opacity-100 z-20">
                <div className="w-full h-full flex items-center justify-center px-1 sm:px-2 py-3">
                  <div className="w-full">
                    <StepFlow
                      initialName={listName}
                      initialAmount={giftAmount}
                      autoFocus={false}
                      onCancel={() => {
                        setFlowStarted(false);
                      }}
                      busy={remote.busy}
                      onComplete={async (name, amount) => {
                        await remote.save({ listName: name, giftAmount: amount, participants: [] });
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          {flowComplete && (
            <fieldset disabled={remote.busy} className="w-full max-w-2xl mx-auto p-2 space-y-4">
              {/* Card: List info (minimal) */}
              <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-sm p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                    <Gift />
                  </div>
                  <div className="min-w-0">
                    <div className="text-lg font-semibold truncate">{listName || "Sin nombre de lista"}</div>
                    <div className="text-xs text-muted-foreground">{giftAmount !== undefined ? `Presupuesto: $${giftAmount}` : "Sin presupuesto definido"}</div>
                  </div>
                </div>
                <div>
                  <Button variant="ghost" onClick={() => setShowEditList((s) => !s)} title="Editar lista" disabled={readOnly}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* list editing moved to modal */}

              {/* Card: Participants */}
              <div className="bg-white rounded-xl shadow-sm p-4">
                {participants.length > 0 ? (
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium">Participantes</div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" onClick={() => setShowAddParticipant((s) => !s)} title="Agregar participante" disabled={readOnly}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : null}

                {/* modal will handle composer and list editing */}

                {participants.length === 0 && !showAddParticipant ? (
                  <div className="flex flex-col items-center py-8 gap-3 text-muted-foreground">
                    <div className="h-12 w-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                      <UserPlus className="h-6 w-6" />
                    </div>
                    <div className="text-sm font-medium">No hay participantes</div>
                    <Button
                      onClick={() => setShowAddParticipant(true)}
                      variant="ghost"
                      className="mt-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center justify-center"
                      aria-label="Agregar participante"
                      disabled={readOnly}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {participants.map((p) => (
                      <li key={p.id} className="flex items-center justify-between p-2 rounded-md border border-gray-100">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-700">
                            {p.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{p.name}</div>
                            <div className="text-xs text-muted-foreground truncate">{p.email}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" onClick={() => handleEditParticipant(p.id)} aria-label="Editar participante" disabled={readOnly}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" onClick={() => removeParticipant(p.id)} aria-label="Eliminar participante" disabled={readOnly}>
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Card: Finalize (minimal) */}
              <div className="bg-white/95 rounded-xl shadow-sm p-4">
                <div className="text-center">
                  <Button
                    onClick={() => void handleAssign()}
                    disabled={participants.length < 3 || isAssigning || remote.busy || !!remote.error}
                    className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-3 rounded-md disabled:opacity-60"
                    aria-label={readOnly ? "Continuar envío de correos" : "Asignar Secret Santas"}
                  >
                    {isAssigning ? (
                      <>
                        <Spinner className="h-5 w-5" />
                        <span>Asignando...</span>
                      </>
                    ) : (
                      <>
                        <Gift className="h-5 w-5" />
                        <span>{readOnly ? "Continuar envío de correos" : "Asignar Secret Santas"}</span>
                      </>
                    )}
                  </Button>

                  {readOnly ? <div className="mt-3 space-y-2 text-sm" role="status">
                    <p>El sorteo está guardado. Las asignaciones no cambiarán.</p>
                    <p>{remote.exchange?.delivery.sent} de {participants.length} correos enviados.</p>
                    {!!remote.exchange?.delivery.failed && <Button variant="outline" onClick={() => void handleAssign("failed")}>Reintentar correos fallidos</Button>}
                    {!!remote.exchange?.delivery.unknown && <div>
                      <p>No pudimos confirmar algunos envíos. Reenviarlos puede duplicar esos correos, siempre con la misma asignación.</p>
                      <Button variant="outline" onClick={() => void handleAssign("unknown")}>Reenviar correos sin confirmación</Button>
                    </div>}
                    {!!remote.exchange?.delivery.sending && <Button variant="outline" onClick={() => void remote.load()}>Actualizar estado de envíos</Button>}
                    <p className="text-xs">Hasta 5 intentos por correo.</p>
                    <p className="text-xs">Puedes cerrar este sorteo y crear otro. Los correos pendientes no se enviarán; un envío que ya está en curso puede terminar.</p>
                    <Button variant="ghost" onClick={async () => { if (await remote.finish(false, true)) resetApp(); }}>Cerrar sorteo sin enviar los pendientes</Button>
                  </div> : <>
                    <div className="mt-2 text-xs text-muted-foreground">Se necesitan al menos 3 participantes para asignar.</div>
                    <Button variant="ghost" onClick={async () => { if (await remote.finish(true)) resetApp(); }}>Descartar lista</Button>
                  </>}
                </div>
              </div>
            </fieldset>
          )}
          {/* Modals */}
          <Modal
            open={showAddParticipant}
            onOpenChange={(open) => {
              if (remote.busy) return;
              if (!open) {
                remote.cancelEdit();
                setShowAddParticipant(false);
                setEditingId(null);
                setName("");
                setEmail("");
              } else {
                setShowAddParticipant(true);
              }
            }}
            title={editingId ? "Editar participante" : "Agregar participante"}
            description={editingId ? "Actualiza el participante." : "Agregar un nuevo participante a la lista."}
            footer={
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={remote.busy}
                  onClick={() => {
                    remote.cancelEdit();
                    setShowAddParticipant(false);
                    setEditingId(null);
                    setName("");
                    setEmail("");
                  }}
                  className="flex-1 py-2 border-red-600 text-red-700 hover:bg-red-50"
                  aria-label="Cancelar"
                >
                  <X className="h-5 w-5" />
                  <span className="sr-only">Cancelar</span>
                </Button>

                <Button
                  disabled={remote.busy}
                  onClick={() => void addParticipant()}
                  className="flex-[2] py-2 bg-green-600 hover:bg-green-700 text-white"
                  aria-label={editingId ? "Guardar" : "Agregar"}
                >
                  {editingId ? <Check className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                  <span className="sr-only">{editingId ? "Guardar" : "Agregar"}</span>
                </Button>
              </div>
            }
          >
            <fieldset disabled={remote.busy} className="space-y-3">
              {remote.error && <p role="alert" className="text-sm text-red-700">{remote.error}</p>}
              <div>
                <Label htmlFor="modal-name">Nombre</Label>
                <Input ref={nameRef} id="modal-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" />
              </div>
              <div>
                <Label htmlFor="modal-email">Email</Label>
                <Input id="modal-email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@ejemplo.com" />
              </div>
            </fieldset>
          </Modal>

          <Modal
            open={showEditList}
            onOpenChange={(open) => {
              if (remote.busy) return;
              if (!open) {
                remote.cancelEdit();
                setShowEditList(false);
                setListNameDraft(listName);
                setGiftAmountDraft(giftAmount ?? "");
              } else {
                setShowEditList(true);
              }
            }}
            title="Editar lista"
            description="Cambia el nombre de la lista y el monto orientativo."
            footer={
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={remote.busy}
                  onClick={() => {
                    remote.cancelEdit();
                    setShowEditList(false);
                    setListNameDraft(listName);
                    setGiftAmountDraft(giftAmount ?? "");
                  }}
                  className="flex-1 py-2 border-red-600 text-red-700 hover:bg-red-50"
                  aria-label="Cancelar"
                >
                  <X className="h-5 w-5" />
                  <span className="sr-only">Cancelar</span>
                </Button>

                <Button
                  disabled={remote.busy}
                  onClick={async () => {
                    if (await remote.save({ listName: listNameDraft.trim(), giftAmount: giftAmountDraft === "" ? undefined : Number(giftAmountDraft), participants })) setShowEditList(false);
                  }}
                  className="flex-[2] py-2 bg-green-600 hover:bg-green-700 text-white"
                  aria-label="Guardar"
                >
                  <Check className="h-5 w-5" />
                  <span className="sr-only">Guardar</span>
                </Button>
              </div>
            }
          >
            <fieldset disabled={remote.busy} className="space-y-3">
              {remote.error && <p role="alert" className="text-sm text-red-700">{remote.error}</p>}
              <div>
                <Label htmlFor="modal-list-name">Nombre de lista</Label>
                <Input id="modal-list-name" value={listNameDraft} onChange={(e) => setListNameDraft(e.target.value)} placeholder="Ej: Oficina 2025" />
              </div>
              <div>
                <Label htmlFor="modal-list-amount">Monto</Label>
                <Input
                  id="modal-list-amount"
                  type="number"
                  value={giftAmountDraft}
                  onChange={(e) => setGiftAmountDraft(e.target.value)}
                  placeholder="Ej: 20"
                />
              </div>
            </fieldset>
          </Modal>

          {/* Fixed bottom help link (animated with CTA) */}
          <div
            className={`fixed left-0 right-0 bottom-4 flex justify-center z-40 transition-all duration-400 ease-out ${
              ctaVisible ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-2 pointer-events-none"
            }`}
            style={{ transitionDelay: ctaVisible ? "880ms" : "0ms" }}
          >
            <Link
              href="/help"
              aria-label="Cómo funciona (ayuda)"
              className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:underline"
            >
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
              <span>Cómo funciona</span>
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
