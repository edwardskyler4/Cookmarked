import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it } from "vitest";
import App from "../../src/App";

describe("Cookmarked homepage", () => {
  it("renders the wireframe homepage navigation and recipe content", () => {
    const markup = renderToStaticMarkup(<App />);

    expect(markup).toContain("Cookmarked");
    expect(markup).toContain("Home / Library");
    expect(markup).toContain("Search recipes");
    expect(markup).toContain("Recipe Name");
    expect(markup).toContain("Planner");
    expect(markup).toContain("Import");
    expect(markup).toContain("Settings");
    expect(markup).toContain('class="header-brand"');
    expect(markup).toContain('src="/logo.jpg"');
  });
});
