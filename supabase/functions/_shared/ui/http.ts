// HTTP concerns only: each endpoint still authenticates before accessing data.
export function corsHeaders(
  request: Request,
  origins: string[],
  methods: string,
): Headers {
  const headers = new Headers({
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    Vary: "Origin",
    "Access-Control-Allow-Headers":
      "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": methods,
  });
  const origin = request.headers.get("Origin");
  if (origin && origins.includes(origin))
    headers.set("Access-Control-Allow-Origin", origin);
  return headers;
}

export function jsonResponse(
  status: number,
  body: unknown,
  headers: Headers,
): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

export function logHttpFailure(operation: string, error: unknown): void {
  // Error messages can include SQL values or tokens; log diagnostic categories only.
  const failure = error as { code?: unknown; status?: unknown } | null;
  console.error(operation, {
    name: error instanceof Error ? error.name : "UnknownError",
    ...(typeof failure?.code === "string" &&
    /^[A-Z0-9_]{1,40}$/.test(failure.code)
      ? { code: failure.code }
      : {}),
    ...(typeof failure?.status === "number" ? { status: failure.status } : {}),
  });
}

export async function handleHttpRequest(
  request: Request,
  origins: string[],
  methods: string,
  action: (headers: Headers) => Response | Promise<Response>,
): Promise<Response> {
  const headers = corsHeaders(request, origins, methods);
  const origin = request.headers.get("Origin");
  if (origin && !origins.includes(origin))
    return jsonResponse(403, { code: "invalid_input" }, headers);
  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers });
  try {
    const response = await action(headers);
    const responseHeaders = new Headers(response.headers);
    const vary = (responseHeaders.get("Vary") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    if (!vary.some((value) => value.toLowerCase() === "origin"))
      vary.push("Origin");
    for (const [name, value] of headers) {
      if (
        name === "vary" ||
        (name === "content-type" && responseHeaders.has(name))
      )
        continue;
      responseHeaders.set(name, value);
    }
    responseHeaders.set("Vary", vary.join(", "));
    // The boundary supplies CORS even when an inner response forgets its headers.
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    logHttpFailure("Edge request failed", error);
    return jsonResponse(503, { code: "unavailable" }, headers);
  }
}
