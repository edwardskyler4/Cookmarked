// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import ImportPage from "../../src/ui/routes/ImportPage";

afterEach(cleanup);

describe("ImportPage fields", () => {
  it("keeps each label associated with only its own text box", () => {
    render(<ImportPage />);

    for (const label of [
      "Source",
      "Title",
      "Tags",
      "Prep time",
      "Serving size",
      "Ingredients",
      "Directions",
      "Nutrition (optional)",
      "Notes",
    ]) {
      const field = screen.getByLabelText(label);
      const wrapper = field.closest("label") ?? field.parentElement;
      expect(wrapper?.querySelectorAll("input, textarea")).toHaveLength(1);
    }
  });

  it("adds visible spacing between each field label and its text box", () => {
    render(<ImportPage />);

    const sourceField = screen.getByLabelText("Source");
    expect(sourceField.closest("label")?.getAttribute("style")).toContain(
      "gap: 0.5rem",
    );
  });
});
