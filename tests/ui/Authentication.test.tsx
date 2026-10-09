// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import { AuthenticationError } from "../../src/domain/models/AuthUser";
import { fakeAuthService, signedInUser } from "../fakes/authService";
afterEach(cleanup);
function fillCredentials() {
  fireEvent.change(screen.getByLabelText("Username"), {
    target: { value: "Kyler" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "password123" },
  });
}
describe("authentication UI", () => {
  it("hides the library while restoring a session", () => {
    const { service } = fakeAuthService();
    service.restore = () => new Promise(() => {});
    render(<App authService={service} />);
    expect(screen.getByRole("status").textContent).toContain("Checking");
    expect(screen.queryByRole("searchbox")).toBeNull();
  });
  it("sends signed-out users to login with no app navigation", async () => {
    render(<App authService={fakeAuthService(null).service} />);
    await screen.findByRole("heading", { name: "Login" });
    expect(screen.queryByRole("navigation")).toBeNull();
    expect(screen.queryByRole("searchbox")).toBeNull();
    expect(screen.getByText(/administrator/i)).toBeDefined();
  });
  it("opens the library after login", async () => {
    const { service } = fakeAuthService(null);
    render(<App authService={service} />);
    await screen.findByRole("heading", { name: "Login" });
    fillCredentials();
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));
    await screen.findByRole("searchbox");
    expect(service.login).toHaveBeenCalledWith("Kyler", "password123");
    expect(screen.getByText("kyler")).toBeDefined();
  });
  it("signs in immediately after registration", async () => {
    const { service } = fakeAuthService(null);
    render(<App authService={service} />);
    await screen.findByRole("heading", { name: "Login" });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    fillCredentials();
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Register" }));
    await screen.findByRole("searchbox");
    expect(service.register).toHaveBeenCalledWith("Kyler", "password123");
  });
  it("rejects a mismatched password confirmation", async () => {
    const { service } = fakeAuthService(null);
    render(<App authService={service} />);
    await screen.findByRole("heading", { name: "Login" });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    fillCredentials();
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "different" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Register" }));
    expect(screen.getByRole("alert").textContent).toContain(
      "Passwords do not match",
    );
    expect(service.register).not.toHaveBeenCalled();
  });
  it("shows invalid credentials without exposing provider details", async () => {
    const { service } = fakeAuthService(null);
    service.login = vi
      .fn()
      .mockRejectedValue(new AuthenticationError("invalid_credentials"));
    render(<App authService={service} />);
    await screen.findByRole("heading", { name: "Login" });
    fillCredentials();
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Username or password is incorrect.",
    );
    expect(screen.queryByRole("searchbox")).toBeNull();
  });
  it("disables submission while login is pending", async () => {
    const { service } = fakeAuthService(null);
    service.login = () => new Promise(() => {});
    render(<App authService={service} />);
    await screen.findByRole("heading", { name: "Login" });
    fillCredentials();
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect(
      screen
        .getByRole("button", { name: "Please wait…" })
        .hasAttribute("disabled"),
    ).toBe(true);
  });
  it.each(["Home", "Planner", "Import", "Settings"])(
    "returns from %s to login when the session ends",
    async (page) => {
      const { service, emit } = fakeAuthService();
      render(<App authService={service} />);
      await screen.findByRole("searchbox");
      fireEvent.click(screen.getByRole("button", { name: page }));
      const { act } = await import("@testing-library/react");
      act(() => emit(null));
      await screen.findByRole("heading", { name: "Login" });
      expect(screen.queryByRole("navigation")).toBeNull();
    },
  );
  it("returns to login after logout", async () => {
    const { service } = fakeAuthService();
    render(<App authService={service} />);
    await screen.findByRole("searchbox");
    fireEvent.click(screen.getByRole("button", { name: "Log out" }));
    await screen.findByRole("heading", { name: "Login" });
    expect(service.logout).toHaveBeenCalled();
  });
  it("shows a restoration failure with retry", async () => {
    const { service } = fakeAuthService();
    service.restore = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(signedInUser);
    render(<App authService={service} />);
    await screen.findByRole("alert");
    expect(screen.queryByRole("searchbox")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByRole("searchbox");
  });
  it("ignores a stale restoration after session loss", async () => {
    const { service, emit } = fakeAuthService();
    let finish!: (user: typeof signedInUser) => void;
    service.restore = () =>
      new Promise((resolve) => {
        finish = resolve;
      });
    render(<App authService={service} />);
    const { act } = await import("@testing-library/react");
    act(() => emit(null));
    await screen.findByRole("heading", { name: "Login" });
    await act(async () => finish(signedInUser));
    expect(screen.queryByRole("searchbox")).toBeNull();
  });
  it("reports logout failure", async () => {
    const { service } = fakeAuthService();
    service.logout = vi.fn().mockRejectedValue(new Error("offline"));
    render(<App authService={service} />);
    await screen.findByRole("searchbox");
    fireEvent.click(screen.getByRole("button", { name: "Log out" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Unable to log out",
    );
  });
});
