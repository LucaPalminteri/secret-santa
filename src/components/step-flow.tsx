"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, X, ArrowRight, Check } from "lucide-react";

type Props = {
  initialName?: string;
  initialAmount?: number | undefined;
  onComplete: (listName: string, giftAmount?: number) => void;
  onCancel?: () => void;
};

export default function StepFlow({ initialName = "", initialAmount, onComplete, onCancel }: Props) {
  const [step, setStep] = useState<number>(0);
  const [listName, setListName] = useState<string>(initialName);
  const [giftAmount, setGiftAmount] = useState<number | undefined>(initialAmount);
  const listRef = useRef<HTMLInputElement | null>(null);
  const amountRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // focus the relevant input when step changes
    if (step === 0) {
      listRef.current?.focus();
    } else if (step === 1) {
      amountRef.current?.focus();
    }
  }, [step]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        // Enter advances unless disabled
        if (step === 0 && !listName.trim()) return;
        if (step < 2) return setStep((s) => Math.min(2, s + 1));
        // if on final step, complete
        if (step === 2) onComplete(listName.trim(), giftAmount);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [step, listName, giftAmount, onComplete]);

  const next = () => setStep((s) => Math.min(2, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const handleFinish = () => {
    onComplete(listName.trim(), giftAmount);
  };

  return (
    <div className="w-full max-w-full sm:max-w-2xl mx-auto p-2">
      <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-4 sm:p-6 text-gray-900 min-h-[180px] sm:min-h-[220px] max-h-[80vh] overflow-auto">
        <div className="mb-2 flex flex-col items-center">
          <div className="flex items-center justify-center space-x-3 mb-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full transition-all duration-700 ${step === i ? "bg-red-600 scale-110" : "bg-gray-300"}`}
                aria-hidden
              />
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="overflow-hidden">
            <div className="flex transition-transform duration-700 ease-in-out" style={{ transform: `translateX(-${step * 100}%)` }}>
              <div className="w-full flex-shrink-0 px-2">
                <div className="space-y-3">
                  <h2 className="text-2xl font-extrabold text-gray-900 text-center">Nombre de la lista</h2>
                  <p className="text-sm text-gray-600 text-center">Pon un nombre que identifique este Secret Santa.</p>
                  <div className="space-y-2">
                    <Label htmlFor="sf-listName" className="text-gray-700">
                      Nombre
                    </Label>
                    <Input
                      ref={listRef}
                      id="sf-listName"
                      value={listName}
                      onChange={(e) => setListName(e.target.value)}
                      placeholder="Ej: Oficina 2025"
                      className="bg-white"
                      aria-hidden={step !== 0}
                    />
                  </div>
                </div>
              </div>

              <div className="w-full flex-shrink-0 px-2">
                <div className="space-y-3">
                  <h2 className="text-2xl font-extrabold text-gray-900 text-center">Monto del regalo</h2>
                  <p className="text-sm text-gray-600 text-center">Define un monto orientativo para todos los regalos.</p>
                  <div className="space-y-2">
                    <Label htmlFor="sf-giftAmount" className="text-gray-700">
                      Monto
                    </Label>
                    <Input
                      ref={amountRef}
                      id="sf-giftAmount"
                      type="number"
                      value={giftAmount ?? ""}
                      onChange={(e) => setGiftAmount(e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="Ej: 20"
                      className="bg-white"
                      aria-hidden={step !== 1}
                    />
                  </div>
                </div>
              </div>

              <div className="w-full flex-shrink-0 px-2">
                <div className="space-y-3">
                  <h2 className="text-2xl font-extrabold text-gray-900 text-center">Listo</h2>
                  <p className="text-sm text-gray-600 text-center">Has completado la configuración básica. Continúa para añadir participantes.</p>
                  <div className="space-y-2 text-gray-800">
                    <div className="text-center">
                      <strong>Lista:</strong> {listName || <em>Sin nombre</em>}
                    </div>
                    <div className="text-center">
                      <strong>Monto:</strong> {giftAmount !== undefined ? `${giftAmount}` : <em>No definido</em>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 w-full px-2">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={step === 0 ? onCancel : back}
              className="flex-1 py-2 border-red-600 text-red-700 hover:bg-red-50"
              aria-label={step === 0 ? "Cancelar" : "Atrás"}
            >
              {step === 0 ? <X className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
              <span className="sr-only">{step === 0 ? "Cancelar" : "Atrás"}</span>
            </Button>

            {step < 2 ? (
              <Button onClick={next} disabled={step === 0 && !listName.trim()} className="flex-[2] py-2">
                <ArrowRight className="h-5 w-5" />
                <span className="sr-only">Siguiente</span>
              </Button>
            ) : (
              <Button onClick={handleFinish} className="flex-[2] py-2">
                <Check className="h-5 w-5" />
                <span className="sr-only">Continuar</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
