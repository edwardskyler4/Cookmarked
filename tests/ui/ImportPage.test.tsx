// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const appStyles = readFileSync("src/App.css", "utf8");
import ImportPage from "../../src/ui/routes/ImportPage";

afterEach(cleanup);

describe("ImportPage fields", () => {
  it("keeps each label associated with only its own text box", () => {
    render(<ImportPage />);

    for (const label of [
      "Source URL",
      "Recipe Title (Required)",
      "Prep Time (Required)",
      "Serving Size (Required)",
      "Ingredients (Required)",
      "Directions (Required)",
      "Nutritional Information",
      "Notes",
    ]) {
      const field = screen.getByLabelText(label);
      const wrapper = field.closest("label") ?? field.parentElement;
      expect(wrapper?.querySelectorAll("input, textarea")).toHaveLength(1);
    }
  });

  it("allows an empty optional Source URL", () => {
    render(<ImportPage />);

    const source = screen.getByLabelText("Source URL") as HTMLInputElement;

    expect(source.required).toBe(false);
    expect(source.checkValidity()).toBe(true);
  });

  it.each([
    "Recipe Title",
    "Prep Time",
    "Serving Size",
    "Ingredients",
    "Directions",
  ])("marks %s as required", (label) => {
    render(<ImportPage />);
    const field = screen.getByLabelText(`${label} (Required)`) as
      HTMLInputElement | HTMLTextAreaElement;

    expect(field.required).toBe(true);
    expect(field.checkValidity()).toBe(false);
    fireEvent.change(field, { target: { value: "Recipe details" } });
    expect(field.checkValidity()).toBe(true);
  });

  it.each(["Source URL", "Nutritional Information", "Notes"])(
    "leaves %s optional without an optional marker",
    (label) => {
      render(<ImportPage />);
      const field = screen.getByLabelText(label) as
        HTMLInputElement | HTMLTextAreaElement;

      expect(field.required).toBe(false);
      expect(field.checkValidity()).toBe(true);
      expect(screen.queryByText(/optional/i)).toBeNull();
    },
  );

  it.each(["Meal Type", "Course"])("allows an empty %s selection", (label) => {
    render(<ImportPage />);
    const field = screen.getByRole("combobox", {
      name: label,
    }) as HTMLSelectElement;

    expect(field.value).toBe("");
    expect(field.required).toBe(false);
    expect(field.checkValidity()).toBe(true);
    fireEvent.change(field, {
      target: { value: label === "Meal Type" ? "Dinner" : "Entree" },
    });
    fireEvent.change(field, { target: { value: "" } });
    expect(field.value).toBe("");
  });

  it("adds visible spacing between each field label and its text box", () => {
    render(<ImportPage />);

    const sourceField = screen.getByLabelText("Source URL");
    expect(sourceField.closest("label")?.getAttribute("style")).toContain(
      "gap: 0.5rem",
    );
  });

  it.each([
    [
      "Meal Type",
      ["Select meal type", "Breakfast", "Lunch", "Dinner", "Supper", "Snack"],
    ],
    [
      "Course",
      ["Select course", "Dessert", "Entree", "Side", "Beverage", "Appetizer"],
    ],
  ] as const)("offers the requested %s choices", (label, choices) => {
    render(<ImportPage />);

    const dropdown = screen.getByRole("combobox", { name: label });
    expect(
      within(dropdown)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(choices);
  });
});

describe("ImportPage actions", () => {
  it("clears all entered recipe fields", () => {
    render(<ImportPage />);
    const textboxes = screen.getAllByRole("textbox") as (
      HTMLInputElement | HTMLTextAreaElement
    )[];
    for (const field of textboxes) {
      fireEvent.change(field, {
        target: {
          value:
            field.type === "url"
              ? "https://example.com/recipe"
              : "Recipe details",
        },
      });
    }
    fireEvent.change(screen.getByLabelText("Meal Type"), {
      target: { value: "Dinner" },
    });
    fireEvent.change(screen.getByLabelText("Course"), {
      target: { value: "Entree" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));

    for (const field of textboxes) expect(field.value).toBe("");
    expect(
      (screen.getByLabelText("Meal Type") as HTMLSelectElement).value,
    ).toBe("");
    expect((screen.getByLabelText("Course") as HTMLSelectElement).value).toBe(
      "",
    );
  });

  it("offers a disconnected Save button", () => {
    render(<ImportPage />);
    const title = screen.getByLabelText(
      "Recipe Title (Required)",
    ) as HTMLInputElement;
    fireEvent.change(title, { target: { value: "Soup" } });
    const save = screen.getByRole("button", { name: "Save" });
    expect(save.getAttribute("type")).toBe("button");
    fireEvent.click(save);
    expect(title.value).toBe("Soup");
  });

  it("spaces the form fields consistently", () => {
    const style = document.createElement("style");
    style.textContent = appStyles;
    document.head.append(style);
    try {
      render(<ImportPage />);
      const form = screen
        .getByLabelText("Recipe Title (Required)")
        .closest("form")!;
      expect(getComputedStyle(form).gap).toBe("24px");
      expect(
        getComputedStyle(screen.getByLabelText("Recipe Title (Required)"))
          .padding,
      ).toBe("12px");
    } finally {
      style.remove();
    }
  });

  it("places Clear on the left of the bottom action row with Save on the right", () => {
    const style = document.createElement("style");
    style.textContent = appStyles;
    document.head.append(style);
    try {
      render(<ImportPage />);
      const clear = screen.getByRole("button", { name: "Clear" });
      const save = screen.getByRole("button", { name: "Save" });
      const actions = clear.parentElement!;
      expect(Array.from(actions.children)).toEqual([clear, save]);
      expect(actions.parentElement?.lastElementChild).toBe(actions);
      expect(getComputedStyle(actions).display).toBe("flex");
      expect(getComputedStyle(actions).justifyContent).toBe("space-between");
    } finally {
      style.remove();
    }
  });
});
