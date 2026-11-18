import { RecipeMetadataError } from "../domain/RecipeMetadata.ts";
import { AuthError } from "../domain/AuthGateway.ts";
import { RecipeError } from "../domain/RecipeRepository.ts";
import { jsonResponse, logHttpFailure } from "./http.ts";

export const apiErrorStatuses = {
  invalid_input: 400,
  invalid_json: 400,
  invalid_username: 400,
  weak_password: 400,
  missing_url: 400,
  invalid_source_url: 400,
  unsupported_platform: 400,
  forbidden: 403,
  unauthorized: 401,
  invalid_credentials: 401,
  profile_not_found: 403,
  temp_recipe_not_found: 404,
  method_not_allowed: 405,
  username_taken: 409,
  rate_limited: 429,
  unavailable: 503,
} as const;
export type ApiErrorCode = keyof typeof apiErrorStatuses;
export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    public readonly field?: string,
  ) {
    super(code);
  }
}
export function apiErrorResponse(
  error: unknown,
  headers: Headers,
  operation: string,
): Response {
  if (
    error instanceof ApiError ||
    error instanceof RecipeError ||
    error instanceof AuthError ||
    error instanceof RecipeMetadataError
  ) {
    const field = "field" in error ? error.field : undefined;
    return jsonResponse(
      apiErrorStatuses[error.code],
      { code: error.code, ...(field ? { field } : {}) },
      headers,
    );
  }
  logHttpFailure(operation, error);
  return jsonResponse(503, { code: "unavailable" }, headers);
}
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError("invalid_json");
  }
}
