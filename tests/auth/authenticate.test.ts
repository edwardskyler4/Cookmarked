import { describe, expect, it, vi } from "vitest";
import { authenticate } from "../../supabase/functions/_shared/services/authenticate";

const session = { access_token: "access", refresh_token: "refresh" };
describe("authenticate", () => {
  it.each(["register", "login"] as const)(
    "maps a normalized username for %s",
    async (action) => {
      const gateway = {
        register: vi.fn().mockResolvedValue(session),
        login: vi.fn().mockResolvedValue(session),
      };
      expect(
        await authenticate(gateway, action, {
          username: " Kyler ",
          password: " password123 ",
        }),
      ).toEqual(session);
      expect(gateway[action]).toHaveBeenCalledWith(
        "kyler@accounts.cookmarked.edw20009.workers.dev",
        " password123 ",
        "kyler",
      );
    },
  );
  it("rejects missing credentials without calling Auth", async () => {
    const gateway = { register: vi.fn(), login: vi.fn() };
    await expect(authenticate(gateway, "login", {})).rejects.toMatchObject({
      code: "invalid_input",
    });
    expect(gateway.login).not.toHaveBeenCalled();
  });
  it("propagates an authentication failure", async () => {
    const gateway = {
      register: vi.fn(),
      login: vi.fn().mockRejectedValue(new Error("offline")),
    };
    await expect(
      authenticate(gateway, "login", {
        username: "kyler",
        password: "password123",
      }),
    ).rejects.toThrow("offline");
  });
});

describe("credential rules", () => {
  it.each(["ab", "a".repeat(33), "hello-world", "foo@bar", "😀abc"])(
    "rejects invalid username %s",
    async (username) => {
      const gateway = { register: vi.fn(), login: vi.fn() };
      await expect(
        authenticate(gateway, "register", {
          username,
          password: "password123",
        }),
      ).rejects.toMatchObject({ code: "invalid_username" });
      expect(gateway.register).not.toHaveBeenCalled();
    },
  );
  it("rejects passwords shorter than eight characters during registration", async () => {
    const gateway = { register: vi.fn(), login: vi.fn() };
    await expect(
      authenticate(gateway, "register", {
        username: "kyler",
        password: "short",
      }),
    ).rejects.toMatchObject({ code: "weak_password" });
  });
  it.each(["abc", "a".repeat(32)])(
    "accepts username boundary %s",
    async (username) => {
      const gateway = {
        register: vi.fn().mockResolvedValue(session),
        login: vi.fn(),
      };
      await expect(
        authenticate(gateway, "register", { username, password: "12345678" }),
      ).resolves.toEqual(session);
    },
  );
});
