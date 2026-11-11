// @vitest-environment jsdom
import { Children, type ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App";

const { render } = vi.hoisted(() => ({ render: vi.fn() }));

vi.mock("react-dom/client", () => ({
  createRoot: () => ({ render }),
}));

// Startup constructs adapters, but this test never contacts Supabase.
vi.mock("../../src/data/supabaseClient", () => ({ supabase: {} }));

afterEach(() => document.body.replaceChildren());

describe("application startup", () => {
  it("mounts one fully wired application", async () => {
    document.body.innerHTML = '<div id="root"></div>';

    await import("../../src/main");

    expect(render).toHaveBeenCalledOnce();
    const strictMode = render.mock.calls[0][0] as ReactElement<{
      children: ReactElement[];
    }>;
    const applications = Children.toArray(strictMode.props.children);
    expect(applications).toHaveLength(1);
    expect(applications[0]).toMatchObject({
      type: App,
      props: {
        authService: expect.objectContaining({ restore: expect.any(Function) }),
        recipeService: expect.objectContaining({
          create: expect.any(Function),
        }),
        recipeReader: expect.objectContaining({ list: expect.any(Function) }),
        profileService: expect.objectContaining({
          getCurrent: expect.any(Function),
          updateDisplayName: expect.any(Function),
        }),
      },
    });
  });
});
