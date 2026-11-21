import Link from "next/link";

export default function HelpPage() {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-red-50 to-green-50 p-6 flex items-start sm:items-center justify-center">
      <main className="w-full max-w-2xl text-gray-900">
        <h1 className="text-2xl font-semibold mb-4">¿Cómo funciona?</h1>

        <p className="mb-4 text-sm text-muted-foreground">
          Esta aplicación te ayuda a organizar un Secret Santa de forma rápida y sencilla. Aquí tienes los pasos básicos para usarla.
        </p>

        <ol className="list-decimal pl-5 space-y-3 mb-4 text-sm">
          <li>
            <strong>Crear lista:</strong> Pulsa <em>Empezar ahora</em> y configura el nombre de la lista y un presupuesto orientativo (opcional).
          </li>
          <li>
            <strong>Añadir participantes:</strong> Abre &quot;Agregar participante&quot;, introduce nombre y correo. Se requieren al menos 3
            participantes para hacer la asignación.
          </li>
          <li>
            <strong>Asignar:</strong> Pulsa <em>Asignar Secret Santas</em>. Verás una pantalla de espera festiva mientras se realiza la asignación. Si
            algún correo falla, podrás reintentarlo sin cambiar el sorteo. Los sorteos finalizados se conservan.
          </li>
          <li>
            <strong>Editar o eliminar:</strong> Puedes editar o eliminar participantes antes de asignar desde la lista de participantes.
          </li>
        </ol>

        <p className="mb-4 text-sm text-muted-foreground">
          Tu lista se guarda automáticamente y puedes volver a abrirla desde el mismo navegador durante 90 días, sin crear una cuenta.
          Los nombres y correos se usan para organizar el sorteo y enviar las notificaciones.
          Si borras los datos de navegación o cambias de dispositivo, no podrás recuperar el acceso por ahora.
        </p>

        <div className="mt-6">
          <Link href="/" className="text-sm text-red-600 hover:underline">
            Volver a la app
          </Link>
        </div>
      </main>
    </div>
  );
}
