import { NextRequest, NextResponse } from "next/server";
import { getGuestSession, SESSION_COOKIE } from "@/server/session";
import { draftInput, uuid } from "@/server/validation";
import { finishExchange, readExchange, saveDraft } from "@/server/exchanges";
import { deliverNext } from "@/server/delivery";
import { AppError } from "@/server/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function response(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
}

async function handle(action: () => Promise<unknown>) {
  try { return response(await action()); }
  catch (error) {
    if (error instanceof AppError) return response({ error: error.message }, error.status);
    // Do not send driver/SMTP errors or connection information to the browser.
    console.error("Exchange request failed.");
    return response({ error: "No se pudo completar la operación. Tus cambios no se descartaron. Intenta nuevamente." }, 503);
  }
}

async function body(request: NextRequest) {
  // Next's internal URL can use localhost behind a proxy. Match the browser's
  // origin against the actual request Host, rather than that internal hostname.
  const expectedOrigin = new URL(request.url);
  expectedOrigin.host = request.headers.get("host") ?? expectedOrigin.host;
  if (request.headers.get("origin") !== expectedOrigin.origin) throw new AppError("Origen inválido.", 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new AppError("Se esperaba JSON.", 415);
  if (Number(request.headers.get("content-length")) > 32_768) throw new AppError("Solicitud demasiado grande.", 413);
  const text = await request.text();
  if (text.length > 32_768) throw new AppError("Solicitud demasiado grande.", 413);
  try {
    const value: unknown = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return value as Record<string, unknown>;
  } catch { throw new AppError("Datos inválidos."); }
}

export async function GET() {
  return handle(async () => {
    const session = await getGuestSession();
    return session ? readExchange(session.id) : null;
  });
}

export async function PUT(request: NextRequest) {
  return handle(async () => {
    const input = draftInput(await body(request));
    const session = await getGuestSession(true);
    return saveDraft(session!.id, input);
  });
}

export async function POST(request: NextRequest) {
  return handle(async () => {
    const input = await body(request);
    const session = await getGuestSession();
    if (!session) throw new AppError("La sesión venció. Recarga para continuar.", 401);
    const id = uuid(input.id);
    if (input.action === "complete" || input.action === "archive") {
      await finishExchange(session.id, id, false, input.action === "archive");
      return null;
    }
    if (input.action !== "draw" || !Number.isSafeInteger(input.revision) || Number(input.revision) < 0) throw new AppError("Acción inválida.");
    if (input.retry != null && input.retry !== "failed" && input.retry !== "unknown") throw new AppError("Reintento inválido.");
    return deliverNext(session.id, id, Number(input.revision), input.retry as "failed" | "unknown" | null);
  });
}

export async function DELETE(request: NextRequest) {
  return handle(async () => {
    const input = await body(request);
    if (input.action === "reset-session") {
      // Clearing a cookie does not delete the organizer's records.
      const { cookies } = await import("next/headers");
      (await cookies()).delete(SESSION_COOKIE);
      return null;
    }
    const session = await getGuestSession();
    if (!session) throw new AppError("Sesión inválida.", 401);
    await finishExchange(session.id, uuid(input.id), true);
    return null;
  });
}
