import { describe, expect, it, vi } from "vitest";
import { SupabaseAuthRepository } from "../../src/data/repositories/SupabaseAuthRepository";
import { createAuthService } from "../../src/services/authService";

function setup() {
  const user = {
    id: "uuid",
    email: "kyler@accounts.cookmarked.edw20009.workers.dev",
  };
  const auth = {
    setSession: vi
      .fn()
      .mockResolvedValue({ data: { session: { user } }, error: null }),
    getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn(),
  };
  const functions = {
    invoke: vi.fn().mockResolvedValue({
      data: { access_token: "access", refresh_token: "refresh" },
      error: null,
    }),
  };
  const repo = new SupabaseAuthRepository({ auth, functions } as never);
  return { auth, functions, repo };
}
describe("browser authentication", () => {
  it.each(["register", "login"] as const)(
    "installs the session returned by %s",
    async (action) => {
      const { repo, auth, functions } = setup();
      const service = createAuthService(repo);
      expect(await service[action]("Kyler", "password123")).toEqual({
        id: "uuid",
        username: "kyler",
      });
      expect(functions.invoke).toHaveBeenCalledWith("auth", {
        body: { action, username: "Kyler", password: "password123" },
      });
      expect(auth.setSession).toHaveBeenCalledWith({
        access_token: "access",
        refresh_token: "refresh",
      });
    },
  );
  it("restores a user validated by Auth", async () => {
    const { repo, auth } = setup();
    expect(await repo.restore()).toEqual({ id: "uuid", username: "kyler" });
    expect(auth.getUser).toHaveBeenCalled();
  });
  it("returns no user without a session", async () => {
    const { repo, auth } = setup();
    auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { name: "AuthSessionMissingError" },
    } as never);
    expect(await repo.restore()).toBeNull();
  });
  it("surfaces a failed restoration rather than claiming success", async () => {
    const { repo, auth } = setup();
    auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { name: "AuthRetryableFetchError" },
    } as never);
    await expect(repo.restore()).rejects.toMatchObject({ code: "unavailable" });
  });
  it("maps a function HTTP error to a domain error", async () => {
    const { repo, functions, auth } = setup();
    functions.invoke.mockResolvedValue({
      data: null,
      error: {
        context: new Response(JSON.stringify({ code: "invalid_credentials" }), {
          status: 401,
        }),
      },
    } as never);
    await expect(repo.login("kyler", "wrong")).rejects.toMatchObject({
      code: "invalid_credentials",
    });
    expect(auth.setSession).not.toHaveBeenCalled();
  });
  it("rejects malformed function responses", async () => {
    const { repo, functions } = setup();
    functions.invoke.mockResolvedValue({ data: {}, error: null } as never);
    await expect(repo.register("kyler", "password123")).rejects.toMatchObject({
      code: "unavailable",
    });
  });
  it("propagates failed session installation", async () => {
    const { repo, auth } = setup();
    auth.setSession.mockResolvedValue({
      data: { session: null },
      error: new Error("offline"),
    } as never);
    await expect(repo.login("kyler", "password123")).rejects.toMatchObject({
      code: "unavailable",
    });
  });
  it("signs out the current browser session", async () => {
    const { repo, auth } = setup();
    await repo.logout();
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
  it("reports a failed sign-out", async () => {
    const { repo, auth } = setup();
    auth.signOut.mockResolvedValue({ error: new Error("offline") } as never);
    await expect(repo.logout()).rejects.toMatchObject({ code: "unavailable" });
  });
  it("observes session loss and unsubscribes", () => {
    const { repo, auth } = setup();
    const unsubscribe = vi.fn();
    auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe } },
    });
    const listener = vi.fn();
    const stop = repo.subscribe(listener);
    const callback = auth.onAuthStateChange.mock.calls[0][0];
    callback("SIGNED_OUT", null);
    expect(listener).toHaveBeenCalledWith(null);
    stop();
    expect(unsubscribe).toHaveBeenCalled();
  });
  it("does not accept an account outside the Cookmarked namespace", async () => {
    const { repo, auth } = setup();
    auth.getUser.mockResolvedValue({
      data: { user: { id: "uuid", email: "other@example.com" } },
      error: null,
    });
    await expect(repo.restore()).rejects.toMatchObject({ code: "unavailable" });
  });
});

describe("session validation", () => {
  it("waits for restoration to validate the initial cached session", () => {
    const { repo, auth } = setup();
    auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    const listener = vi.fn();
    repo.subscribe(listener);
    auth.onAuthStateChange.mock.calls[0][0]("INITIAL_SESSION", {
      user: {
        id: "uuid",
        email: "kyler@accounts.cookmarked.edw20009.workers.dev",
      },
    });
    expect(listener).not.toHaveBeenCalled();
  });
  it("clears rejected sessions and returns to login", async () => {
    const { repo, auth } = setup();
    auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { name: "AuthApiError", status: 401 },
    } as never);
    expect(await repo.restore()).toBeNull();
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
});

describe("expired session restoration", () => {
  it.each([
    "refresh_token_not_found",
    "refresh_token_already_used",
    "session_not_found",
    "user_not_found",
    "bad_jwt",
  ])("clears invalid session %s", async (code) => {
    const { repo, auth } = setup();
    auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { name: "AuthApiError", status: 400, code },
    } as never);
    expect(await repo.restore()).toBeNull();
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
});
