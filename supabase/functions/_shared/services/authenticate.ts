import { AuthError, type AuthGateway } from "../domain/AuthGateway.ts";

// This namespace is part of account identity. Changing it requires migration.
const identifierDomain = "accounts.cookmarked.edw20009.workers.dev";

export async function authenticate(
  gateway: AuthGateway,
  action: "register" | "login",
  credentials: unknown,
) {
  if (
    !credentials ||
    typeof credentials !== "object" ||
    !("username" in credentials) ||
    typeof credentials.username !== "string" ||
    !("password" in credentials) ||
    typeof credentials.password !== "string" ||
    !credentials.password
  ) {
    throw new AuthError("invalid_input");
  }
  const username = credentials.username.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,32}$/.test(username))
    throw new AuthError("invalid_username");
  if (action === "register" && credentials.password.length < 8)
    throw new AuthError("weak_password");
  return gateway[action](
    `${username}@${identifierDomain}`,
    credentials.password,
    username,
  );
}
