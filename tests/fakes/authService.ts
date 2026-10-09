import { vi } from "vitest";
import type { AuthUser } from "../../src/domain/models/AuthUser";
import type { AuthService } from "../../src/services/authService";

export const signedInUser = { id: "uuid", username: "kyler" };
export function fakeAuthService(user: AuthUser | null = signedInUser) {
  let notify: (user: AuthUser | null) => void = () => {};
  const service: AuthService = {
    restore: vi.fn().mockResolvedValue(user),
    login: vi.fn().mockResolvedValue(signedInUser),
    register: vi.fn().mockResolvedValue(signedInUser),
    logout: vi.fn().mockImplementation(async () => notify(null)),
    subscribe: vi.fn().mockImplementation((listener) => {
      notify = listener;
      return vi.fn();
    }),
  };
  return { service, emit: (next: AuthUser | null) => notify(next) };
}
