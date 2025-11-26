import Link from "next/link";

export default function HelpPage() {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-red-50 to-green-50 p-6 flex items-start sm:items-center justify-center">
      <main className="w-full max-w-2xl text-gray-900">
        <h1 className="text-2xl font-semibold mb-4">Cómo funciona</h1>

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
            la asignación termina correctamente, los datos locales se borrarán según la acción de finalización.
          </li>
          <li>
            <strong>Editar o eliminar:</strong> Puedes editar o eliminar participantes antes de asignar desde la lista de participantes.
          </li>
        </ol>

        <p className="mb-4 text-sm text-muted-foreground">
          Los datos se guardan localmente en tu navegador (localStorage). No se comparten automáticamente con terceros.
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
