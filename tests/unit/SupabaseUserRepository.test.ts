import { beforeEach, describe, expect, it, vi } from "vitest";
import { SupabaseUserRepository } from "../../src/data/repositories/SupabaseUserRepository";

const { from, insert, select, single } = vi.hoisted(() => ({
  from: vi.fn(),
  insert: vi.fn(),
  select: vi.fn(),
  single: vi.fn(),
}));

vi.mock("../../src/data/supabaseClient", () => ({
  supabase: { from },
}));

describe("SupabaseUserRepository", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    from.mockReturnValue({ insert });
    insert.mockReturnValue({ select });
    select.mockReturnValue({ single });
  });

  it("maps the selected user_id to the domain user ID", async () => {
    // Arrange: Supabase returns the columns requested by select().
    single.mockResolvedValue({
      data: { user_id: 42, username: "Evan" },
      error: null,
    });
    const repository = new SupabaseUserRepository();

    // Act
    const user = await repository.save("Evan");

    // Assert
    expect(user.id).toBe(42);
  });

  it("returns the username provided by the database", async () => {
    single.mockResolvedValue({
      data: { user_id: 42, username: "Saved name" },
      error: null,
    });
    const repository = new SupabaseUserRepository();

    const user = await repository.save("Submitted name");

    expect(user.username).toBe("Saved name");
  });

  it("reports the Supabase error message when saving fails", async () => {
    single.mockResolvedValue({
      data: null,
      error: { message: "Permission denied" },
    });
    const repository = new SupabaseUserRepository();

    await expect(repository.save("Evan")).rejects.toThrow(
      "Unable to save user: Permission denied",
    );
  });

  it("propagates a rejected database request", async () => {
    const failure = new Error("Connection interrupted");
    single.mockRejectedValue(failure);
    const repository = new SupabaseUserRepository();

    await expect(repository.save("Evan")).rejects.toBe(failure);
  });
});
