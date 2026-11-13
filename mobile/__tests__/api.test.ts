import AsyncStorage from "@react-native-async-storage/async-storage";
import { ApiError, RECS_CACHE_KEY, api, clearToken, getToken, setToken, setUnauthorizedHandler, tokenSecondsLeft } from "../src/api";

const reply = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));

describe("mobile api client", () => {
  beforeEach(async () => { await AsyncStorage.clear(); await clearToken(); setUnauthorizedHandler(null); });
  afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });

  it("ApiError finds the message of one field", () => {
    const e = new ApiError(422, "validation_error", "bad", [{ field: "email", message: "invalid" }]);
    expect(e.fieldMessage("email")).toBe("invalid");
    expect(e.fieldMessage("password")).toBeUndefined();
  });

  it("login saves the token and uses no Authorization header", async () => {
    const f = jest.spyOn(globalThis, "fetch").mockImplementation(() => reply({ access_token: "tok", token_type: "bearer", expires_in: 3600, user: { id: 1 } }));
    await api.login("a@b.co", "Secret123");
    expect(await getToken()).toBe("tok");
    expect(await AsyncStorage.getItem("internsetu_token")).toBe("tok");
    expect(((f.mock.calls[0][1] as RequestInit).headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it("sends the token on authorised calls", async () => {
    await setToken("abc");
    const f = jest.spyOn(globalThis, "fetch").mockImplementation(() => reply({ status: "draft" }));
    await api.getProfile();
    expect((f.mock.calls[0][1] as RequestInit).headers).toMatchObject({ Authorization: "Bearer abc" });
  });

  it("maps an error body to an ApiError", async () => {
    jest.spyOn(globalThis, "fetch").mockImplementation(() => reply({ error: { code: "invalid_code", message: "Wrong code", fields: [] } }, 400));
    await expect(api.requestRegisterCode("a@b.co")).rejects.toMatchObject({ status: 400, code: "invalid_code", message: "Wrong code" });
  });

  it("a 401 clears the token and calls the unauthorised handler", async () => {
    await setToken("old");
    await AsyncStorage.setItem(RECS_CACHE_KEY, "{}");
    const handler = jest.fn();
    setUnauthorizedHandler(handler);
    jest.spyOn(globalThis, "fetch").mockImplementation(() => reply({ error: { code: "unauthorized", message: "no" } }, 401));
    await expect(api.getProfile()).rejects.toBeInstanceOf(ApiError);
    expect(handler).toHaveBeenCalled();
    expect(await getToken()).toBeNull();
    expect(await AsyncStorage.getItem(RECS_CACHE_KEY)).toBeNull();
  });

  it("retries a GET three times on a network failure, but a write only once", async () => {
    jest.useFakeTimers();
    const f = jest.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("offline"));
    const read = expect(api.getProfile()).rejects.toMatchObject({ code: "network" });
    await jest.runAllTimersAsync();
    await read;
    expect(f).toHaveBeenCalledTimes(3);
    f.mockClear();
    const write = expect(api.requestRegisterCode("a@b.co")).rejects.toMatchObject({ code: "network" });
    await jest.runAllTimersAsync();
    await write;
    expect(f).toHaveBeenCalledTimes(1);
  });
});

const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
const jwt = (secondsLeft: number) => `${b64({ alg: "HS256" })}.${b64({ exp: Math.floor(Date.now() / 1000) + secondsLeft })}.sig`;

describe("sliding session (mobile)", () => {
  beforeEach(async () => { await AsyncStorage.clear(); await clearToken(); setUnauthorizedHandler(null); });
  afterEach(() => jest.restoreAllMocks());

  it("reads the time left in a token", () => {
    expect(tokenSecondsLeft(jwt(600))).toBeGreaterThan(590);
    expect(tokenSecondsLeft("junk")).toBe(0);
    expect(tokenSecondsLeft(null)).toBe(0);
  });
  it("does not renew while there is plenty of time", async () => {
    await setToken(jwt(50 * 60));
    const f = jest.spyOn(globalThis, "fetch").mockImplementation(() => reply({ status: "draft" }));
    await api.getProfile();
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("renews first when less than 20 minutes remain and then uses the new token", async () => {
    await setToken(jwt(5 * 60));
    const fresh = jwt(3600);
    const f = jest.spyOn(globalThis, "fetch").mockImplementation((url) => (String(url).endsWith("/auth/refresh") ? reply({ access_token: fresh }) : reply({ status: "draft" })));
    await api.getProfile();
    expect(f).toHaveBeenCalledTimes(2);
    expect(await getToken()).toBe(fresh);
    expect(((f.mock.calls[1][1] as RequestInit).headers as Record<string, string>).Authorization).toBe(`Bearer ${fresh}`);
  });
  it("shares one renewal between simultaneous calls and carries on if renewal is refused", async () => {
    const old = jwt(5 * 60);
    await setToken(old);
    const f = jest.spyOn(globalThis, "fetch").mockImplementation((url) => (String(url).endsWith("/auth/refresh") ? reply({ error: { code: "session_too_old", message: "x" } }, 401) : reply({})));
    await Promise.all([api.getProfile(), api.getProfile()]);
    expect(f.mock.calls.filter((c) => String(c[0]).endsWith("/auth/refresh"))).toHaveLength(1);
    expect(await getToken()).toBe(old);
  });
});
