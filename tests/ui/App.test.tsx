// @vitest-environment jsdom
import { fakeRecipeService } from "../fakes/recipeService";

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../src/App";
import type { RecipeReader } from "../../src/domain/repositories/RecipeReader";

import { fakeAuthService } from "../fakes/authService";

afterEach(cleanup);

describe("Cookmarked home", () => {
  it("reloads the recipe library after a successful recipe save", async () => {
    let loadCount = 0;
    const recipeReader: RecipeReader = {
      list: async () => {
        loadCount += 1;
        return loadCount === 1
          ? []
          : [
              {
                recipeId: 9,
                userId: 42,
                title: "New recipe",
                mealType: "N/A",
                course: "N/A",
                prepTime: "10 min",
                createdAt: new Date("2026-01-01T00:00:00.000Z"),
                updatedAt: new Date("2026-01-01T00:00:00.000Z"),
              },
            ];
      },
    };
    render(
      <App
        authService={fakeAuthService().service}
        recipeReader={recipeReader}
        recipeService={fakeRecipeService()}
      />,
    );
    await screen.findByText("No recipes saved yet.");
    fireEvent.click(screen.getByRole("button", { name: "Import" }));

    for (const label of [
      "Recipe Title (Required)",
      "Prep Time (Required)",
      "Ingredients (Required)",
      "Directions (Required)",
    ]) {
      fireEvent.change(screen.getByLabelText(label), {
        target: { value: label === "Recipe Title (Required)" ? "New recipe" : "details" },
      });
    }
    fireEvent.change(screen.getByLabelText("Serving Size (Required)"), {
      target: { value: "4" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByText("Recipe saved");

    fireEvent.click(screen.getByRole("button", { name: "Home" }));
    expect(await screen.findByRole("heading", { name: "New recipe" })).toBeDefined();
    expect(loadCount).toBe(2);
  });

  it("shows the recipe library on startup", async () => {
    const recipeReader: RecipeReader = {
      list: async () => [
        {
          recipeId: 7,
          userId: 42,
          title: "Tomato Pasta",
          mealType: "Dinner",
          course: "Entree",
          prepTime: "20 min",
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      ],
    };
    render(
      <App
        authService={fakeAuthService().service}
        recipeReader={recipeReader}
        recipeService={fakeRecipeService()}
      />,
    );
    await screen.findByRole("searchbox");

    expect(screen.getByRole("heading", { name: "Cookmarked" })).toBeDefined();
    expect(screen.getByText("Home / Library")).toBeDefined();
    expect(
      screen.getByRole("searchbox", { name: "Search recipes" }),
    ).toBeDefined();
    expect(
      await screen.findByRole("heading", { name: "Tomato Pasta" }),
    ).toBeDefined();
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
