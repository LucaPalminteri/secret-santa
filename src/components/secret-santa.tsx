"use client";

import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Toaster } from "@/components/ui/toaster";
import { Gift, UserPlus, Send, Snowflake, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { assignSecretSantas } from "@/actions/actions";
import { Spinner } from "./spinner";
import { SecretSantaConfirmation } from "./confirmation";

interface Participant {
  id: string;
  name: string;
  email: string;
}

export default function SecretSantaApp() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [isAssignmentComplete, setIsAssignmentComplete] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const savedParticipants = localStorage.getItem("secretSantaParticipants");
    if (savedParticipants) {
      setParticipants(JSON.parse(savedParticipants));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("secretSantaParticipants", JSON.stringify(participants));
  }, [participants]);

  const addParticipant = () => {
    if (name && email) {
      if (editingId) {
        setParticipants(participants.map((p) => (p.id === editingId ? { ...p, name, email } : p)));
        setEditingId(null);
        toast({
          title: "Participante actualizado",
          description: `${name} ha sido actualizado en la lista.`,
        });
      } else {
        setParticipants([...participants, { id: uuidv4(), name, email }]);
        toast({
          title: "Participante agregado",
          description: `${name} ha sido añadido a la lista.`,
        });
      }
      setName("");
      setEmail("");
    }
  };

  const removeParticipant = (id: string) => {
    setParticipants(participants.filter((p) => p.id !== id));
    toast({
      title: "Participante eliminado",
      description: "El participante ha sido removido de la lista.",
      variant: "destructive",
    });
  };

  const handleEditParticipant = (id: string) => {
    const participant = participants.find((p) => p.id === id);
    if (participant) {
      setEditingId(id);
      setName(participant.name);
      setEmail(participant.email);
    }
  };

  const handleAssign = async () => {
    setIsAssigning(true);
    try {
      await assignSecretSantas(participants);
      toast({
        title: "¡Asignación completada!",
        description: "Se han enviado los correos electrónicos a todos los participantes.",
      });
      setIsAssignmentComplete(true);
      // Clear the list after successful assignment
      setParticipants([]);
      localStorage.removeItem("secretSantaParticipants");
    } catch (error) {
      console.log(error);
      toast({
        title: "Error en la asignación",
        description: "Hubo un problema al asignar los Secret Santas. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      });
    }
    setIsAssigning(false);
  };

  const resetApp = () => {
    setParticipants([]);
    localStorage.removeItem("secretSantaParticipants");
    setIsAssignmentComplete(false);
  };

  return (
    <>
      {isAssignmentComplete ? (
        <SecretSantaConfirmation onReset={resetApp} />
      ) : (
        <div className="min-h-screen bg-gradient-to-b from-red-100 to-green-100 p-4 flex items-center justify-center">
          <Card className="w-full max-w-4xl mx-auto shadow-lg border-2 border-red-500 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('/snowflakes.svg')] opacity-10 pointer-events-none" />
            <CardHeader className="bg-red-500 text-white relative">
              <CardTitle className="text-3xl font-bold text-center flex items-center justify-center">
                <Gift className="mr-2" />
                Secret Santa
              </CardTitle>
              <Snowflake className="absolute top-2 left-2 animate-spin-slow" />
              <Snowflake className="absolute bottom-2 right-2 animate-spin-slow" />
            </CardHeader>
            <CardContent className="p-6 relative">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-lg font-semibold text-green-700">
                    Nombre
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ingresa un nombre"
                    className="border-2 border-green-500 focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-lg font-semibold text-green-700">
                    Correo electrónico
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Ingresa un correo electrónico"
                    className="border-2 border-green-500 focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
              <Button onClick={addParticipant} className="w-full bg-green-600 hover:bg-green-700 text-white mb-6">
                {editingId ? (
                  <>
                    <Pencil className="mr-2" />
                    Actualizar Participante
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2" />
                    Agregar Participante
                  </>
                )}
              </Button>

              {participants.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold text-xl mb-2 text-red-700">Participantes:</h3>
                  <div className="border-2 border-green-500 rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">#</TableHead>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Correo electrónico</TableHead>
                          <TableHead className="w-[100px]">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {participants.map((p, index) => (
                          <TableRow key={p.id}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>{p.name}</TableCell>
                            <TableCell>{p.email}</TableCell>
                            <TableCell>
                              <div className="flex space-x-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditParticipant(p.id)}
                                  className="text-blue-500 hover:text-blue-700"
                                >
                                  <Pencil className="h-4 w-4" />
                                  <span className="sr-only">Editar participante</span>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeParticipant(p.id)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span className="sr-only">Eliminar participante</span>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleAssign}
                disabled={participants.length < 3 || isAssigning}
                className="w-full bg-red-600 hover:bg-red-700 text-white text-lg py-6 relative"
              >
                {isAssigning ? (
                  <>
                    <Spinner className="mr-2" />
                    Asignando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2" />
                    Asignar Secret Santas
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
          <Toaster />
        </div>
      )}
      <Toaster />
    </>
  );
}
