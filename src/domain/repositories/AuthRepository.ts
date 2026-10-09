import type { AuthUser } from "../models/AuthUser";

export interface AuthRepository {
  register(username: string, password: string): Promise<AuthUser>;
  login(username: string, password: string): Promise<AuthUser>;
  restore(): Promise<AuthUser | null>;
  logout(): Promise<void>;
  subscribe(listener: (user: AuthUser | null) => void): () => void;
}
