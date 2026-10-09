import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it } from "vitest";
import App from "../../src/App";
import { fakeAuthService } from "../fakes/authService";

describe("Cookmarked homepage", () => {
  it("renders the branded loading shell before authentication", () => {
    const markup = renderToStaticMarkup(
      <App authService={fakeAuthService().service} />,
    );

    expect(markup).toContain("Cookmarked");
    expect(markup).toContain("Checking your session");
    for (const privateContent of [
      "Home / Library",
      "Search recipes",
      "Recipe Name",
      "Planner",
      "Import",
      "Settings",
    ]) {
      expect(markup).not.toContain(privateContent);
    }
    expect(markup).toContain('class="header-brand"');
    expect(markup).toContain('src="/logo.jpg"');
  });
});
