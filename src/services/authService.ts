import type { AuthRepository } from "../domain/repositories/AuthRepository";
import { AuthenticationError } from "../domain/models/AuthUser";
import { validatePassword } from "../domain/validation/password";

// Browser orchestration only. Credential rules run in the Edge Function service.
export function createAuthService(repository: AuthRepository): AuthRepository {
  return {
    register: (username, password) => repository.register(username, password),
    login: (username, password) => repository.login(username, password),
    updatePassword: async (password) => {
      if (validatePassword(password))
        throw new AuthenticationError("weak_password");
      await repository.updatePassword(password);
    },
    restore: () => repository.restore(),
    logout: () => repository.logout(),
    subscribe: (listener) => repository.subscribe(listener),
  };
}
export type AuthService = ReturnType<typeof createAuthService>;
