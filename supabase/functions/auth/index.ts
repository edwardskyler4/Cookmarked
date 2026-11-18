import {
  createCredentialEndpoint,
  environmentConfig,
} from "../_shared/endpoint.ts";
import { SupabaseAuthGateway } from "../_shared/data/SupabaseAuthGateway.ts";
import { handleAuth } from "../_shared/ui/authHandler.ts";
if (typeof Deno !== "undefined")
  Deno.serve(
    createCredentialEndpoint(environmentConfig(), (request, client, headers) =>
      handleAuth(request, new SupabaseAuthGateway(client), headers),
    ),
  );
