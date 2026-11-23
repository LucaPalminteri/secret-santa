import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandIllustration } from "@/components/brand";
import { Button } from "@/components/ui/button";

const steps = [
  {
    title: "Prepara el sorteo",
    text: "Ponle un nombre. El presupuesto es opcional.",
  },
  {
    title: "Agrega a tu grupo",
    text: "Mínimo 3 personas, con nombre y correo. Puedes editar la lista antes del sorteo.",
  },
  {
    title: "Sortea y sorprende",
    text: "Revisa los correos y confirma el envío. Cada persona recibe su asignación en privado.",
  },
];

export default function HelpPage() {
  return (
    <div className="app-shell min-h-dvh flex flex-col bg-background text-foreground">
      <main className="mx-auto w-full max-w-xl flex-1 px-6 pt-6 pb-8 sm:pt-10">
        <Button asChild variant="ghost" className="-ml-4 mb-4">
          <Link href="/" aria-label="Volver a la app">
            <ArrowLeft aria-hidden />
            Volver
          </Link>
        </Button>
        <section className="welcome-enter" aria-labelledby="help-title">
          <BrandIllustration
            scene="help"
            priority
            className="mx-auto mb-6 block h-44 w-full sm:h-52"
          />
          <h1 id="help-title" className="page-title">
            ¿Cómo funciona?
          </h1>
          <p className="mt-3 text-muted-foreground">
            Tres pasos para compartir una sorpresa.
          </p>
          <ol className="mt-8 space-y-7">
            {steps.map((step, index) => (
              <li key={step.title} className="flex gap-4">
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-extrabold text-[var(--brand-pine)]"
                >
                  {index + 1}
                </span>
                <div>
                  <h2 className="font-extrabold">{step.title}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {step.text}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-8 border-t border-border pt-6 text-sm leading-relaxed text-muted-foreground">
            <h2 className="font-extrabold text-foreground">
              Tu lista se guarda sola
            </h2>
            <p className="mt-2">
              Puedes volver desde el mismo navegador durante 90 días, sin crear
              una cuenta. Si borras sus datos o cambias de dispositivo, no
              podrás recuperar el acceso por ahora.
            </p>
            <p className="mt-3">
              Si un correo falla, puedes reintentarlo sin cambiar las
              asignaciones.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
