// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

const appStyles = readFileSync("src/App.css", "utf8");
import { fakeRecipeService } from "../fakes/recipeService";
import { RecipeSaveError } from "../../src/domain/repositories/RecipeApiRepository";
import ImportPage from "../../src/ui/routes/ImportPage";

afterEach(cleanup);

describe("ImportPage fields", () => {
  it("keeps each label associated with only its own text box", () => {
    render(<ImportPage recipeService={fakeRecipeService()} />);

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
    render(<ImportPage recipeService={fakeRecipeService()} />);

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
    render(<ImportPage recipeService={fakeRecipeService()} />);
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
      render(<ImportPage recipeService={fakeRecipeService()} />);
      const field = screen.getByLabelText(label) as
        HTMLInputElement | HTMLTextAreaElement;

      expect(field.required).toBe(false);
      expect(field.checkValidity()).toBe(true);
      expect(screen.queryByText(/optional/i)).toBeNull();
    },
  );

  it.each(["Meal Type", "Course"])("allows an empty %s selection", (label) => {
    render(<ImportPage recipeService={fakeRecipeService()} />);
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
    render(<ImportPage recipeService={fakeRecipeService()} />);

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
    render(<ImportPage recipeService={fakeRecipeService()} />);

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
    render(<ImportPage recipeService={fakeRecipeService()} />);
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

  it("keeps inputs when required fields are missing", () => {
    render(<ImportPage recipeService={fakeRecipeService()} />);
    const title = screen.getByLabelText(
      "Recipe Title (Required)",
    ) as HTMLInputElement;
    fireEvent.change(title, { target: { value: "Soup" } });
    const save = screen.getByRole("button", { name: "Save" });
    expect(save.getAttribute("type")).toBe("submit");
    fireEvent.click(save);
    expect(title.value).toBe("Soup");
  });

  it("spaces the form fields consistently", () => {
    const style = document.createElement("style");
    style.textContent = appStyles;
    document.head.append(style);
    try {
      render(<ImportPage recipeService={fakeRecipeService()} />);
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
      render(<ImportPage recipeService={fakeRecipeService()} />);
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

const requiredFields = [
  "Recipe Title",
  "Prep Time",
  "Serving Size",
  "Ingredients",
  "Directions",
];

function fillRequiredFields() {
  for (const label of requiredFields) {
    fireEvent.change(screen.getByLabelText(`${label} (Required)`), {
      target: { value: label === "Serving Size" ? "4" : "Recipe details" },
    });
  }
}

describe("ImportPage validation", () => {
  it("explains why an empty recipe cannot be saved", () => {
    render(<ImportPage recipeService={fakeRecipeService()} />);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByRole("alert").textContent).toContain(
      "Cannot save recipe. Fix the highlighted fields below.",
    );
    expect(document.activeElement).toBe(
      screen.getByLabelText("Recipe Title (Required)"),
    );
  });

  it.each(requiredFields)("identifies an empty %s field", (label) => {
    render(<ImportPage recipeService={fakeRecipeService()} />);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    const field = screen.getByLabelText(`${label} (Required)`);
    expect(field.getAttribute("aria-invalid")).toBe("true");
    const error = document.getElementById(
      field.getAttribute("aria-describedby")!,
    );
    expect(error?.textContent).toBe(`${label} is required.`);
  });

  it("treats whitespace-only required fields as empty", () => {
    render(<ImportPage recipeService={fakeRecipeService()} />);
    fillRequiredFields();
    fireEvent.change(screen.getByLabelText("Ingredients (Required)"), {
      target: { value: " \n " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByText("Ingredients is required.")).toBeDefined();
    expect(screen.queryByText("Recipe Title is required.")).toBeNull();
  });

  it("clears a saved recipe and confirms success", async () => {
    render(<ImportPage recipeService={fakeRecipeService()} />);
    fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.queryByRole("alert")).toBeNull();
    expect((await screen.findByRole("status")).textContent).toBe(
      "Recipe saved",
    );
    expect(
      (screen.getByLabelText("Recipe Title (Required)") as HTMLInputElement)
        .value,
    ).toBe("");
  });

  it("removes previous errors after correcting the form and retrying Save", async () => {
    render(<ImportPage recipeService={fakeRecipeService()} />);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("alert")).toBeDefined();
    fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await screen.findByText("Recipe saved");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByText("Recipe Title is required.")).toBeNull();
    expect(
      screen
        .getByLabelText("Recipe Title (Required)")
        .getAttribute("aria-invalid"),
    ).not.toBe("true");
  });

  it("clears validation feedback when Clear is pressed", () => {
    render(<ImportPage recipeService={fakeRecipeService()} />);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("alert")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));

    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByText("Recipe Title is required.")).toBeNull();
    expect(
      screen
        .getByLabelText("Recipe Title (Required)")
        .getAttribute("aria-invalid"),
    ).not.toBe("true");
  });

  it("explains a Source URL without a domain suffix", () => {
    render(<ImportPage recipeService={fakeRecipeService()} />);
    fillRequiredFields();
    fireEvent.change(screen.getByLabelText("Source URL"), {
      target: { value: "not-a-url" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByRole("alert")).toBeDefined();
    expect(
      screen.getByText(
        "Source URL must include a valid domain (such as example.com) or be empty.",
      ),
    ).toBeDefined();
  });
});

it("gives invalid recipe fields a stronger visible border", () => {
  const style = document.createElement("style");
  style.textContent = appStyles;
  document.head.append(style);
  try {
    render(<ImportPage recipeService={fakeRecipeService()} />);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    const field = screen.getByLabelText("Recipe Title (Required)");
    expect(getComputedStyle(field).borderWidth).toBe("2px");
    expect(getComputedStyle(screen.getByRole("alert")).borderLeftStyle).toBe(
      "solid",
    );
  } finally {
    style.remove();
  }
});

describe("recipe saving", () => {
  it.each([
    ["light", "rgb(21, 128, 61)", "rgb(240, 253, 244)"],
    ["dark", "rgb(134, 239, 172)", "rgb(20, 83, 45)"],
  ])(
    "shows green success feedback in %s mode",
    async (theme, color, background) => {
      const style = document.createElement("style");
      style.textContent = appStyles;
      document.head.append(style);
      try {
        render(
          <div
            className={
              theme === "dark" ? "page-shell dark-theme" : "page-shell"
            }
          >
            <ImportPage recipeService={fakeRecipeService()} />
          </div>,
        );
        fillRequiredFields();
        fireEvent.click(screen.getByRole("button", { name: "Save" }));

        const message = await screen.findByRole("status");
        expect(getComputedStyle(message).color).toBe(color);
        expect(getComputedStyle(message).backgroundColor).toBe(background);
        expect(getComputedStyle(message).borderTopColor).toBe(color);
      } finally {
        style.remove();
      }
    },
  );

  it("moves focus to the success message after saving", async () => {
    render(<ImportPage recipeService={fakeRecipeService()} />);
    fillRequiredFields();
    const save = screen.getByRole("button", { name: "Save" });
    save.focus();

    fireEvent.click(save);

    const message = await screen.findByRole("status");
    expect(message.textContent).toBe("Recipe saved");
    expect(document.activeElement).toBe(message);
  });

  it("submits all form values through the injected service", async () => {
    const service = fakeRecipeService();
    render(<ImportPage recipeService={service} />);
    fillRequiredFields();
    fireEvent.change(screen.getByLabelText("Source URL"), {
      target: { value: "https://example.com/soup" },
    });
    fireEvent.change(screen.getByLabelText("Notes"), {
      target: { value: "Family favorite" },
    });
    fireEvent.change(screen.getByLabelText("Nutritional Information"), {
      target: { value: "100 kcal" },
    });
    fireEvent.change(screen.getByLabelText("Meal Type"), {
      target: { value: "Dinner" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByText("Recipe saved");
    expect(service.create).toHaveBeenCalledWith({
      title: "Recipe details",
      prepTime: "Recipe details",
      servings: 4,
      ingredients: "Recipe details",
      instructions: "Recipe details",
      mealType: "Dinner",
      course: "",
      url: "https://example.com/soup",
      note: "Family favorite",
      nutritionInfo: "100 kcal",
    });
    for (const field of screen.getAllByRole("textbox") as HTMLInputElement[])
      expect(field.value).toBe("");
    expect(
      (screen.getByLabelText("Meal Type") as HTMLSelectElement).value,
    ).toBe("");
  });
  it("adds HTTPS before submitting a source URL without a scheme", async () => {
    const service = fakeRecipeService();
    render(<ImportPage recipeService={service} />);
    fillRequiredFields();
    fireEvent.change(screen.getByLabelText("Source URL"), {
      target: { value: "example.com/soup" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByText("Recipe saved");

    expect(service.create).toHaveBeenCalledWith(
      expect.objectContaining({ url: "https://example.com/soup" }),
    );
  });
  it.each([
    ["http://example.com/soup", "http://example.com/soup"],
    ["https:/example.com/soup", "https://example.com/soup"],
  ])("corrects source URL scheme %s", async (url, expected) => {
    const service = fakeRecipeService();
    render(<ImportPage recipeService={service} />);
    fillRequiredFields();
    fireEvent.change(screen.getByLabelText("Source URL"), {
      target: { value: url },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByText("Recipe saved");

    expect(service.create).toHaveBeenCalledWith(
      expect.objectContaining({ url: expected }),
    );
  });
  it.each([
    "not-a-url",
    "https://",
    "https:///example.com",
    "https://localhost/recipe",
    "https://example.",
  ])("rejects source URL %s before calling the service", (url) => {
    const service = fakeRecipeService();
    render(<ImportPage recipeService={service} />);
    fillRequiredFields();
    fireEvent.change(screen.getByLabelText("Source URL"), {
      target: { value: url },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(
      screen.getByText(
        "Source URL must include a valid domain (such as example.com) or be empty.",
      ),
    ).toBeDefined();
    expect(service.create).not.toHaveBeenCalled();
  });
  it.each(["1.5", "4 servings", "1e2", "2147483648"])(
    "rejects invalid serving size %s",
    (value) => {
      const service = fakeRecipeService();
      render(<ImportPage recipeService={service} />);
      fillRequiredFields();
      fireEvent.change(screen.getByLabelText("Serving Size (Required)"), {
        target: { value },
      });
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
      expect(
        screen.getByText(
          "Serving Size must be an integer between -2147483648 and 2147483647.",
        ),
      ).toBeDefined();
      expect(service.create).not.toHaveBeenCalled();
    },
  );
  it("prevents repeated submissions while saving", async () => {
    let finish!: (value: { recipeId: number }) => void;
    const service = {
      create: vi.fn(
        () =>
          new Promise<{ recipeId: number }>((resolve) => {
            finish = resolve;
          }),
      ),
    };
    render(<ImportPage recipeService={service} />);
    fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    const saving = screen.getByRole("button", {
      name: "Saving…",
    }) as HTMLButtonElement;
    expect(saving.disabled).toBe(true);
    expect(
      (screen.getByRole("button", { name: "Clear" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    fireEvent.click(saving);
    expect(service.create).toHaveBeenCalledTimes(1);
    finish({ recipeId: 7 });
    await screen.findByText("Recipe saved");
  });
  it("preserves inputs after a save failure", async () => {
    const service = fakeRecipeService();
    service.create.mockRejectedValue(new Error("private details"));
    render(<ImportPage recipeService={service} />);
    fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Unable to save recipe. Please try again.",
    );
    expect(
      (screen.getByLabelText("Recipe Title (Required)") as HTMLInputElement)
        .value,
    ).toBe("Recipe details");
    expect(
      (screen.getByRole("button", { name: "Save" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });
  it("shows the domain message when backend URL validation rejects a save", async () => {
    const service = fakeRecipeService();
    service.create.mockRejectedValue(
      new RecipeSaveError("invalid_input", "url"),
    );
    render(<ImportPage recipeService={service} />);
    fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(
      await screen.findByText(
        "Source URL must include a valid domain (such as example.com) or be empty.",
      ),
    ).toBeDefined();
  });
});
