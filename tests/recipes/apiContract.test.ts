import { describe, expect, it } from "vitest";
import {
  ApiError,
  apiErrorResponse,
  apiErrorStatuses,
  type ApiErrorCode,
} from "../../supabase/functions/_shared/ui/apiError";
import { functionFailure } from "../../src/data/functionFailure";

describe("application and browser error wire contract", () => {
  it.each(Object.keys(apiErrorStatuses) as ApiErrorCode[])(
    "round-trips the declared %s code",
    async (code) => {
      const response = apiErrorResponse(
        new ApiError(code, code === "invalid_input" ? "title" : undefined),
        new Headers(),
        "operation",
      );
      expect(response.status).toBe(apiErrorStatuses[code]);
      const failure = await functionFailure({ context: response });
      expect(failure).toEqual({
        code,
        ...(code === "invalid_input" ? { field: "title" } : {}),
      });
    },
  );
});
