import {
  createUserEndpoint,
  environmentConfig,
  type FunctionConfig,
} from "../_shared/endpoint.ts";
import { ApiError, readJson } from "../_shared/ui/apiError.ts";
import { jsonResponse } from "../_shared/ui/http.ts";
import { getRecipeMetadata } from "../_shared/services/getRecipeMetadata.ts";
export function createMetadataRequestHandler(config: FunctionConfig) {
  return createUserEndpoint(
    "recipe_metadata",
    config,
    async (request, _context, headers) => {
      const body = await readJson(request);
      if (typeof body !== "object" || body === null || !("url" in body)) {
        throw new ApiError("missing_url");
      }

      const metadata = getRecipeMetadata(body.url);

      return jsonResponse(200, metadata, headers);
    },
  );
}
if (typeof Deno !== "undefined")
  Deno.serve(createMetadataRequestHandler(environmentConfig()));
