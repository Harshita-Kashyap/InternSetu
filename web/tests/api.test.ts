import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, L3_LANG, api, clearToken, getToken, pickLabel, setToken } from "../app/lib/api";

const ok = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));

describe("api client", () => {
  beforeEach(() => { localStorage.clear(); });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  it("pickLabel falls back to English and L3_LANG accepts the four app languages", () => {
    expect(pickLabel({ en: "Hi", hi: "नमस्ते" }, "hi")).toBe("नमस्ते");
    expect(pickLabel({ en: "Hi" }, "mr")).toBe("Hi");
    expect(["en", "hi", "mr", "bn", "te", "xx"].map(L3_LANG)).toEqual(["en", "hi", "mr", "bn", "en", "en"]);
  });

  it("ApiError exposes the message of one field", () => {
    const e = new ApiError(422, "validation_error", "bad", [{ field: "password", message: "too short" }]);
    expect(e.fieldMessage("password")).toBe("too short");
    expect(e.fieldMessage("email")).toBeUndefined();
  });

  it("login stores the token and sends no Authorization header", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockImplementation(() => ok({ access_token: "tok", token_type: "bearer", expires_in: 3600, user: { id: 1 } }));
    await api.login("a@b.co", "Secret123");
    expect(getToken()).toBe("tok");
    const [url, init] = f.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/v1\/auth\/login$/);
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it("sends the saved token on authorised calls", async () => {
    setToken("abc");
    const f = vi.spyOn(globalThis, "fetch").mockImplementation(() => ok({ status: "draft" }));
    await api.getProfile();
    expect((f.mock.calls[0][1] as RequestInit).headers).toMatchObject({ Authorization: "Bearer abc" });
  });

  it("turns an error response into an ApiError with code and fields", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() => ok({ error: { code: "invalid_code", message: "Wrong code", fields: [] } }, 400));
    await expect(api.requestRegisterCode("a@b.co")).rejects.toMatchObject({ status: 400, code: "invalid_code", message: "Wrong code" });
  });

  it("a 401 on an authorised call clears the token", async () => {
    setToken("old");
    Object.defineProperty(window, "location", { value: { href: "/x" }, writable: true });
    vi.spyOn(globalThis, "fetch").mockImplementation(() => ok({ error: { code: "unauthorized", message: "no" } }, 401));
    await expect(api.getProfile()).rejects.toBeInstanceOf(ApiError);
    expect(getToken()).toBeNull();
  });

  it("retries a GET on a network failure but never retries a write", async () => {
    vi.useFakeTimers();
    const get = vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("offline"));
    const p1 = expect(api.getProfile()).rejects.toMatchObject({ code: "network" });
    await vi.runAllTimersAsync();
    await p1;
    expect(get).toHaveBeenCalledTimes(3);
    get.mockClear();
    const p2 = expect(api.requestRegisterCode("a@b.co")).rejects.toMatchObject({ code: "network" });
    await vi.runAllTimersAsync();
    await p2;
    expect(get).toHaveBeenCalledTimes(1);
  });

  it("clearToken also clears the cached recommendations", () => {
    setToken("t");
    localStorage.setItem("internsetu_recs_cache", "{}");
    clearToken();
    expect(localStorage.getItem("internsetu_recs_cache")).toBeNull();
  });
});
