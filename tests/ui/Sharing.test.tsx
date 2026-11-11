// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import { AuthenticationError } from "../../src/domain/models/AuthUser";
import { fakeAuthService, signedInUser } from "../fakes/authService";
import { fakeRecipeService } from "../fakes/recipeService";

const sourceUrl =
  "https://www.instagram.com/p/recipe/?a=1&b=two%20words#details";
const sharedLink = { url: sourceUrl, text: "A recipe to try" };

function setIncomingShare(parameters: Record<string, string> = sharedLink) {
  window.history.replaceState(
    null,
    "",
    `/share-target?${new URLSearchParams(parameters)}`,
  );
}

beforeEach(() => setIncomingShare());
afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

function renderApp(
  authService = fakeAuthService().service,
  recipeService = fakeRecipeService(),
) {
  return render(
    <App authService={authService} recipeService={recipeService} />,
  );
}

function enterCredentials() {
  fireEvent.change(screen.getByLabelText("Username"), {
    target: { value: "kyler" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "Password123!" },
  });
}

async function expectHomeSelected() {
  const home = await screen.findByRole("button", { name: "Home" });
  expect(home.getAttribute("aria-current")).toBe("page");
  expect(screen.queryByRole("heading", { name: "Add" })).toBeNull();
}

async function openAdd() {
  fireEvent.click(await screen.findByRole("button", { name: "Add" }));
  await screen.findByRole("heading", { name: "Add" });
}

function returnToAdd() {
  fireEvent.click(screen.getByRole("button", { name: "Home" }));
  fireEvent.click(screen.getByRole("button", { name: "Add" }));
}

function expectEmptySource() {
  expect((screen.getByLabelText("Source URL") as HTMLInputElement).value).toBe(
    "",
  );
}

describe("shared links stay separate from manual entry", () => {
  it("keeps Home selected when a signed-in user receives a share", async () => {
    renderApp();

    await expectHomeSelected();
  });

  it("leaves Source URL empty when the user opens Add after a share", async () => {
    renderApp();

    await openAdd();

    expectEmptySource();
  });

  it("does not send incoming shares to the manual recipe service", async () => {
    const recipeService = fakeRecipeService();
    renderApp(fakeAuthService().service, recipeService);
    await screen.findByRole("button", { name: "Home" });

    expect(recipeService.create).not.toHaveBeenCalled();
    expect(screen.queryByText("Recipe saved")).toBeNull();
  });

  it("keeps the incoming query after login", async () => {
    const incomingAddress = window.location.href;
    renderApp(fakeAuthService(null).service);
    await screen.findByRole("heading", { name: "Login" });
    expect(screen.queryByRole("heading", { name: "Add" })).toBeNull();

    enterCredentials();
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));

    await expectHomeSelected();
    expect(window.location.href).toBe(incomingAddress);
  });

  it("keeps the incoming query after a failed login attempt", async () => {
    const incomingAddress = window.location.href;
    const { service } = fakeAuthService(null);
    service.login = vi
      .fn()
      .mockRejectedValueOnce(new AuthenticationError("invalid_credentials"))
      .mockResolvedValueOnce(signedInUser);
    renderApp(service);
    await screen.findByRole("heading", { name: "Login" });
    enterCredentials();
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));
    await screen.findByRole("alert");
    expect(window.location.href).toBe(incomingAddress);

    fireEvent.click(screen.getByRole("button", { name: "Log in" }));

    await expectHomeSelected();
    expect(window.location.href).toBe(incomingAddress);
  });

  it("keeps the incoming query after registration", async () => {
    const incomingAddress = window.location.href;
    renderApp(fakeAuthService(null).service);
    await screen.findByRole("heading", { name: "Login" });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    enterCredentials();
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "Password123!" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Register" }));

    await expectHomeSelected();
    expect(window.location.href).toBe(incomingAddress);
  });

  it("keeps the incoming query after reloading during login", async () => {
    setIncomingShare({ text: `Try this recipe: ${sourceUrl}` });
    const originalAddress = window.location.href;
    const initial = renderApp(fakeAuthService(null).service);
    await screen.findByRole("heading", { name: "Login" });
    initial.unmount();

    renderApp(fakeAuthService(null).service);
    await screen.findByRole("heading", { name: "Login" });
    enterCredentials();
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));

    await expectHomeSelected();
    expect(window.location.href).toBe(originalAddress);
  });

  it("keeps the incoming query through a session restoration retry", async () => {
    const incomingAddress = window.location.href;
    const { service } = fakeAuthService();
    service.restore = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(signedInUser);
    renderApp(service);
    await screen.findByRole("alert");
    expect(screen.queryByRole("heading", { name: "Add" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await expectHomeSelected();
    expect(window.location.href).toBe(incomingAddress);
  });

  it("keeps shared text out of the manually opened Add form", async () => {
    setIncomingShare({
      text: `${sourceUrl}\nhttps://www.facebook.com/example/posts/123/`,
    });
    renderApp();

    await openAdd();

    expect(screen.queryByLabelText("Shared text")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    expectEmptySource();
  });

  it("keeps empty-share instructions out of the manually opened Add form", async () => {
    setIncomingShare({});
    renderApp();

    await openAdd();

    expect(screen.queryByRole("alert")).toBeNull();
    expectEmptySource();
  });

  it("keeps Source URL empty when returning to Add after Clear", async () => {
    renderApp();
    await openAdd();
    fireEvent.change(screen.getByLabelText("Source URL"), {
      target: { value: "https://example.com/manual-recipe" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expectEmptySource();

    returnToAdd();

    expectEmptySource();
  });

  it("keeps Source URL empty when returning to Add after a manual save", async () => {
    const recipeService = fakeRecipeService();
    renderApp(fakeAuthService().service, recipeService);
    await openAdd();
    fireEvent.change(screen.getByLabelText("Source URL"), {
      target: { value: "https://example.com/manual-recipe" },
    });
    for (const label of [
      "Recipe Title",
      "Prep Time",
      "Ingredients",
      "Directions",
    ]) {
      fireEvent.change(screen.getByLabelText(`${label} (Required)`), {
        target: { value: "Recipe details" },
      });
    }
    fireEvent.change(screen.getByLabelText("Serving Size (Required)"), {
      target: { value: "4" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByText("Recipe saved");
    expect(recipeService.create).toHaveBeenCalledWith(
      expect.objectContaining({ url: "https://example.com/manual-recipe" }),
    );
    expectEmptySource();

    returnToAdd();

    expectEmptySource();
  });
});
