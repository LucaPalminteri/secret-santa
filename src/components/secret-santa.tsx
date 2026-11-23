"use client";

import { useId, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { BrandIllustration } from "./brand";
import Link from "next/link";
import { useExchange } from "@/hooks/use-exchange";
import { useToast } from "@/hooks/use-toast";
import { validateEmail } from "@/utils/utils";
import { validateListDetails } from "@/utils/list-validation";
import { settleEntranceOnEnd, settleEntranceOnFocus } from "@/lib/entrance";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Toaster } from "./ui/toaster";
import EditDrawer from "./edit-drawer";
import ExchangeDetailsForm from "./exchange-details-form";
import AssignLoading from "./assign-loading";

const formatBudget = (amount?: number) =>
  amount === undefined
    ? "Sin presupuesto definido"
    : `ARS ${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(amount)} por regalo`;

type ParticipantDraft = {
  name: string;
  email: string;
  errors: { name?: string; email?: string };
};

const emptyParticipant: ParticipantDraft = { name: "", email: "", errors: {} };

function ParticipantFields({
  draft,
  onChange,
  disabled,
  className = "space-y-4",
}: {
  draft: ParticipantDraft;
  onChange: (draft: ParticipantDraft) => void;
  disabled: boolean;
  className?: string;
}) {
  const id = useId();
  const emailRef = useRef<HTMLInputElement>(null);
  const { name, email, errors } = draft;

  return (
    <fieldset disabled={disabled} className={className}>
      <div className="space-y-2">
        <Label htmlFor={`${id}-name`}>Nombre</Label>
        <Input
          id={`${id}-name`}
          name="name"
          maxLength={100}
          placeholder="Nombre y apellido"
          autoComplete="section-participant name"
          enterKeyHint="next"
          value={name}
          onChange={(event) => {
            onChange({
              ...draft,
              name: event.target.value,
              errors: { ...errors, name: undefined },
            });
          }}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? `${id}-name-error` : undefined}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              emailRef.current?.focus();
            }
          }}
        />
        {errors.name && (
          <p id={`${id}-name-error`} role="alert" className="field-error">
            {errors.name}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${id}-email`}>Email</Label>
        <Input
          ref={emailRef}
          id={`${id}-email`}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="section-participant email"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="done"
          maxLength={254}
          placeholder="nombre@ejemplo.com"
          value={email}
          onChange={(event) => {
            onChange({
              ...draft,
              email: event.target.value,
              errors: { ...errors, email: undefined },
            });
          }}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? `${id}-email-error` : undefined}
        />
        {errors.email && (
          <p id={`${id}-email-error`} role="alert" className="field-error">
            {errors.email}
          </p>
        )}
      </div>
    </fieldset>
  );
}

export default function SecretSantaApp() {
  const remote = useExchange();
  const participants = remote.exchange?.participants ?? [];
  const listName = remote.exchange?.listName ?? "";
  const giftAmount = remote.exchange?.giftAmount;
  const readOnly = remote.exchange?.status === "drawn";
  const [setupStarted, setSetupStarted] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [newParticipant, setNewParticipant] =
    useState(emptyParticipant);
  const [participantDraft, setParticipantDraft] =
    useState(emptyParticipant);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [showEditList, setShowEditList] = useState(false);
  const [listNameDraft, setListNameDraft] = useState(listName);
  const [giftAmountDraft, setGiftAmountDraft] = useState(
    giftAmount?.toString() ?? "",
  );
  const [listErrors, setListErrors] = useState<{
    name?: string;
    amount?: string;
  }>({});
  const [assignStatus, setAssignStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [assignError, setAssignError] = useState("");
  const participantEditTrigger = useRef<HTMLButtonElement>(null);
  const listEditTrigger = useRef<HTMLButtonElement>(null);
  const listNameRef = useRef<HTMLInputElement>(null);
  const listAmountRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const atWelcome =
    !remote.exchange &&
    !setupStarted &&
    !remote.loadError &&
    assignStatus === "idle";

  function saveParticipant(form: HTMLFormElement, id: string | null) {
    if (remote.busy) return;
    const draft = id ? participantDraft : newParticipant;
    const name = draft.name.trim();
    const email = draft.email.trim();
    const errors: ParticipantDraft["errors"] = {};
    if (!name) errors.name = "Por favor, ingresa un nombre.";
    if (!email)
      errors.email = "Por favor, ingresa un correo electrónico.";
    else if (!validateEmail(email))
      errors.email = "Por favor, ingresa un correo electrónico válido.";
    if (
      participants.some(
        (person) =>
          person.id !== id &&
          person.email.toLowerCase() === email.toLowerCase(),
      )
    )
      errors.email = "Este correo electrónico ya está registrado.";
    if (!id && participants.length >= 50)
      errors.name = "Se permiten hasta 50 participantes.";

    const { elements } = form;
    const nameInput = elements.namedItem("name") as HTMLInputElement;
    const emailInput = elements.namedItem("email") as HTMLInputElement;
    if (errors.name || errors.email) {
      const setDraft = id ? setParticipantDraft : setNewParticipant;
      setDraft({ ...draft, errors });
      (errors.name ? nameInput : emailInput).focus();
      return;
    }

    const next = id
      ? participants.map((person) =>
          person.id === id ? { ...person, name, email } : person,
        )
      : [...participants, { id: uuidv4(), name, email }];
    if (remote.save({ participants: next, listName, giftAmount })) {
      setAnnouncement(`${name} ${id ? "actualizado" : "agregado"}.`);
      if (id) setEditingId(null);
      else {
        setNewParticipant(emptyParticipant);
        nameInput.focus();
      }
    }
  }

  async function handleAssign(retry: "failed" | "unknown" | null = null) {
    if (remote.busy || participants.length < 3) return;
    setAssignError("");
    setAssignStatus("loading");
    try {
      await remote.draw(retry);
      setAssignStatus("success");
    } catch (failure) {
      setAssignError(
        failure instanceof Error
          ? failure.message
          : "No se pudieron enviar los correos. Intenta nuevamente.",
      );
      setAssignStatus("error");
    }
  }

  function resetApp() {
    setSetupStarted(false);
    setReviewing(false);
    setShowEditList(false);
    setEditingId(null);
    setNewParticipant(emptyParticipant);
  }

  const roster = (
    <ul aria-label="Lista de participantes" className="divide-y divide-border">
      {participants.map((person) => (
        <li
          key={person.id}
          className="participant-enter flex items-center justify-between gap-2 py-4"
        >
          <div className="min-w-0 flex-1">
            <p className="break-words font-medium">{person.name}</p>
            <p className="break-all text-sm text-muted-foreground">
              {person.email}
            </p>
          </div>
          {!reviewing && !readOnly && (
            <div className="flex shrink-0">
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Editar participante: ${person.name}`}
                aria-haspopup="dialog"
                onClick={(event) => {
                  participantEditTrigger.current = event.currentTarget;
                  setParticipantDraft({
                    name: person.name,
                    email: person.email,
                    errors: {},
                  });
                  setEditingId(person.id);
                }}
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Eliminar participante: ${person.name}`}
                className="text-muted-foreground hover:text-red-700"
                onClick={() => {
                  remote.save({
                    listName,
                    giftAmount,
                    participants: participants.filter(
                      (item) => item.id !== person.id,
                    ),
                  });
                  setAnnouncement(`${person.name} eliminado.`);
                }}
              >
                <Trash2 />
              </Button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <div
      className="app-shell min-h-dvh flex flex-col bg-background text-foreground [overflow-anchor:none]"
      onFocusCapture={settleEntranceOnFocus}
      onAnimationEndCapture={settleEntranceOnEnd}
    >
      <Toaster />
      <main
        className={`mx-auto w-full max-w-xl flex-1 px-6 py-6 ${atWelcome || assignStatus !== "idle" ? "flex flex-col justify-center" : "sm:pt-10"}`}
      >
        {remote.saveError && (
          <aside className="mb-6 border-l-2 border-red-600 bg-red-50/50 p-4">
            <div role="alert" className="space-y-1">
              <p className="font-medium">Hay cambios sin guardar</p>
              <p className="text-sm text-muted-foreground">
                {remote.saveError}
              </p>
              <p className="text-sm text-muted-foreground">
                Tus cambios siguen aquí. Reintenta antes de salir o sortear.
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={remote.busy}
                onClick={() => void remote.retrySave()}
              >
                Reintentar guardado
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={remote.busy}
                onClick={() => void remote.discardChanges()}
              >
                Descartar cambios y recuperar lista guardada
              </Button>
            </div>
          </aside>
        )}
        {remote.error && (
          <p role="alert" className="mb-4 field-error">
            {remote.error}
          </p>
        )}
        {remote.loadError ? (
          <section className="welcome-enter">
            <h1 className="page-title">No pudimos recuperar tu lista</h1>
            <p role="alert" className="mt-3 text-muted-foreground">
              {remote.loadError}
            </p>
            <div className="mt-8 flex flex-col gap-2">
              <Button onClick={() => void remote.load()}>
                Reintentar carga
              </Button>
              <Button
                variant="outline"
                onClick={() => void remote.resetSession()}
              >
                Volver a empezar sin recuperar la lista anterior
              </Button>
            </div>
          </section>
        ) : assignStatus !== "idle" ? (
          <AssignLoading
            status={assignStatus}
            errorMessage={assignError}
            sent={remote.exchange?.delivery.sent ?? 0}
            total={participants.length}
            busy={remote.busy}
            onDone={async () => {
              if (assignStatus === "success") {
                if (!(await remote.finish())) {
                  toast({
                    title: "No se pudo cerrar la lista",
                    description:
                      "Pulsa Listo para reintentar. Los correos enviados no se repetirán.",
                    variant: "destructive",
                  });
                  return;
                }
                resetApp();
              }
              setAssignStatus("idle");
            }}
          />
        ) : !remote.exchange ? (
          <>
            {!setupStarted && (
              <section
                className="welcome-screen stagger-in text-center"
                aria-labelledby="welcome-title"
              >
                <BrandIllustration
                  scene="welcome"
                  priority
                  className="welcome-art reveal reveal-0"
                />
                <h1
                  id="welcome-title"
                  className="welcome-title reveal reveal-1"
                >
                  Una sorpresa para compartir.
                </h1>
                <p className="welcome-copy reveal reveal-2 mx-auto">
                  Sortea los nombres y envía las asignaciones por correo.
                </p>
                <Button
                  className="reveal reveal-3 mt-8 w-full"
                  disabled={remote.loading}
                  aria-busy={remote.loading}
                  onClick={() => {
                    setSetupStarted(true);
                    window.scrollTo({ top: 0 });
                  }}
                >
                  Empezar
                </Button>
              </section>
            )}
            <section
              hidden={!setupStarted}
              className={setupStarted ? "welcome-enter" : undefined}
            >
              <Button
                variant="ghost"
                className="-ml-4 mb-5 font-semibold"
                aria-label="Volver al inicio"
                onClick={() => {
                  setSetupStarted(false);
                  window.scrollTo({ top: 0 });
                }}
              >
                <ArrowLeft aria-hidden />
                Volver
              </Button>
              <div className="mb-8 flex items-center justify-between gap-4">
                <h1 className="page-title">Prepara el sorteo.</h1>
                <BrandIllustration
                  scene="gift"
                  className="h-20 w-20 shrink-0"
                />
              </div>
              <ExchangeDetailsForm
                disabled={remote.loading}
                onComplete={(nextName, amount) => {
                  if (
                    remote.save({
                      listName: nextName,
                      giftAmount: amount,
                      participants: [],
                    })
                  ) {
                    resetApp();
                    window.scrollTo({ top: 0 });
                  }
                }}
              />
            </section>
          </>
        ) : (
          <fieldset
            key={reviewing && !readOnly ? "review" : "participants"}
            aria-label="Sorteo"
            aria-busy={remote.saving}
            disabled={remote.busy || remote.loading}
            className="welcome-enter min-w-0"
          >
            {reviewing && !readOnly ? (
              <>
                <Button
                  variant="ghost"
                  className="-ml-4 mb-5"
                  onClick={() => {
                    setReviewing(false);
                    window.scrollTo({ top: 0 });
                  }}
                >
                  Volver a participantes
                </Button>
                <h1 className="page-title">Revisa el sorteo.</h1>
                <p className="mt-3 text-muted-foreground">
                  Revisa los correos. Al sortear, enviaremos las asignaciones.
                </p>
                <div className="mt-8 border-y border-border py-5">
                  <h2 className="font-medium">{listName}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatBudget(giftAmount)}
                  </p>
                </div>
                <h2 className="mt-6 text-sm font-medium">
                  {participants.length} participantes
                </h2>
                {roster}
                <div className="action-dock sticky bottom-0 -mx-6 mt-6 border-t border-border bg-background px-6 py-3">
                  <Button
                    className="reveal action-reveal w-full"
                    disabled={participants.length < 3 || !!remote.saveError}
                    onClick={() => void handleAssign()}
                  >
                    Sortear y enviar correos
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3 border-b border-border pb-6">
                  <div className="min-w-0">
                    <h1 className="page-title break-words">{listName}</h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {formatBudget(giftAmount)}
                    </p>
                  </div>
                  <Button
                    ref={listEditTrigger}
                    variant="ghost"
                    disabled={readOnly}
                    aria-label="Editar lista"
                    aria-haspopup="dialog"
                    onClick={() => {
                      setListNameDraft(listName);
                      setGiftAmountDraft(giftAmount?.toString() ?? "");
                      setListErrors({});
                      setShowEditList(true);
                    }}
                  >
                    Editar
                  </Button>
                </div>
                <div className="mt-7 mb-6">
                  <h2 className="flex items-baseline gap-2 text-lg font-semibold">
                    Participantes{" "}
                    <span
                      aria-label={`${participants.length} participantes`}
                      className="text-sm font-normal text-muted-foreground"
                    >
                      {participants.length}
                    </span>
                  </h2>
                  {!readOnly && (
                    <p
                      className="mt-2 text-sm text-muted-foreground"
                      aria-live="polite"
                    >
                      {participants.length >= 3
                        ? "Todo listo para sortear."
                        : participants.length === 2
                          ? "Falta 1 persona."
                          : `Agrega ${3 - participants.length} personas más.`}
                    </p>
                  )}
                </div>
                {!readOnly && (
                  <form
                    aria-label="Agregar participante"
                    noValidate
                    className="mb-5"
                    onSubmit={(event) => {
                      event.preventDefault();
                      saveParticipant(event.currentTarget, null);
                    }}
                  >
                    <ParticipantFields
                      draft={newParticipant}
                      onChange={setNewParticipant}
                      disabled={remote.busy}
                      className="stagger-fields space-y-4"
                    />
                    <Button
                      type="submit"
                      variant="outline"
                      className="reveal participant-submit mt-5 w-full"
                      disabled={remote.busy || participants.length >= 50}
                    >
                      Agregar participante
                    </Button>
                  </form>
                )}
                <p className="sr-only" role="status">
                  {announcement}
                </p>
                {participants.length > 0 && (
                  <div className="border-t border-border">{roster}</div>
                )}
                {readOnly ? (
                  <section className="mt-8 space-y-4 border-t border-border pt-6">
                    <h2 className="text-lg font-semibold">Estado del envío</h2>
                    <p role="status" className="text-muted-foreground">
                      {remote.exchange.delivery.sent} de {participants.length}{" "}
                      correos enviados. Las asignaciones no cambiarán.
                    </p>
                    <Button
                      className="w-full"
                      disabled={!!remote.saveError}
                      onClick={() => void handleAssign()}
                    >
                      Continuar envío de correos
                    </Button>
                    {!!remote.exchange.delivery.failed && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => void handleAssign("failed")}
                      >
                        Reintentar correos fallidos
                      </Button>
                    )}
                    {!!remote.exchange.delivery.unknown && (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          No pudimos confirmar algunos envíos. Reenviarlos puede
                          duplicar esos correos, siempre con la misma
                          asignación.
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => void handleAssign("unknown")}
                        >
                          Reenviar correos sin confirmación
                        </Button>
                      </div>
                    )}
                    {!!remote.exchange.delivery.sending && (
                      <Button
                        variant="outline"
                        onClick={() => void remote.load()}
                      >
                        Actualizar estado de envíos
                      </Button>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Puedes cerrar este sorteo y crear otro. Los correos
                      pendientes no se enviarán; un envío en curso puede
                      terminar.
                    </p>
                    <Button
                      variant="ghost"
                      onClick={async () => {
                        if (await remote.finish(false, true)) resetApp();
                      }}
                    >
                      Cerrar sorteo sin enviar los pendientes
                    </Button>
                  </section>
                ) : (
                  <>
                    <div className="action-dock sticky bottom-0 -mx-6 mt-6 border-t border-border bg-background px-6 py-3">
                      <Button
                        className="reveal action-reveal w-full"
                        disabled={participants.length < 3 || !!remote.saveError}
                        onClick={() => {
                          setReviewing(true);
                          window.scrollTo({ top: 0 });
                        }}
                      >
                        Revisar sorteo
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      className="mx-auto mt-3 flex text-muted-foreground"
                      onClick={async () => {
                        if (await remote.finish(true)) resetApp();
                      }}
                    >
                      Descartar lista
                    </Button>
                  </>
                )}
              </>
            )}
          </fieldset>
        )}
      </main>
      {!reviewing && !readOnly && assignStatus === "idle" && (
        <footer className="mx-auto w-full max-w-xl shrink-0 px-6 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center">
          <Link
            href="/help"
            aria-label="¿Cómo funciona? (ayuda)"
            className="inline-flex min-h-12 items-center text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            ¿Cómo funciona?
          </Link>
        </footer>
      )}
      <EditDrawer
        open={!!editingId}
        onClose={() => setEditingId(null)}
        triggerRef={participantEditTrigger}
        title="Editar participante"
        busy={remote.busy}
        onSubmit={(form) => {
          if (editingId) saveParticipant(form, editingId);
        }}
      >
        <ParticipantFields
          draft={participantDraft}
          onChange={setParticipantDraft}
          disabled={remote.busy}
        />
      </EditDrawer>
      <EditDrawer
        open={showEditList}
        onClose={() => setShowEditList(false)}
        triggerRef={listEditTrigger}
        title="Editar lista"
        busy={remote.busy}
        onSubmit={() => {
          const amount =
            giftAmountDraft === "" ? undefined : Number(giftAmountDraft);
          const errors = validateListDetails(listNameDraft, amount);
          setListErrors(errors);
          if (errors.name || errors.amount) {
            (errors.name ? listNameRef : listAmountRef).current?.focus();
            return;
          }
          if (
            remote.save({
              listName: listNameDraft.trim(),
              giftAmount: amount,
              participants,
            })
          )
            setShowEditList(false);
        }}
      >
        <fieldset disabled={remote.busy} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="edit-list-name">Nombre de lista</Label>
            <Input
              ref={listNameRef}
              id="edit-list-name"
              maxLength={120}
              value={listNameDraft}
              onChange={(event) => {
                setListNameDraft(event.target.value);
                setListErrors((errors) => ({ ...errors, name: undefined }));
              }}
              aria-invalid={!!listErrors.name}
              aria-describedby={listErrors.name ? "list-name-error" : undefined}
            />
            {listErrors.name && (
              <p id="list-name-error" role="alert" className="field-error">
                {listErrors.name}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-list-amount">Monto</Label>
            <Input
              ref={listAmountRef}
              id="edit-list-amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              max="9999999999.99"
              value={giftAmountDraft}
              onChange={(event) => {
                setGiftAmountDraft(event.target.value);
                setListErrors((errors) => ({ ...errors, amount: undefined }));
              }}
              aria-invalid={!!listErrors.amount}
              aria-describedby={
                listErrors.amount ? "list-amount-error" : undefined
              }
            />
            <p className="text-sm text-muted-foreground">
              Por regalo, en pesos argentinos (ARS). Opcional.
            </p>
            {listErrors.amount && (
              <p id="list-amount-error" role="alert" className="field-error">
                {listErrors.amount}
              </p>
            )}
          </div>
        </fieldset>
      </EditDrawer>
    </div>
  );
}
