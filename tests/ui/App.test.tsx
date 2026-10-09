// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../src/App";

import { fakeAuthService } from "../fakes/authService";

afterEach(cleanup);

describe("Cookmarked home", () => {
  it("shows the recipe library on startup", async () => {
    render(<App authService={fakeAuthService().service} />);
    await screen.findByRole("searchbox");

    expect(screen.getByRole("heading", { name: "Cookmarked" })).toBeDefined();
    expect(screen.getByText("Home / Library")).toBeDefined();
    expect(
      screen.getByRole("searchbox", { name: "Search recipes" }),
    ).toBeDefined();
    expect(
      screen.getAllByRole("heading", { name: "Recipe Name" }),
    ).toHaveLength(4);
  });

  it("marks home as the current navigation page on startup", async () => {
    render(<App authService={fakeAuthService().service} />);
    await screen.findByRole("searchbox");

    const navigation = within(
      screen.getByRole("navigation", { name: "Main navigation" }),
    );
    expect(
      navigation
        .getByRole("button", { name: "Home" })
        .getAttribute("aria-current"),
    ).toBe("page");
    for (const name of ["Planner", "Import", "Settings"]) {
      expect(
        navigation.getByRole("button", { name }).getAttribute("aria-current"),
      ).toBeNull();
    }
  });
});
