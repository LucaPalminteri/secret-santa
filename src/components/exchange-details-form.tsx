"use client";

import { useId, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { validateListDetails } from "@/utils/list-validation";

export default function ExchangeDetailsForm({
  initialName = "",
  initialAmount,
  disabled = false,
  onComplete,
}: {
  initialName?: string;
  initialAmount?: number;
  disabled?: boolean;
  onComplete: (name: string, amount?: number) => void;
}) {
  const id = useId();
  const [name, setName] = useState(initialName);
  const [amount, setAmount] = useState(initialAmount?.toString() ?? "");
  const [errors, setErrors] = useState<{ name?: string; amount?: string }>({});
  const nameRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  return (
    <form
      aria-label="Crear sorteo"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (disabled) return;
        const value = amount === "" ? undefined : Number(amount);
        const nextErrors = validateListDetails(name, value);
        setErrors(nextErrors);
        if (nextErrors.name || nextErrors.amount) {
          (nextErrors.name ? nameRef : amountRef).current?.focus();
          return;
        }
        onComplete(name.trim(), value);
      }}
    >
      <fieldset disabled={disabled} className="stagger-fields space-y-6">
        <div className="space-y-2">
          <Label htmlFor={`${id}-name`}>Nombre del sorteo</Label>
          <Input
            ref={nameRef}
            id={`${id}-name`}
            maxLength={120}
            placeholder="Ej. Navidad en familia"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setErrors((current) => ({ ...current, name: undefined }));
            }}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? `${id}-name-error` : undefined}
          />
          {errors.name && (
            <p id={`${id}-name-error`} role="alert" className="field-error">
              {errors.name}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Label htmlFor={`${id}-amount`}>Presupuesto por regalo</Label>
            <span className="text-sm text-muted-foreground">Opcional</span>
          </div>
          <div className="relative">
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground"
            >
              ARS
            </span>
            <Input
              ref={amountRef}
              id={`${id}-amount`}
              type="number"
              inputMode="decimal"
              min="0"
              max="9999999999.99"
              step="0.01"
              className="pl-14"
              placeholder="Sin definir"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                setErrors((current) => ({ ...current, amount: undefined }));
              }}
              aria-invalid={!!errors.amount}
              aria-describedby={`${id}-currency${errors.amount ? ` ${id}-amount-error` : ""}`}
            />
          </div>
          <p id={`${id}-currency`} className="sr-only">
            Presupuesto en pesos argentinos.
          </p>
          {errors.amount && (
            <p id={`${id}-amount-error`} role="alert" className="field-error">
              {errors.amount}
            </p>
          )}
        </div>
        <Button type="submit" className="w-full">
          Agregar participantes
        </Button>
      </fieldset>
    </form>
  );
}
