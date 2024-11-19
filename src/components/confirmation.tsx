import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, RefreshCw } from "lucide-react";

interface ConfirmationProps {
  onReset: () => void;
}

export function SecretSantaConfirmation({ onReset }: ConfirmationProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-100 to-red-100 p-4 flex items-center justify-center">
      <Card className="w-full max-w-md mx-auto shadow-lg border-2 border-green-500 text-center">
        <CardHeader className="bg-green-500 text-white">
          <CardTitle className="text-2xl font-bold flex items-center justify-center">
            <Check className="mr-2" />
            ¡Asignación Completada!
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <p className="text-lg text-gray-700">
            Los correos electrónicos de Secret Santa han sido enviados exitosamente a todos los participantes.
          </p>
          <div className="flex justify-center">
            <Button onClick={onReset} className="bg-red-500 hover:bg-red-600 text-white text-lg py-4">
              <RefreshCw className="mr-2" />
              Comenzar Nueva Ronda
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
