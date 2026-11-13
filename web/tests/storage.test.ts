import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearRecsCache, loadRecs, saveRecs } from "../app/lib/offlineCache";
import { endSession, getSession, loadProfile, saveProfile, startSession } from "../app/lib/store";
import { getToken, setToken } from "../app/lib/api";

describe("offline recommendation cache", () => {
  beforeEach(() => localStorage.clear());
  it("returns saved results only for the same language and filter", () => {
    saveRecs({ n: 3 }, "hi", false);
    expect(loadRecs<{ n: number }>("hi", false)?.data.n).toBe(3);
    expect(loadRecs("en", false)).toBeNull();
    expect(loadRecs("hi", true)).toBeNull();
  });
  it("clears and survives broken or blocked storage", () => {
    saveRecs({}, "en", false);
    clearRecsCache();
    expect(loadRecs("en", false)).toBeNull();
    localStorage.setItem("internsetu_recs_cache", "{not json");
    expect(loadRecs("en", false)).toBeNull();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("full"); });
    expect(() => saveRecs({}, "en", false)).not.toThrow();
    vi.restoreAllMocks();
  });
});

describe("local profile and session", () => {
  beforeEach(() => localStorage.clear());
  it("merges saved profile fields", () => {
    saveProfile({ education: "Class 12" });
    saveProfile({ skills: ["Excel"] });
    expect(loadProfile()).toEqual({ education: "Class 12", skills: ["Excel"] });
  });
  it("ends the session: token, user and profile are removed", () => {
    setToken("t"); startSession("asha"); saveProfile({ degree: "BA" });
    expect(getSession()).toBe("asha");
    endSession();
    expect(getToken()).toBeNull();
    expect(getSession()).toBe("");
    expect(loadProfile()).toEqual({});
  });
  it("loadProfile tolerates corrupt data", () => {
    localStorage.setItem("internsetu_profile", "oops");
    expect(loadProfile()).toEqual({});
  });
});
