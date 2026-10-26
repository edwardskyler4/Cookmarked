// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import { fakeAuthService } from "../fakes/authService";
import { fakeRecipeService } from "../fakes/recipeService";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("planner recipe import navigation", () => {
  it("opens Import at the top from Add Recipe in the weekly planner", async () => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    render(<App authService={fakeAuthService().service} recipeService={fakeRecipeService()} />);
    await screen.findByRole("searchbox");
    fireEvent.click(screen.getByRole("button", { name: "Planner" }));
    fireEvent.doubleClick(screen.getAllByText("Breakfast")[0]);
    fireEvent.click(screen.getByRole("button", { name: "Add Recipe" }));

    expect(screen.getByRole("heading", { name: "Import" })).toBeDefined();
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it("opens Import at the top from Add Recipe in the monthly planner", async () => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    render(<App authService={fakeAuthService().service} recipeService={fakeRecipeService()} />);
    await screen.findByRole("searchbox");
    fireEvent.click(screen.getByRole("button", { name: "Planner" }));
    fireEvent.click(screen.getByRole("button", { name: "Monthly" }));
    fireEvent.doubleClick(screen.getAllByRole("button", { name: /Double-click to plan meals/ })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Breakfast" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Recipe" }));

    expect(screen.getByRole("heading", { name: "Import" })).toBeDefined();
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });
});


