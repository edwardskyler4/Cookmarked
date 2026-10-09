export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface AuthGateway {
  register(
    identifier: string,
    password: string,
    username: string,
  ): Promise<AuthTokens>;
  login(
    identifier: string,
    password: string,
    username: string,
  ): Promise<AuthTokens>;
}

export type AuthErrorCode =
  | "invalid_input"
  | "invalid_username"
  | "weak_password"
  | "invalid_credentials"
  | "username_taken"
  | "rate_limited"
  | "unavailable";

export class AuthError extends Error {
  constructor(public readonly code: AuthErrorCode) {
    super(code);
  }
}
