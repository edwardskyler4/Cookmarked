import type { RecipeCreator, RecipeInput } from "../domain/Recipe.ts";
import { createRecipe } from "../services/createRecipe.ts";

export async function handleRecipe(
  request: Request,
  authUserId: string,
  creator: RecipeCreator,
  origins: string[],
): Promise<Response> {
  const origin = request.headers.get("Origin");
  const headers = new Headers({
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    Vary: "Origin",
  });

  if (origin && !origins.includes(origin)) {
    return new Response(JSON.stringify({ code: "invalid_input" }), {
      status: 403,
      headers,
    });
  }

  if (origin) headers.set("Access-Control-Allow-Origin", origin);
  headers.set(
    "Access-Control-Allow-Headers",
    "authorization, apikey, content-type, x-client-info",
  );
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");

  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers });

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ code: "invalid_input" }), {
      status: 405,
      headers,
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ code: "invalid_input" }), {
      status: 400,
      headers,
    });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return new Response(JSON.stringify({ code: "invalid_input" }), {
      status: 400,
      headers,
    });
  }

  try {
    const recipe = await createRecipe(
      creator,
      authUserId,
      body as RecipeInput,
    );
    return new Response(JSON.stringify(recipe), { status: 201, headers });
  } catch {
    return new Response(JSON.stringify({ code: "unavailable" }), {
      status: 503,
      headers,
    });
  }
}
