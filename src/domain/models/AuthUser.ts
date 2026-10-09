export interface AuthUser {
  id: string;
  username: string;
}

export class AuthenticationError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}
