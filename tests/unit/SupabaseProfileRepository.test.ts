import { beforeEach, describe, expect, it, vi } from "vitest";
import { SupabaseProfileRepository } from "../../src/data/repositories/SupabaseProfileRepository";

const { auth, from, select, update, eq, single } = vi.hoisted(() => ({
  auth: { getUser: vi.fn() },
  from: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  single: vi.fn(),
}));

vi.mock("../../src/data/supabaseClient", () => ({
    supabase: { auth, from },
}));

describe("SupabaseProfileRepository", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    from.mockReturnValue({ select, update });
    select.mockReturnValue({ single });
    update.mockReturnValue({ eq });
    eq.mockReturnValue({ select });
  });

  it("reads the current first name", async () => {
    single.mockResolvedValue({ data: { first_name: "Kyler" }, error: null });

    const repository = new SupabaseProfileRepository({ auth, from } as never);

    await expect(repository.getCurrent()).resolves.toEqual({
      firstName: "Kyler",
    });
    expect(select).toHaveBeenCalledWith("first_name");
  });

  it("updates only first_name and maps the saved value", async () => {
    single.mockResolvedValue({ data: { first_name: "Chef Kyler" }, error: null });
    auth.getUser.mockResolvedValue({
      data: { user: { id: "auth-user-uuid" } },
      error: null,
    });

    const repository = new SupabaseProfileRepository({ auth, from } as never);

    await expect(repository.updateFirstName("Chef Kyler")).resolves.toEqual({
      firstName: "Chef Kyler",
    });
    expect(update).toHaveBeenCalledWith({ first_name: "Chef Kyler" });
    expect(eq).toHaveBeenCalledWith("auth_user_id", "auth-user-uuid");
  });
});
