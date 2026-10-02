// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import { saveUser } from "../../src/services/saveUser";
import type { User } from "../../src/domain/models/User";

vi.mock("../../src/services/saveUser", () => ({ saveUser: vi.fn() }));

// Keep component tests independent of database configuration and connections.
vi.mock("../../src/data/repositories/SupabaseUserRepository", () => ({
  SupabaseUserRepository: class {},
}));

const mockedSaveUser = vi.mocked(saveUser);

function enterName(username = "Evan") {
  fireEvent.change(screen.getByRole("textbox", { name: "Your name" }), {
    target: { value: username },
  });
}

function submitName() {
  fireEvent.click(screen.getByRole("button", { name: "Save name" }));
}

function pendingSave() {
  let resolve!: (user: User) => void;
  const promise = new Promise<User>((resolvePromise) => {
    resolve = resolvePromise;
  });
  mockedSaveUser.mockReturnValueOnce(promise);

  return async () => {
    await act(async () => {
      resolve({ id: 42, username: "Evan" });
      await promise;
    });
  };
}

describe("App", () => {
  beforeEach(() => {
    mockedSaveUser.mockReset();
    mockedSaveUser.mockResolvedValue({ id: 42, username: "Evan" });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the name entry form", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Recipe App" })).toBeDefined();
    expect(screen.getByRole("textbox", { name: "Your name" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Save name" })).toBeDefined();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("does not submit an empty required name", () => {
    render(<App />);

    submitName();

    expect(mockedSaveUser).not.toHaveBeenCalled();
  });

  it("sends the entered name to the service", async () => {
    render(<App />);
    enterName("Ruby");

    submitName();
    await screen.findByText("Hello, Evan!");

    expect(mockedSaveUser).toHaveBeenCalledExactlyOnceWith(
      expect.anything(),
      "Ruby",
    );
  });

  it("disables submission while the save is pending", async () => {
    const finishSave = pendingSave();
    render(<App />);
    enterName();

    submitName();

    const button = screen.getByRole("button", {
      name: "Saving...",
    }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    expect(mockedSaveUser).toHaveBeenCalledTimes(1);
    await finishSave();
  });

  it("greets the user with the name returned by the service", async () => {
    mockedSaveUser.mockResolvedValue({ id: 42, username: "Saved name" });
    render(<App />);
    enterName("Submitted name");

    submitName();

    expect(await screen.findByText("Hello, Saved name!")).toBeDefined();
  });

  it("clears the input after a successful save", async () => {
    render(<App />);
    enterName();

    submitName();
    await screen.findByText("Hello, Evan!");

    const input = screen.getByRole("textbox", {
      name: "Your name",
    }) as HTMLInputElement;
    expect(input.value).toBe("");
  });

  it("enables submission after a successful save", async () => {
    render(<App />);
    enterName();

    submitName();
    await screen.findByText("Hello, Evan!");

    const button = screen.getByRole("button", {
      name: "Save name",
    }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
  });

  it("displays the service error when saving fails", async () => {
    mockedSaveUser.mockRejectedValue(new Error("Permission denied"));
    render(<App />);
    enterName();

    submitName();

    expect((await screen.findByRole("alert")).textContent).toBe(
      "Permission denied",
    );
  });

  it("displays a fallback message for a failure without an Error object", async () => {
    mockedSaveUser.mockRejectedValue("Unknown failure");
    render(<App />);
    enterName();

    submitName();

    expect((await screen.findByRole("alert")).textContent).toBe(
      "Unable to save your name.",
    );
  });

  it("preserves the entered name when saving fails", async () => {
    mockedSaveUser.mockRejectedValue(new Error("Permission denied"));
    render(<App />);
    enterName("Ruby");

    submitName();
    await screen.findByRole("alert");

    const input = screen.getByRole("textbox", {
      name: "Your name",
    }) as HTMLInputElement;
    expect(input.value).toBe("Ruby");
  });

  it("enables submission after a failed save", async () => {
    mockedSaveUser.mockRejectedValue(new Error("Permission denied"));
    render(<App />);
    enterName();

    submitName();
    await screen.findByRole("alert");

    const button = screen.getByRole("button", {
      name: "Save name",
    }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
  });

  it("clears the previous error when retrying a save", async () => {
    mockedSaveUser.mockRejectedValueOnce(new Error("Permission denied"));
    render(<App />);
    enterName();
    submitName();
    await screen.findByRole("alert");
    const finishSave = pendingSave();

    submitName();

    expect(screen.queryByRole("alert")).toBeNull();
    await finishSave();
  });
});
