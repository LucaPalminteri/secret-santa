"use client";

import { Button } from "./ui/button";
import { BrandIllustration } from "./brand";
import DeliveryAnimation from "./delivery-animation";

export default function AssignLoading({
  status,
  errorMessage,
  sent,
  total,
  busy,
  onDone,
}: {
  status: "loading" | "success" | "error";
  errorMessage?: string;
  sent: number;
  total: number;
  busy: boolean;
  onDone: () => void;
}) {
  return (
    <section
      key={status}
      className="assignment-content welcome-enter py-4 text-center sm:py-8"
      aria-labelledby="assignment-title"
    >
      {status === "loading" && (
        <>
          <DeliveryAnimation />
          <h1 id="assignment-title" className="page-title">
            Enviando asignaciones
          </h1>
          <p role="status" className="mt-3 text-muted-foreground">
            {sent} de {total} correos enviados.
          </p>
          <div
            className="delivery-progress mx-auto mt-5"
            role="progressbar"
            aria-label="Correos enviados"
            aria-valuemin={0}
            aria-valuemax={Math.max(total, 1)}
            aria-valuenow={Math.min(sent, total)}
            aria-valuetext={`${sent} de ${total} correos enviados`}
          >
            <div
              className="delivery-progress-fill"
              style={{
                width: `${total ? Math.min(sent / total, 1) * 100 : 0}%`,
              }}
            />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Mantén esta página abierta.
          </p>
        </>
      )}
      {status === "success" && (
        <>
          <BrandIllustration
            scene="mail"
            className="assignment-art mx-auto mb-8"
          />
          <h1 id="assignment-title" className="page-title">
            Ya enviamos las asignaciones.
          </h1>
          <p className="mt-3 text-muted-foreground">
            La sorpresa está en sus correos.
          </p>
          <Button disabled={busy} onClick={onDone} className="mt-8 w-full">
            Listo
          </Button>
        </>
      )}
      {status === "error" && (
        <>
          <h1 id="assignment-title" className="page-title">
            No pudimos terminar el envío.
          </h1>
          <p role="alert" className="mt-3 text-muted-foreground">
            {errorMessage ||
              "Tus datos siguen aquí. Vuelve al sorteo para reintentar."}
          </p>
          <Button disabled={busy} onClick={onDone} className="mt-8 w-full">
            Volver al sorteo
          </Button>
        </>
      )}
    </section>
  );
}
