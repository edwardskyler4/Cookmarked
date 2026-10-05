// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../src/App";

afterEach(cleanup);

describe("Cookmarked page shells", () => {
  it.each(["Planner", "Import", "Settings", "Login"])(
    "returns to the home library from %s",
    (page) => {
      render(<App />);
      fireEvent.click(screen.getByRole("button", { name: page }));

      fireEvent.click(screen.getByRole("button", { name: "Home" }));

      expect(
        screen.getByRole("searchbox", { name: "Search recipes" }),
      ).toBeDefined();
      expect(
        screen.getAllByRole("heading", { name: "Recipe Name" }),
      ).toHaveLength(4);
      expect(screen.queryByRole("heading", { name: page })).toBeNull();
      expect(screen.getByText("Home / Library")).toBeDefined();
      expect(
        screen
          .getByRole("button", { name: "Home" })
          .getAttribute("aria-current"),
      ).toBe("page");
      expect(
        screen.getByRole("button", { name: page }).getAttribute("aria-current"),
      ).toBeNull();
    },
  );

  it("opens login from the header", () => {
    render(<App />);

    const loginButton = screen.queryByRole("button", { name: "Login" });
    expect(loginButton).not.toBeNull();
    fireEvent.click(loginButton!);

    expect(screen.queryByRole("heading", { name: "Login" })).not.toBeNull();
    expect(
      screen.queryByRole("searchbox", { name: "Search recipes" }),
    ).toBeNull();
    expect(
      screen.getByText("Login", { selector: ".location-label" }),
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: "Home" }).getAttribute("aria-current"),
    ).toBeNull();
  });

  it("opens settings from the main navigation", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));

    expect(screen.queryByRole("heading", { name: "Settings" })).not.toBeNull();
    expect(
      screen.queryByRole("searchbox", { name: "Search recipes" }),
    ).toBeNull();
    expect(
      screen
        .getByRole("button", { name: "Settings" })
        .getAttribute("aria-current"),
    ).toBe("page");
    expect(
      screen.getByText("Settings", { selector: ".location-label" }),
    ).toBeDefined();
  });

  it("opens import from the main navigation", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Import" }));

    expect(screen.queryByRole("heading", { name: "Import" })).not.toBeNull();
    expect(
      screen.queryByRole("searchbox", { name: "Search recipes" }),
    ).toBeNull();
    expect(
      screen
        .getByRole("button", { name: "Import" })
        .getAttribute("aria-current"),
    ).toBe("page");
    expect(
      screen.getByText("Import", { selector: ".location-label" }),
    ).toBeDefined();
  });

  it("opens the planner from the main navigation", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Planner" }));

    expect(screen.queryByRole("heading", { name: "Planner" })).not.toBeNull();
    expect(
      screen.queryByRole("searchbox", { name: "Search recipes" }),
    ).toBeNull();
    expect(
      screen
        .getByRole("button", { name: "Planner" })
        .getAttribute("aria-current"),
    ).toBe("page");
    expect(
      screen.getByText("Planner", { selector: ".location-label" }),
    ).toBeDefined();
  });
});
