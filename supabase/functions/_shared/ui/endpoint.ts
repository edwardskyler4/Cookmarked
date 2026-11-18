import { endpointPolicies, type UserEndpoint } from "./endpoints.ts";
import { handleHttpRequest } from "./http.ts";
import { ApiError, apiErrorResponse } from "./apiError.ts";

const operations = {
  auth: "Unable to authenticate",
  recipes: "Unable to list recipes",
  recipes_save: "Unable to save recipe",
  temp_recipes: "Unable to access temporary recipes",
  recipe_metadata: "Unable to retrieve recipe metadata",
} as const;
function endpoint(
  name: keyof typeof endpointPolicies,
  request: Request,
  origins: string[],
  action: (headers: Headers) => Promise<Response>,
) {
  const methods: readonly string[] = endpointPolicies[name].methods;
  return handleHttpRequest(
    request,
    origins,
    [...methods, "OPTIONS"].join(", "),
    async (headers) => {
      try {
        if (!methods.includes(request.method)) {
          headers.set("Allow", [...methods, "OPTIONS"].join(", "));
          throw new ApiError("method_not_allowed");
        }
        return await action(headers);
      } catch (error) {
        return apiErrorResponse(error, headers, operations[name]);
      }
    },
  );
}
export type VerifiedContext<T> = { userId: string; resource: T };
export function userEndpoint<T>(
  name: UserEndpoint,
  request: Request,
  origins: string[],
  verify: (token: string) => Promise<VerifiedContext<T> | null>,
  action: (context: VerifiedContext<T>, headers: Headers) => Promise<Response>,
): Promise<Response> {
  return endpoint(name, request, origins, async (headers) => {
    const token = request.headers
      .get("Authorization")
      ?.match(/^Bearer\s+(\S+)$/i)?.[1];
    if (!token || token.startsWith("sb_")) throw new ApiError("unauthorized");
    const context = await verify(token);
    if (!context?.userId) throw new ApiError("unauthorized");
    return action(context, headers);
  });
}
export function credentialEndpoint(
  request: Request,
  origins: string[],
  action: (headers: Headers) => Promise<Response>,
): Promise<Response> {
  return endpoint("auth", request, origins, action);
}
