import { useState } from "react";

const fieldStyle = { display: "grid", gap: "0.5rem" } as const;

export default function SettingsPage({
  username: currentUsername,
  darkMode,
  onSaveDarkMode,
}: {
  username: string;
  darkMode: boolean;
  onSaveDarkMode: (darkMode: boolean) => void;
}) {
  const [username, setUsername] = useState(currentUsername);
  const [usernameDraft, setUsernameDraft] = useState(currentUsername);
  const [passwordDraft, setPasswordDraft] = useState("");
  const [editingUsername, setEditingUsername] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [darkModeDraft, setDarkModeDraft] = useState(darkMode);
  const hasUnsavedChanges =
    darkModeDraft !== darkMode ||
    (editingUsername && usernameDraft.trim() !== username) ||
    (editingPassword && passwordDraft.length > 0);

  const panelStyle = {
    display: "grid",
    gap: "24px",
    background: darkModeDraft ? "#202a25" : "#fff",
    color: darkModeDraft ? "#f7f5ed" : "#1e1e1e",
  } as const;

  const inputStyle = {
    width: "100%",
    border: "1px solid #aaa",
    borderRadius: "10px",
    padding: "12px",
    background: darkModeDraft ? "#303b35" : "#fff",
    color: darkModeDraft ? "#f7f5ed" : "#1e1e1e",
  } as const;

  return (
    <section
      className="page-panel"
      aria-labelledby="settings-heading"
      style={panelStyle}
    >
      <div>
        <p className="eyebrow">Your account</p>
        <h2 id="settings-heading">Settings</h2>
      </div>

      <div style={{ display: "grid", gap: "20px" }}>
        <section aria-labelledby="username-heading" style={fieldStyle}>
          <h3 id="username-heading" style={{ margin: 0 }}>
            Username
          </h3>
          {editingUsername ? (
            <>
              <label style={fieldStyle}>
                <span className="sr-only">Edit username</span>
                <input
                  autoComplete="username"
                  value={usernameDraft}
                  onChange={(event) => setUsernameDraft(event.target.value)}
                  placeholder="Enter a username"
                  style={inputStyle}
                />
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  className="filter-chip active"
                  type="button"
                  onClick={() => {
                    setUsername(usernameDraft.trim());
                    setEditingUsername(false);
                  }}
                >
                  Save username
                </button>
                <button
                  className="filter-chip"
                  type="button"
                  onClick={() => setEditingUsername(false)}
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <p style={{ margin: 0 }}>{username || "Username not set"}</p>
              <button
                className="filter-chip"
                type="button"
                onClick={() => {
                  setUsernameDraft(username);
                  setEditingUsername(true);
                }}
              >
                Edit username
              </button>
            </div>
          )}
        </section>

        <section aria-labelledby="password-heading" style={fieldStyle}>
          <h3 id="password-heading" style={{ margin: 0 }}>
            Password
          </h3>
          {editingPassword ? (
            <>
              <label style={fieldStyle}>
                <span className="sr-only">New password</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={passwordDraft}
                  onChange={(event) => setPasswordDraft(event.target.value)}
                  placeholder="Enter a new password"
                  style={inputStyle}
                />
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  className="filter-chip active"
                  type="button"
                  onClick={() => {
                    setPasswordDraft("");
                    setEditingPassword(false);
                  }}
                >
                  Save password
                </button>
                <button
                  className="filter-chip"
                  type="button"
                  onClick={() => {
                    setPasswordDraft("");
                    setEditingPassword(false);
                  }}
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <p style={{ margin: 0 }} aria-label="Current password cannot be viewed">
                Password is hidden for security
              </p>
              <button
                className="filter-chip"
                type="button"
                onClick={() => setEditingPassword(true)}
              >
                Change password
              </button>
            </div>
          )}
        </section>

        <section aria-labelledby="appearance-heading" style={fieldStyle}>
          <h3 id="appearance-heading" style={{ margin: 0 }}>
            Appearance
          </h3>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              border: "1px solid #aaa",
              borderRadius: "12px",
              padding: "14px",
            }}
          >
            <span>{darkModeDraft ? "Dark mode" : "Light mode"}</span>
            <input
              type="checkbox"
              role="switch"
              checked={darkModeDraft}
              onChange={(event) => setDarkModeDraft(event.target.checked)}
              aria-label="Dark mode"
            />
          </label>
        </section>

        <button
          className="filter-chip active save-settings-button"
          type="button"
          disabled={!hasUnsavedChanges}
          onClick={() => onSaveDarkMode(darkModeDraft)}
        >
          Save
        </button>
      </div>

      <button
        className="filter-chip"
        type="button"
        aria-label="Log out"
        style={{
          width: "100%",
          borderColor: "#9c3d32",
          padding: "16px",
          color: "#9c3d32",
          fontSize: "1rem",
          fontWeight: 700,
        }}
      >
        Log out
      </button>
    </section>
  );
}

