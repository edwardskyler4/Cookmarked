// Transport DTOs stay in data access; UI receives domain errors from adapters.
const errorStatuses: Record<string, number> = {
  invalid_input: 400,
  invalid_json: 400,
  invalid_username: 400,
  weak_password: 400,
  missing_url: 400,
  invalid_source_url: 400,
  unsupported_platform: 400,
  unauthorized: 401,
  invalid_credentials: 401,
  forbidden: 403,
  profile_not_found: 403,
  temp_recipe_not_found: 404,
  method_not_allowed: 405,
  username_taken: 409,
  rate_limited: 429,
  unavailable: 503,
};
export async function functionFailure(error: {
  context?: unknown;
}): Promise<{ code: string; field?: string }> {
  const response = error.context;
  if (!(response instanceof Response)) return { code: "unavailable" };
  try {
    const body = await response.json();
    if (
      typeof body?.code === "string" &&
      errorStatuses[body.code] === response.status
    ) {
      return {
        code: body.code,
        ...(typeof body.field === "string" ? { field: body.field } : {}),
      };
    }
  } catch {
    /* Gateways may return text instead of application JSON. */
  }
  return {
    code:
      response.status === 401
        ? "unauthorized"
        : response.status === 403
          ? "forbidden"
          : response.status === 429
            ? "rate_limited"
            : "unavailable",
  };
}
