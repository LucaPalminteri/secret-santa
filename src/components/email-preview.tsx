"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Monitor, Smartphone } from "lucide-react";
import { assignmentEmail } from "@/server/assignment-email";
import images from "@/brand/email-images.json";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export default function EmailPreview() {
  const [santaName, setSantaName] = useState("Sofía");
  const [recipientName, setRecipientName] = useState("Martín");
  const [listName, setListName] = useState("Navidad en familia");
  const [budget, setBudget] = useState("25000");
  const [mobile, setMobile] = useState(false);
  const amount = budget.trim() === "" ? undefined : Number(budget);
  const { html } = assignmentEmail({
    santaName,
    recipientName,
    listName,
    giftAmount: amount !== undefined && Number.isFinite(amount) && amount >= 0 ? amount : undefined,
  });
  const preview = html.replace(/cid:secret-santa-(mark|welcome|bow)/g,
    (_, key: "mark" | "welcome" | "bow") => `data:image/png;base64,${images[key]}`,
  );

  return (
    <div className="app-shell min-h-dvh bg-background text-foreground">
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <Button asChild variant="ghost" className="-ml-4 mb-5">
          <Link href="/"><ArrowLeft aria-hidden />Volver al sorteo</Link>
        </Button>
        <h1 className="page-title">Una sorpresa en tu correo.</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Este es un ejemplo con datos ficticios. Prueba otros nombres y un presupuesto sin enviar correos ni realizar un sorteo.
        </p>
        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
          <section aria-labelledby="preview-details" className="space-y-4">
            <h2 id="preview-details" className="text-lg font-extrabold">Personaliza el ejemplo</h2>
            <div className="space-y-2">
              <Label htmlFor="preview-santa">Tu nombre</Label>
              <Input id="preview-santa" value={santaName} maxLength={100} onChange={(event) => setSantaName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preview-recipient">Persona que recibe el regalo</Label>
              <Input id="preview-recipient" value={recipientName} maxLength={100} onChange={(event) => setRecipientName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preview-list">Nombre del sorteo</Label>
              <Input id="preview-list" value={listName} maxLength={100} onChange={(event) => setListName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preview-budget">Presupuesto por regalo (ARS)</Label>
              <Input id="preview-budget" type="number" min="0" step="0.01" value={budget} onChange={(event) => setBudget(event.target.value)} aria-describedby="preview-budget-help" />
              <p id="preview-budget-help" className="text-sm text-muted-foreground">Opcional. Déjalo vacío para ocultarlo.</p>
            </div>
          </section>
          <section aria-label="Vista previa del correo" className="min-w-0">
            <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Tamaño de la vista previa">
              <Button variant={mobile ? "outline" : "secondary"} size="sm" aria-pressed={!mobile} onClick={() => setMobile(false)}><Monitor aria-hidden />Escritorio</Button>
              <Button variant={mobile ? "secondary" : "outline"} size="sm" aria-pressed={mobile} onClick={() => setMobile(true)}><Smartphone aria-hidden />Móvil</Button>
            </div>
            <iframe
              title="Ejemplo del correo de Secret Santa"
              sandbox=""
              srcDoc={preview}
              className="mx-auto block h-[75dvh] min-h-[480px] max-w-full rounded-xl border border-border bg-background"
              style={{ width: mobile ? 360 : "100%" }}
            />
            <p className="mt-3 text-center text-sm text-muted-foreground">El aspecto puede variar según la aplicación de correo.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
