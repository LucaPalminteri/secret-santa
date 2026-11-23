import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  session: vi.fn(), read: vi.fn(), save: vi.fn(), finish: vi.fn(),
  deliver: vi.fn(), deleteCookie: vi.fn(),
}));
vi.mock("@/server/session", () => ({ getGuestSession: mocks.session, SESSION_COOKIE: "secret-santa-session" }));
vi.mock("@/server/exchanges", () => ({ readExchange: mocks.read, saveDraft: mocks.save, finishExchange: mocks.finish }));
vi.mock("@/server/delivery", () => ({ deliverNext: mocks.deliver }));
vi.mock("next/headers", () => ({ cookies: async () => ({ delete: mocks.deleteCookie }) }));

import { DELETE, GET, POST, PUT } from "../../src/app/api/exchange/route";
import { AppError } from "../../src/server/errors";

const origin = "https://santa.example";
const id = randomUUID();
const draft = () => ({ id, saveKey: randomUUID(), revision: 0, listName: " Test ", giftAmount: 0, participants: [] });
function request(method: string, data: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(`${origin}/api/exchange`, {
    method, headers: { origin, "content-type": "application/json", ...headers },
    body: typeof data === "string" ? data : JSON.stringify(data),
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.session.mockResolvedValue({ id: "owner" });
});

describe("exchange HTTP boundary", () => {
  it("returns a private empty first visit without creating a session", async () => {
    mocks.session.mockResolvedValue(null);
    const response = await GET();
    expect(await response.json()).toBeNull();
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.session).toHaveBeenCalledWith();
    expect(mocks.read).not.toHaveBeenCalled();
  });

  it.each([PUT, POST, DELETE])("rejects foreign origins before session or service access", async (handler) => {
    const response = await handler(request("PUT", draft(), { origin: "https://other.example" }));
    expect(response.status).toBe(403);
    expect(mocks.session).not.toHaveBeenCalled();
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.deliver).not.toHaveBeenCalled();
    expect(mocks.finish).not.toHaveBeenCalled();
  });

  it("accepts the public Host behind a reverse proxy", async () => {
    mocks.save.mockResolvedValue({ id });
    const response = await PUT(new NextRequest("https://internal.example/api/exchange", {
      method: "PUT", headers: { host: "santa.example", origin, "content-type": "application/json" },
      body: JSON.stringify(draft()),
    }));
    expect(response.status).toBe(200);
    expect(mocks.save).toHaveBeenCalledWith("owner", expect.objectContaining({ listName: "Test", giftAmount: "0.00" }));
  });

  it.each(["{", "null", "[]", "42"])("rejects malformed JSON bodies: %s", async (body) => {
    expect((await PUT(request("PUT", body))).status).toBe(400);
    expect(mocks.session).not.toHaveBeenCalled();
  });

  it("rejects unsupported content types before creating a session", async () => {
    expect((await PUT(request("PUT", draft(), { "content-type": "text/plain" }))).status).toBe(415);
    expect(mocks.session).not.toHaveBeenCalled();
  });

  it.each([false, true])("rejects oversized requests with or without declared size: %s", async (declared) => {
    const response = await PUT(request("PUT", " ".repeat(32_769), declared ? { "content-length": "32769" } : {}));
    expect(response.status).toBe(413);
    expect(mocks.session).not.toHaveBeenCalled();
  });

  it("rejects invalid drafts before creating a session", async () => {
    expect((await PUT(request("PUT", { ...draft(), listName: "" }))).status).toBe(400);
    expect(mocks.session).not.toHaveBeenCalled();
  });

  it("does not deliver without an organizer session", async () => {
    mocks.session.mockResolvedValue(null);
    expect((await POST(request("POST", { id, action: "draw", revision: 1 }))).status).toBe(401);
    expect(mocks.deliver).not.toHaveBeenCalled();
  });

  it.each([
    { action: "invalid", revision: 1 }, { action: "draw", revision: -1 },
    { action: "draw", revision: 1.5 }, { action: "draw", revision: "1" },
    { action: "draw", revision: 1, retry: "all" },
  ])("rejects invalid delivery commands: %j", async (command) => {
    expect((await POST(request("POST", { id, ...command }))).status).toBe(400);
    expect(mocks.deliver).not.toHaveBeenCalled();
  });

  it.each([null, "failed", "unknown"])("forwards explicit retry choice: %s", async (retry) => {
    mocks.deliver.mockResolvedValue({ id });
    expect((await POST(request("POST", { id, action: "draw", revision: 1, retry }))).status).toBe(200);
    expect(mocks.deliver).toHaveBeenCalledWith("owner", id, 1, retry);
  });

  it("keeps session reset separate from deleting stored records", async () => {
    const response = await DELETE(request("DELETE", { action: "reset-session" }));
    expect(response.status).toBe(200);
    expect(mocks.deleteCookie).toHaveBeenCalledWith("secret-santa-session");
    expect(mocks.finish).not.toHaveBeenCalled();
  });

  it("preserves expected conflict responses and prevents caching them", async () => {
    mocks.save.mockRejectedValue(new AppError("Stale revision", 409));
    const response = await PUT(request("PUT", draft()));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "Stale revision" });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("hides unexpected database and SMTP error details from clients and logs", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.read.mockRejectedValue(new Error("private connection and credential details"));
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private connection");
    expect(log).toHaveBeenCalledWith("Exchange request failed.");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
});
