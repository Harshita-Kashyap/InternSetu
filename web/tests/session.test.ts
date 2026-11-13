import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, getToken, setToken, tokenSecondsLeft } from "../app/lib/api";
import { describeAudit } from "../app/lib/audit";

const b64 = (o: unknown) => btoa(JSON.stringify(o)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
const jwt = (secondsLeft: number) => `${b64({ alg: "HS256" })}.${b64({ exp: Math.floor(Date.now() / 1000) + secondsLeft })}.sig`;
const ok = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));

describe("sliding session", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("reads the time left in a token, and 0 for rubbish", () => {
    expect(tokenSecondsLeft(jwt(600))).toBeGreaterThan(590);
    expect(tokenSecondsLeft(jwt(600))).toBeLessThanOrEqual(600);
    expect(tokenSecondsLeft("not-a-token")).toBe(0);
    expect(tokenSecondsLeft(null)).toBe(0);
  });

  it("does nothing while the token still has plenty of time", async () => {
    setToken(jwt(50 * 60));
    const f = vi.spyOn(globalThis, "fetch").mockImplementation(() => ok({ status: "draft" }));
    await api.getProfile();
    expect(f).toHaveBeenCalledTimes(1);
    expect(String(f.mock.calls[0][0])).toMatch(/\/me\/profile$/);
  });

  it("renews the token first when less than 20 minutes remain, then makes the call with the new token", async () => {
    setToken(jwt(5 * 60));
    const fresh = jwt(60 * 60);
    const f = vi.spyOn(globalThis, "fetch").mockImplementation((url) => (String(url).endsWith("/auth/refresh") ? ok({ access_token: fresh }) : ok({ status: "draft" })));
    await api.getProfile();
    expect(f).toHaveBeenCalledTimes(2);
    expect(String(f.mock.calls[0][0])).toMatch(/\/auth\/refresh$/);
    expect(getToken()).toBe(fresh);
    expect((f.mock.calls[1][1] as RequestInit).headers).toMatchObject({ Authorization: `Bearer ${fresh}` });
  });

  it("two calls at the same moment share one renewal", async () => {
    setToken(jwt(5 * 60));
    const f = vi.spyOn(globalThis, "fetch").mockImplementation((url) => (String(url).endsWith("/auth/refresh") ? ok({ access_token: jwt(3600) }) : ok({})));
    await Promise.all([api.getProfile(), api.getProfile()]);
    expect(f.mock.calls.filter((c) => String(c[0]).endsWith("/auth/refresh"))).toHaveLength(1);
  });

  it("if renewal fails the original call still goes ahead with the old token", async () => {
    const old = jwt(5 * 60);
    setToken(old);
    const f = vi.spyOn(globalThis, "fetch").mockImplementation((url) => (String(url).endsWith("/auth/refresh") ? ok({ error: { code: "session_too_old", message: "x" } }, 401) : ok({ status: "draft" })));
    await api.getProfile();
    expect(getToken()).toBe(old);
    expect((f.mock.calls[1][1] as RequestInit).headers).toMatchObject({ Authorization: `Bearer ${old}` });
  });

  it("never tries to renew an already expired token", async () => {
    setToken(jwt(-30));
    const f = vi.spyOn(globalThis, "fetch").mockImplementation(() => ok({ status: "draft" }));
    await api.getProfile();
    expect(f.mock.calls.some((c) => String(c[0]).endsWith("/auth/refresh"))).toBe(false);
  });
});

describe("audit log text", () => {
  const tr = (s: string) => s;
  it("shows only the weights that moved", () => {
    expect(describeAudit({ action: "weights.update", details: { old: { skills: 35, role: 0 }, new: { skills: 40, role: 0 } } }, tr)).toBe("skills 35 → 40");
  });
  it("describes listing changes and other actions", () => {
    expect(describeAudit({ action: "internship.active", details: { is_active: false } }, tr)).toBe("Switched off");
    expect(describeAudit({ action: "taxonomy.create", details: { name: "Welding", synonyms: ["weld"] } }, tr)).toBe("name: Welding");
    expect(describeAudit({ action: "weights.reset", details: {} }, tr)).toBe("–");
  });
});
