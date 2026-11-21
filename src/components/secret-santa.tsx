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
import { validateListDetails } from "@/utils/list-validation";
import { Participant } from "@/utils/types";
import StepFlow from "./step-flow";
import Modal from "./modal";
import AssignLoading from "./assign-loading";

export default function SecretSantaApp() {
  const remote = useExchange();
  const participants: Participant[] = remote.exchange?.participants ?? [];
  const listName = remote.exchange?.listName ?? "";
  const giftAmount = remote.exchange?.giftAmount;
  const flowComplete = !!remote.exchange;
  const readOnly = remote.exchange?.status === "drawn";
  const [assignError, setAssignError] = useState("");
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [participantErrors, setParticipantErrors] = useState<{ name?: string; email?: string }>({});
  const [isAssigning, setIsAssigning] = useState<boolean>(false);
  const [assignStatus, setAssignStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [assignDuration, setAssignDuration] = useState<number>(3000);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [flowStarted, setFlowStarted] = useState<boolean>(false);
  const { toast } = useToast();

  const addParticipant = () => {
    if (remote.busy) return;
    const errors: typeof participantErrors = {};
    if (!name.trim()) errors.name = "Por favor, ingresa un nombre.";
    if (!email.trim()) errors.email = "Por favor, ingresa un correo electrónico.";
    else if (!validateEmail(email.trim())) errors.email = "Por favor, ingresa un correo electrónico válido.";
    const duplicateEmail = participants.some((p) => p.id !== editingId && p.email.toLowerCase() === email.trim().toLowerCase());
    if (duplicateEmail) errors.email = "Este correo electrónico ya está registrado.";
    if (!editingId && participants.length >= 50) errors.name = "Se permiten hasta 50 participantes.";
    setParticipantErrors(errors);
    if (errors.name || errors.email) {
      (errors.name ? nameRef : emailRef).current?.focus();
      return;
    }

    const next = editingId
      ? participants.map((p) => p.id === editingId ? { ...p, name: name.trim(), email: email.trim() } : p)
      : [...participants, { id: uuidv4(), name: name.trim(), email: email.trim() }];
    if (remote.save({ participants: next, listName, giftAmount })) {
      setEditingId(null);
      setParticipantErrors({});
      setName(""); setEmail(""); setShowAddParticipant(false);
    }
  };

  const removeParticipant = (id: string) => {
    remote.save({ participants: participants.filter((p) => p.id !== id), listName, giftAmount });
  };

  const handleEditParticipant = (id: string) => {
    const participant = participants.find((p) => p.id === id);
    if (participant) {
      setParticipantErrors({});
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
    setShowAddParticipant(false);
    setShowEditList(false);
    setEditingId(null);
    setParticipantErrors({});
    setName(""); setEmail("");
    setFlowStarted(false);
  };

  // local UI state for minimalist cards + modal
  const [showEditList, setShowEditList] = useState<boolean>(false);
  const [listNameDraft, setListNameDraft] = useState<string>(listName);
  const [giftAmountDraft, setGiftAmountDraft] = useState<number | string>(giftAmount ?? "");
  const [showAddParticipant, setShowAddParticipant] = useState<boolean>(false);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const emailRef = useRef<HTMLInputElement | null>(null);
  const listNameRef = useRef<HTMLInputElement | null>(null);
  const listAmountRef = useRef<HTMLInputElement | null>(null);
  const [listErrors, setListErrors] = useState<{ name?: string; amount?: string }>({});

  useEffect(() => {
    setListNameDraft(listName);
    setGiftAmountDraft(giftAmount ?? "");
  }, [flowComplete, listName, giftAmount]);

  const loadErrorNotice = remote.loadError ? (
    <div className="mx-auto w-full max-w-lg rounded-xl bg-white/95 p-4 text-left shadow-sm space-y-3">
      <div role="alert" className="space-y-1">
        <p className="font-medium text-gray-900">No pudimos recuperar tu lista</p>
        <p className="text-sm text-gray-600">{remote.loadError}</p>
      </div>
      <div className="flex flex-col gap-2">
        <Button onClick={() => void remote.load()}>Reintentar carga</Button>
        <Button variant="outline" onClick={() => void remote.resetSession()}>Volver a empezar sin recuperar la lista anterior</Button>
      </div>
    </div>
  ) : null;

  return (
    <div className="min-h-dvh flex flex-col bg-gradient-to-b from-red-100 to-green-100">
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
        <main className="flex-1 px-2 py-6 sm:px-4 flex flex-col items-center justify-center gap-6">
          {remote.saveError && <div className="w-full max-w-2xl rounded-xl border border-red-200 bg-white p-4 space-y-3">
            <div role="alert" className="space-y-1">
              <p className="font-medium text-red-700">Hay cambios sin guardar</p>
              <p className="text-sm text-gray-700">{remote.saveError}</p>
              <p className="text-sm text-gray-600">Tus cambios siguen aquí. Reintenta antes de salir o sortear.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button disabled={remote.busy} onClick={() => void remote.retrySave()}>Reintentar guardado</Button>
              <Button variant="outline" disabled={remote.busy} onClick={() => void remote.discardChanges()}>Descartar cambios y recuperar lista guardada</Button>
            </div>
          </div>}
          {remote.error && !showAddParticipant && !showEditList && <div className="text-center text-sm" aria-live="polite">
            <div role="alert" className="text-red-700 space-y-2">
              <p>{remote.error}</p>
            </div>
          </div>}
          {flowComplete && loadErrorNotice}
          {!flowComplete && <div className="relative w-full max-w-[720px] mx-auto px-1">
            {!flowStarted && <div className="welcome-enter flex items-center justify-center">
              <div className="relative w-full px-4 py-10 text-center">
                {/* decorative blob */}
                <div
                  className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/3 w-[min(60vw,380px)] h-[min(60vw,380px)] rounded-full bg-gradient-to-r from-pink-300 to-amber-200 opacity-30 blur-2xl pointer-events-none"
                  aria-hidden
                />
                <div className="relative z-10">
                  <h1 className="text-3xl sm:text-4xl font-extrabold mb-3">Secret Santa</h1>
                  <p className="text-sm sm:text-base mb-6 max-w-lg mx-auto text-muted-foreground">
                    Organiza intercambios con un flujo limpio y guiado. Empieza en segundos desde tu móvil.
                  </p>
                  {loadErrorNotice || <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-5">
                    <Button
                      onClick={() => setFlowStarted(true)}
                      disabled={remote.loading}
                      aria-busy={remote.loading}
                      className="w-full sm:w-auto px-6 py-3 text-base sm:text-lg transition-colors duration-200 bg-gradient-to-r from-red-500 to-pink-500 text-white disabled:opacity-100"
                    >
                      Empezar ahora
                    </Button>
                  </div>}
                </div>
              </div>
            </div>}

            {/* Only mount the setup form when visible to avoid hidden-input focus. */}
            {flowStarted && !flowComplete ? (
              <div className="welcome-enter">
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
                      onComplete={(name, amount) => {
                        if (remote.save({ listName: name, giftAmount: amount, participants: [] })) setFlowStarted(false);
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>}
          {flowComplete && (
            <fieldset aria-label="Intercambio" aria-busy={remote.saving} disabled={remote.busy || remote.loading || !!remote.loadError} className="welcome-enter w-full max-w-2xl mx-auto p-2 space-y-4">
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
                  <Button variant="ghost" size="icon" onClick={() => { setListErrors({}); setShowEditList(true); }} aria-label="Editar lista" title="Editar lista" disabled={readOnly}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* list editing moved to modal */}

              {/* Card: Participants */}
              <div className="bg-white rounded-xl shadow-sm p-4">
                {participants.length > 0 ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="text-sm font-medium">Participantes</div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" onClick={() => { setParticipantErrors({}); setShowAddParticipant(true); }} title="Agregar participante" disabled={readOnly}>
                        <Plus className="h-4 w-4" />
                        <span>Agregar participante</span>
                      </Button>
                    </div>
                  </div>
                ) : null}

                {/* modal will handle composer and list editing */}

                {participants.length === 0 ? (
                  <div className="flex flex-col items-center py-8 gap-3 text-muted-foreground">
                    <div className="h-12 w-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                      <UserPlus className="h-6 w-6" />
                    </div>
                    <div className="text-sm font-medium">No hay participantes</div>
                    <Button
                      onClick={() => { setParticipantErrors({}); setShowAddParticipant(true); }}
                      variant="ghost"
                      className="mt-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center justify-center"
                      aria-label="Agregar participante"
                      disabled={readOnly}
                    >
                      <Plus className="h-4 w-4" />
                      <span>Agregar participante</span>
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
                        <div className="flex shrink-0 items-center">
                          <Button variant="ghost" size="icon" onClick={() => handleEditParticipant(p.id)} aria-label="Editar participante" disabled={readOnly}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => removeParticipant(p.id)} aria-label="Eliminar participante" disabled={readOnly}>
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
                    disabled={participants.length < 3 || isAssigning || remote.busy || !!remote.error || !!remote.saveError}
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
                setShowAddParticipant(false);
                setEditingId(null);
                setParticipantErrors({});
                setName("");
                setEmail("");
              } else {
                setShowAddParticipant(true);
              }
            }}
            title={editingId ? "Editar participante" : "Agregar participante"}
            description={editingId ? "Actualiza el participante." : "Agregar un nuevo participante a la lista."}
            onSubmit={() => void addParticipant()}
            footer={
              <div className="flex flex-col-reverse gap-2 min-[360px]:flex-row">
                <Button
                  variant="outline"
                  disabled={remote.busy}
                  onClick={() => {
                    setShowAddParticipant(false);
                    setEditingId(null);
                    setParticipantErrors({});
                    setName("");
                    setEmail("");
                  }}
                  className="flex-1 py-2 border-red-600 text-red-700 hover:bg-red-50"
                  aria-label="Cancelar"
                >
                  <X className="h-5 w-5" />
                  <span>Cancelar</span>
                </Button>

                <Button
                  disabled={remote.busy}
                  type="submit"
                  className="flex-[2] py-2 bg-green-600 hover:bg-green-700 text-white"
                  aria-label={editingId ? "Guardar" : "Agregar"}
                >
                  {editingId ? <Check className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                  <span>{remote.busy ? "Guardando..." : editingId ? "Guardar" : "Agregar"}</span>
                </Button>
              </div>
            }
          >
            <fieldset disabled={remote.busy} className="space-y-3">
              <div>
                <Label htmlFor="modal-name">Nombre</Label>
                <Input
                  ref={nameRef}
                  id="modal-name"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setParticipantErrors((errors) => ({ ...errors, name: undefined }));
                  }}
                  placeholder="Nombre"
                  autoComplete="section-participant name"
                  enterKeyHint="next"
                  maxLength={100}
                  aria-invalid={!!participantErrors.name}
                  aria-describedby={participantErrors.name ? "modal-name-error" : undefined}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") { event.preventDefault(); emailRef.current?.focus(); }
                  }}
                />
                {participantErrors.name && <p id="modal-name-error" role="alert" className="mt-1 text-sm text-red-700">{participantErrors.name}</p>}
              </div>
              <div>
                <Label htmlFor="modal-email">Email</Label>
                <Input
                  ref={emailRef}
                  id="modal-email"
                  type="email"
                  inputMode="email"
                  autoComplete="section-participant email"
                  autoCapitalize="none"
                  spellCheck={false}
                  enterKeyHint="done"
                  maxLength={254}
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setParticipantErrors((errors) => ({ ...errors, email: undefined }));
                  }}
                  placeholder="correo@ejemplo.com"
                  aria-invalid={!!participantErrors.email}
                  aria-describedby={participantErrors.email ? "modal-email-error" : undefined}
                />
                {participantErrors.email && <p id="modal-email-error" role="alert" className="mt-1 text-sm text-red-700">{participantErrors.email}</p>}
              </div>
            </fieldset>
          </Modal>

          <Modal
            open={showEditList}
            onOpenChange={(open) => {
              if (remote.busy) return;
              if (!open) {
                setShowEditList(false);
                setListNameDraft(listName);
                setGiftAmountDraft(giftAmount ?? "");
              } else {
                setShowEditList(true);
              }
            }}
            title="Editar lista"
            description="Cambia el nombre de la lista y el monto orientativo."
            onSubmit={() => {
              if (remote.busy) return;
              const amount = giftAmountDraft === "" ? undefined : Number(giftAmountDraft);
              const errors = validateListDetails(listNameDraft, amount);
              setListErrors(errors);
              if (errors.name || errors.amount) {
                (errors.name ? listNameRef : listAmountRef).current?.focus();
                return;
              }
              if (remote.save({ listName: listNameDraft.trim(), giftAmount: amount, participants })) setShowEditList(false);
            }}
            footer={
              <div className="flex flex-col-reverse gap-2 min-[360px]:flex-row">
                <Button
                  variant="outline"
                  disabled={remote.busy}
                  onClick={() => {
                    setShowEditList(false);
                    setListNameDraft(listName);
                    setGiftAmountDraft(giftAmount ?? "");
                  }}
                  className="flex-1 py-2 border-red-600 text-red-700 hover:bg-red-50"
                  aria-label="Cancelar"
                >
                  <X className="h-5 w-5" />
                  <span>Cancelar</span>
                </Button>

                <Button
                  disabled={remote.busy}
                  type="submit"
                  className="flex-[2] py-2 bg-green-600 hover:bg-green-700 text-white"
                  aria-label="Guardar"
                >
                  <Check className="h-5 w-5" />
                  <span>{remote.busy ? "Guardando..." : "Guardar"}</span>
                </Button>
              </div>
            }
          >
            <fieldset disabled={remote.busy} className="space-y-3">
              <div>
                <Label htmlFor="modal-list-name">Nombre de lista</Label>
                <Input ref={listNameRef} id="modal-list-name" maxLength={120} value={listNameDraft} onChange={(e) => { setListNameDraft(e.target.value); setListErrors((errors) => ({ ...errors, name: undefined })); }} placeholder="Ej: Oficina 2025" aria-invalid={!!listErrors.name} aria-describedby={listErrors.name ? "modal-list-name-error" : undefined} />
                {listErrors.name && <p id="modal-list-name-error" role="alert" className="mt-1 text-sm text-red-700">{listErrors.name}</p>}
              </div>
              <div>
                <Label htmlFor="modal-list-amount">Monto</Label>
                <Input
                  id="modal-list-amount"
                  ref={listAmountRef}
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  max="9999999999.99"
                  value={giftAmountDraft}
                  onChange={(e) => { setGiftAmountDraft(e.target.value); setListErrors((errors) => ({ ...errors, amount: undefined })); }}
                  placeholder="Ej: 20"
                  aria-invalid={!!listErrors.amount}
                  aria-describedby={listErrors.amount ? "modal-list-amount-error" : undefined}
                />
                {listErrors.amount && <p id="modal-list-amount-error" role="alert" className="mt-1 text-sm text-red-700">{listErrors.amount}</p>}
              </div>
            </fieldset>
          </Modal>

        </main>
      )}
      <footer className="shrink-0 flex justify-center px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Link
          href="/help"
          aria-label="¿Cómo funciona? (ayuda)"
          className="inline-flex min-h-12 items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:underline"
        >
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
          <span>¿Cómo funciona?</span>
        </Link>
      </footer>
    </div>
  );
}
