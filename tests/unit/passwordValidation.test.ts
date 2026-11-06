import { describe, expect, it } from "vitest";
import { validatePassword } from "../../src/domain/validation/password";

describe("validatePassword", () => {
  it.each([
    "short1!",
    "longpassword!",
    "Longpassword!",
    "Longpassword1",
  ])("rejects password %s when a requirement is missing", (password) => {
    expect(validatePassword(password)).not.toBeNull();
  });

  it("accepts a password with all required character types", () => {
    expect(validatePassword("Longpass1!")).toBeNull();
  });
});
