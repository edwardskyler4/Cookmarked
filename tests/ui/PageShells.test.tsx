// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../src/App";

import { fakeAuthService } from "../fakes/authService";

afterEach(cleanup);

describe("Cookmarked page shells", () => {
  it.each(["Planner", "Import", "Settings"])(
    "returns to the home library from %s",
    async (page) => {
      render(<App authService={fakeAuthService().service} />);
      await screen.findByRole("searchbox");
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

  it("returns to the home library after logging in again", async () => {
    render(<App authService={fakeAuthService().service} />);
    await screen.findByRole("searchbox");
    fireEvent.click(screen.getByRole("button", { name: "Planner" }));
    fireEvent.click(screen.getByRole("button", { name: "Log out" }));
    await screen.findByRole("heading", { name: "Login" });
    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "kyler" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));
    await screen.findByRole("searchbox", { name: "Search recipes" });
    expect(
      screen.getByRole("button", { name: "Home" }).getAttribute("aria-current"),
    ).toBe("page");
    expect(screen.queryByRole("heading", { name: "Planner" })).toBeNull();
  });

  it("opens login after signing out from the header", async () => {
    render(<App authService={fakeAuthService().service} />);
    await screen.findByRole("searchbox");
    fireEvent.click(screen.getByRole("button", { name: "Log out" }));
    await screen.findByRole("heading", { name: "Login" });
    expect(screen.queryByRole("searchbox")).toBeNull();
    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("opens settings from the main navigation", async () => {
    render(<App authService={fakeAuthService().service} />);
    await screen.findByRole("searchbox");

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

  it("opens import from the main navigation", async () => {
    render(<App authService={fakeAuthService().service} />);
    await screen.findByRole("searchbox");

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

  it("opens the planner from the main navigation", async () => {
    render(<App authService={fakeAuthService().service} />);
    await screen.findByRole("searchbox");

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
