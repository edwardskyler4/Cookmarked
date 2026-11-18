import type { AuthGateway } from "../domain/AuthGateway.ts";
import { authenticate } from "../services/authenticate.ts";
import { ApiError, readJson } from "./apiError.ts";
import { jsonResponse } from "./http.ts";
export async function handleAuth(
  request: Request,
  gateway: AuthGateway,
  headers: Headers,
): Promise<Response> {
  const body = await readJson(request);
  if (
    !body ||
    typeof body !== "object" ||
    !("action" in body) ||
    (body.action !== "register" && body.action !== "login")
  )
    throw new ApiError("invalid_input");
  return jsonResponse(
    200,
    await authenticate(gateway, body.action, body),
    headers,
  );
}
