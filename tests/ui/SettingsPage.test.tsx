// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthenticationError } from "../../src/domain/models/AuthUser";
import SettingsPage from "../../src/ui/routes/SettingsPage";

afterEach(cleanup);

describe("SettingsPage", () => {
  it("shows the username as read-only and lets the user edit the display name", () => {
    render(
      <SettingsPage
        username="kyler"
        displayName="Kyler"
        darkMode={false}
        onSaveDarkMode={vi.fn()}
        onSaveDisplayName={vi.fn()}
      />,
    );

    expect(screen.getByText("kyler")).toBeDefined();
    expect(screen.getByText(/permanent sign-in username/i)).toBeDefined();
    expect(screen.queryByRole("button", { name: "Edit username" })).toBeNull();

    fireEvent.click(
      screen.getByRole("button", { name: "What should we call you?" }),
    );

    expect(screen.getByRole("textbox", { name: "Display name" })).toBeDefined();
  });

  it("saves the display name through the provided callback", async () => {
    const onSaveDisplayName = vi.fn().mockResolvedValue(undefined);
    render(
      <SettingsPage
        username="kyler"
        displayName="Kyler"
        darkMode={false}
        onSaveDarkMode={vi.fn()}
        onSaveDisplayName={onSaveDisplayName}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "What should we call you?" }),
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Display name" }), {
      target: { value: "  Chef Kyler  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save display name" }));

    await waitFor(() =>
      expect(onSaveDisplayName).toHaveBeenCalledWith("  Chef Kyler  "),
    );
    expect(screen.getByText("Chef Kyler")).toBeDefined();
  });

  it("saves the new password through the provided callback", async () => {
    const onSavePassword = vi.fn().mockResolvedValue(undefined);
    render(
      <SettingsPage
        username="kyler"
        displayName="Kyler"
        darkMode={false}
        onSaveDarkMode={vi.fn()}
        onSaveDisplayName={vi.fn()}
        onSavePassword={onSavePassword}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Change password" }));
    fireEvent.change(screen.getByPlaceholderText("Enter a new password"), {
      target: { value: "NewPassword123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save password" }));

    await waitFor(() =>
      expect(onSavePassword).toHaveBeenCalledWith("NewPassword123!"),
    );
  });

  it("shows password requirements without calling the save callback", async () => {
    const onSavePassword = vi.fn().mockResolvedValue(undefined);
    render(
      <SettingsPage
        username="kyler"
        displayName="Kyler"
        darkMode={false}
        onSaveDarkMode={vi.fn()}
        onSaveDisplayName={vi.fn()}
        onSavePassword={onSavePassword}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Change password" }));
    fireEvent.change(screen.getByPlaceholderText("Enter a new password"), {
      target: { value: "weak" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save password" }));

    expect(
      await screen.findByText(
        "Use at least 8 characters with an uppercase letter, a lowercase letter, a number, and one of !@#$%^&*.",
      ),
    ).toBeDefined();
    expect(onSavePassword).not.toHaveBeenCalled();
  });

  it("maps a backend weak-password code to the password requirements", async () => {
    const onSavePassword = vi
      .fn()
      .mockRejectedValue(new AuthenticationError("weak_password"));
    render(
      <SettingsPage
        username="kyler"
        displayName="Kyler"
        darkMode={false}
        onSaveDarkMode={vi.fn()}
        onSaveDisplayName={vi.fn()}
        onSavePassword={onSavePassword}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Change password" }));
    fireEvent.change(screen.getByPlaceholderText("Enter a new password"), {
      target: { value: "StrongPassword1!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save password" }));

    expect(
      await screen.findByText(
        "Use at least 8 characters with an uppercase letter, a lowercase letter, a number, and one of !@#$%^&*.",
      ),
    ).toBeDefined();
  });
});
