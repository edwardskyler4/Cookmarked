import type { AuthRepository } from "../domain/repositories/AuthRepository";

// Browser orchestration only. Credential rules run in the Edge Function service.
export function createAuthService(repository: AuthRepository): AuthRepository {
  return {
    register: (username, password) => repository.register(username, password),
    login: (username, password) => repository.login(username, password),
    restore: () => repository.restore(),
    logout: () => repository.logout(),
    subscribe: (listener) => repository.subscribe(listener),
  };
}
export type AuthService = ReturnType<typeof createAuthService>;
