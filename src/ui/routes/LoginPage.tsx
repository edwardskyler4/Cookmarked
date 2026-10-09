import { useState, type SubmitEvent } from "react";
import type { AuthService } from "../../services/authService";
import {
  AuthenticationError,
  type AuthUser,
} from "../../domain/models/AuthUser";

const messages: Record<string, string> = {
  invalid_input: "Enter your username and password.",
  invalid_username:
    "Use 3–32 letters, digits, or underscores for your username.",
  weak_password: "Use a password with at least 8 characters.",
  invalid_credentials: "Username or password is incorrect.",
  username_taken: "That username is already registered.",
  rate_limited: "Too many attempts. Please wait before trying again.",
  unavailable: "Unable to sign in right now. Please try again.",
};

export default function LoginPage({
  authService,
  onSignedIn,
}: {
  authService: AuthService;
  onSignedIn: (user: AuthUser) => void;
}) {
  const [register, setRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError(null);
    if (register && password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }
    setPending(true);
    try {
      const user = await authService[register ? "register" : "login"](
        username,
        password,
      );
      setPassword("");
      setConfirmation("");
      onSignedIn(user);
    } catch (failure) {
      setError(
        failure instanceof AuthenticationError
          ? (messages[failure.code] ?? messages.unavailable)
          : messages.unavailable,
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="page-panel auth-panel" aria-labelledby="login-heading">
      <h2 id="login-heading">{register ? "Create account" : "Login"}</h2>
      <form className="auth-form" onSubmit={submit}>
        <fieldset disabled={pending}>
          <label>
            Username
            <input
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete={register ? "new-password" : "current-password"}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {register && (
            <label>
              Confirm password
              <input
                name="confirmation"
                type="password"
                autoComplete="new-password"
                required
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
              />
            </label>
          )}
          {register && (
            <p>
              Use 3–32 letters, digits, or underscores for your username and at
              least 8 characters for your password.
            </p>
          )}
          <button
            className="filter-chip active"
            type="submit"
            disabled={pending}
          >
            {pending ? "Please wait…" : register ? "Register" : "Log in"}
          </button>
        </fieldset>
      </form>
      {error && <p role="alert">{error}</p>}
      <button
        className="filter-chip"
        disabled={pending}
        onClick={() => {
          setRegister(!register);
          setError(null);
          setPassword("");
          setConfirmation("");
        }}
      >
        {register ? "Back to login" : "Create account"}
      </button>
      <p>
        Forgot your password? Contact your Cookmarked administrator for help.
      </p>
    </section>
  );
}
