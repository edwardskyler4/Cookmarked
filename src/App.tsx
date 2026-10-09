import { useEffect, useState } from "react";
import PlannerPage from "./ui/routes/PlannerPage";
import ImportPage from "./ui/routes/ImportPage";
import SettingsPage from "./ui/routes/SettingsPage";
import LoginPage from "./ui/routes/LoginPage";
import "./App.css";
import type { AuthService } from "./services/authService";
import type { AuthUser } from "./domain/models/AuthUser";

const filters = ["All recipes", "Breakfast", "Dinner", "Dessert"];
const recipes = ["Recipe Name", "Recipe Name", "Recipe Name", "Recipe Name"];
const pageLabels = {
  home: "Home / Library",
  planner: "Planner",
  import: "Import",
  settings: "Settings",
};
type Page = keyof typeof pageLabels;
const navigation = [
  ["home", "Home"],
  ["planner", "Planner"],
  ["import", "Import"],
  ["settings", "Settings"],
] as const;

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="search-icon">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  );
}

function NavigationIcon({ type }: { type: Page }) {
  if (type === "home")
    return (
      <span aria-hidden="true" className="nav-symbol">
        ⌂
      </span>
    );
  if (type === "planner")
    return (
      <span aria-hidden="true" className="nav-symbol">
        □
      </span>
    );
  if (type === "import")
    return (
      <span aria-hidden="true" className="nav-symbol">
        ↓
      </span>
    );
  return (
    <span aria-hidden="true" className="nav-symbol">
      ⚙
    </span>
  );
}

function SignedInApp({
  user,
  onLogout,
  pending,
}: {
  user: AuthUser;
  onLogout: () => void;
  pending: boolean;
}) {
  const [page, setPage] = useState<Page>("home");

  return (
    <main className="page-shell">
      <section className="app-shell" aria-label={`Cookmarked ${page}`}>
        <header className="app-header">
          <div className="header-brand">
            <img src="/logo.jpg" className="logo" alt="" />
            <h1>Cookmarked</h1>
          </div>
          <div className="header-actions">
            <p className="location-label">{pageLabels[page]}</p>
            <span>{user.username}</span>
            <button
              className="filter-chip"
              onClick={onLogout}
              disabled={pending}
            >
              {pending ? "Logging out…" : "Log out"}
            </button>
          </div>
        </header>
        <div className="content-area">
          {page === "home" && (
            <>
              <div className="search-row">
                <label className="search-bar">
                  <SearchIcon />
                  <span className="sr-only">Search recipes</span>
                  <input type="search" placeholder="Search recipes" />
                </label>
              </div>
              <div className="filter-row" aria-label="Recipe filters">
                {filters.map((filter, index) => (
                  <button
                    className={
                      index === 0 ? "filter-chip active" : "filter-chip"
                    }
                    key={filter}
                  >
                    {filter}
                  </button>
                ))}
              </div>
              <div className="recipe-list" aria-label="Recipe list">
                {recipes.map((recipe, index) => (
                  <article className="recipe-card" key={`${recipe}-${index}`}>
                    <div
                      className="recipe-image-placeholder"
                      aria-hidden="true"
                    >
                      {index === 0 && <img src="/logo.jpg" alt="" />}
                    </div>
                    <div className="recipe-card-content">
                      <p className="recipe-kicker">
                        {index === 0 ? "Featured recipe" : "Saved recipe"}
                      </p>
                      <h2>{recipe}</h2>
                      <p className="recipe-meta">Prep time · 30 min</p>
                    </div>
                    <button
                      className="more-button"
                      aria-label={`More options for ${recipe}`}
                    >
                      ···
                    </button>
                  </article>
                ))}
              </div>
            </>
          )}
          {page === "planner" && <PlannerPage />}
          {page === "import" && <ImportPage />}
          {page === "settings" && <SettingsPage />}
        </div>
        <nav className="bottom-nav" aria-label="Main navigation">
          {navigation.map(([type, label]) => (
            <button
              className={page === type ? "nav-item active" : "nav-item"}
              aria-current={page === type ? "page" : undefined}
              onClick={() => setPage(type)}
              key={label}
            >
              <NavigationIcon type={type} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </section>
    </main>
  );
}

export default function App({ authService }: { authService: AuthService }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let active = true;
    let sessionChanged = false;
    setLoading(true);
    setError(null);
    const unsubscribe = authService.subscribe((next) => {
      if (!active) return;
      sessionChanged = true;
      setUser(next);
      setLoading(false);
      setError(null);
    });
    authService
      .restore()
      .then((next) => {
        if (active && !sessionChanged) {
          setUser(next);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active && !sessionChanged) {
          setUser(null);
          setLoading(false);
          setError("Unable to check your session. Please try again.");
        }
      });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [authService, attempt]);

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    setError(null);
    try {
      await authService.logout();
      setUser(null);
    } catch {
      setError("Unable to log out. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  }

  if (!loading && user)
    return (
      <>
        {error && (
          <p role="alert" className="auth-notice">
            {error}
          </p>
        )}
        <SignedInApp
          key={user.id}
          user={user}
          onLogout={logout}
          pending={loggingOut}
        />
      </>
    );

  return (
    <main className="page-shell">
      <section className="app-shell" aria-label="Cookmarked login">
        <header className="app-header">
          <div className="header-brand">
            <img src="/logo.jpg" className="logo" alt="" />
            <h1>Cookmarked</h1>
          </div>
        </header>
        <div className="content-area">
          {loading ? (
            <p role="status">Checking your session…</p>
          ) : error ? (
            <section className="page-panel">
              <p role="alert">{error}</p>
              <button
                className="filter-chip"
                onClick={() => setAttempt((value) => value + 1)}
              >
                Retry
              </button>
            </section>
          ) : (
            <LoginPage authService={authService} onSignedIn={setUser} />
          )}
        </div>
      </section>
    </main>
  );
}
