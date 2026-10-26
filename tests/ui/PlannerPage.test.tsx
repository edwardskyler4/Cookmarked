// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import PlannerPage from "../../src/ui/routes/PlannerPage";

afterEach(cleanup);

describe("PlannerPage", () => {
  it("starts with a removable sample recipe for testing", async () => {
    render(<PlannerPage />);

    const monday = await screen.findByRole("heading", { name: /Monday/ });
    expect(monday).toBeDefined();

    const addButtons = screen.getAllByRole("button", { name: "Add Recipe" });
    addButtons[0].click();

    expect(screen.getByRole("option", { name: "Test Recipe" })).toBeDefined();
  });

  it("explains that recipe deletion is not connected to saved recipes", () => {
    render(<PlannerPage />);

    const deleteButtons = screen.getAllByRole("button", { name: "Delete Recipe" });
    expect(deleteButtons.length).toBeGreaterThan(0);
    expect(screen.getByText(/not connected to saved recipes/i)).toBeDefined();
  });
});
