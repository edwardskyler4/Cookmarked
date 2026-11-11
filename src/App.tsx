import { useCallback, useEffect, useState } from "react";
import PlannerPage from "./ui/routes/PlannerPage";
import ImportPage from "./ui/routes/ImportPage";
import SettingsPage from "./ui/routes/SettingsPage";
import LoginPage from "./ui/routes/LoginPage";
import "./App.css";
import type { RecipeService } from "./services/recipeService";
import type { AuthService } from "./services/authService";
import type { AuthUser } from "./domain/models/AuthUser";
import type { Recipe } from "./domain/models/Recipe";
import type { RecipeReader } from "./domain/repositories/RecipeReader";
import { listRecipes } from "./services/listRecipes";
import type { ProfileService } from "./services/profileService";
import type { TempRecipe } from "./domain/models/TempRecipe";
import type { TempRecipeRepository } from "./domain/repositories/TempRecipeRepository";
import { convertTempRecipe } from "./services/convertTempRecipe";

const filters = ["All recipes", "Breakfast", "Dinner", "Dessert"];
const pageLabels = {
  home: "Home / Library",
  planner: "Planner",
  add: "Add",
  settings: "Settings",
};
type Page = keyof typeof pageLabels;
const navigation = [
  ["home", "Home"],
  ["planner", "Planner"],
  ["add", "Add"],
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
  if (type === "add")
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
  onSavePassword,
  pending,
  darkMode,
  onSaveDarkMode,
  profileService,
  recipeService,
  recipeReader,
  tempRecipeRepository,
  onImportUrl,
}: {
  recipeService: RecipeService;
  profileService?: ProfileService;
  user: AuthUser;
  onLogout: () => void;
  onSavePassword: (password: string) => Promise<void>;
  pending: boolean;
  darkMode: boolean;
  onSaveDarkMode: (darkMode: boolean) => void;
  recipeReader: RecipeReader;
  tempRecipeRepository?: TempRecipeRepository;
  onImportUrl: (url: string) => void | Promise<void>;
}) {
  const [page, setPage] = useState<Page>("home");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recipesLoading, setRecipesLoading] = useState(true);
  const [recipesError, setRecipesError] = useState<string | null>(null);
  const [tempRecipes, setTempRecipes] = useState<TempRecipe[]>([]);
  const [selectedTempRecipeId, setSelectedTempRecipeId] = useState<number | null>(null);

  const reloadRecipes = useCallback(async () => {
    setRecipesLoading(true);
    setRecipesError(null);
    try {
      setRecipes(await listRecipes(recipeReader));
    } catch {
      setRecipesError("Unable to load your recipes.");
    } finally {
      setRecipesLoading(false);
    }
  }, [recipeReader]);

  useEffect(() => {
    void reloadRecipes();
  }, [reloadRecipes]);

  useEffect(() => {
    let active = true;
    if (!tempRecipeRepository) return;
    tempRecipeRepository
      .list()
      .then((nextTempRecipes) => {
        if (active) setTempRecipes(nextTempRecipes);
      })
      .catch(() => {
        if (active) setTempRecipes([]);
      });
    return () => {
      active = false;
    };
  }, [tempRecipeRepository]);
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    let active = true;
    if (!profileService) return;
    profileService
      .getCurrent()
      .then((profile) => {
        if (active) setDisplayName(profile.firstName);
      })
      .catch(() => {
        // The username remains available if the optional profile lookup fails.
      });
    return () => {
      active = false;
    };
  }, [profileService, user.id]);

  async function saveDisplayName(nextDisplayName: string) {
    if (!profileService) return;
    const profile = await profileService.updateDisplayName(nextDisplayName);
    setDisplayName(profile.firstName);
  }

  return (
    <main className={darkMode ? "page-shell dark-theme" : "page-shell"}>
      <section className="app-shell" aria-label={`Cookmarked ${page}`}>
        <header className="app-header">
          <div className="header-brand">
            <img src="/logo.jpg" className="logo" alt="" />
            <h1>Cookmarked</h1>
          </div>
          <div className="header-actions">
            <p className="location-label">{pageLabels[page]}</p>
            <span>{displayName || user.username}</span>
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
                {recipesLoading && <p role="status">Loading your recipes...</p>}
                {recipesError && <p role="alert">{recipesError}</p>}
                {!recipesLoading && !recipesError && recipes.length === 0 && (
                  <p>No recipes saved yet.</p>
                )}
                {recipes.map((recipe, index) => (
                  <article className="recipe-card" key={recipe.recipeId}>
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
                      <h2>{recipe.title}</h2>
                      <p className="recipe-meta">
                        Prep time · {recipe.prepTime ?? "Not set"}
                      </p>
                    </div>
                    <button
                      className="more-button"
                      aria-label={`More options for ${recipe.title}`}
                    >
                      ···
                    </button>
                  </article>
                ))}
              </div>
            </>
          )}
          {page === "planner" && <PlannerPage />}
          {page === "add" && (
            <>
              {tempRecipeRepository && (
                <section className="page-panel import-inbox" aria-labelledby="import-inbox-heading">
                  <p className="eyebrow">Import inbox</p>
                  <h2 id="import-inbox-heading">Imported recipes:</h2>
                  {tempRecipes.length === 0 ? (
                    <p>No imported recipes waiting for review.</p>
                  ) : (
                    <div>
                      {tempRecipes.map((tempRecipe) => (
                        <button
                          type="button"
                          className={
                            selectedTempRecipeId === tempRecipe.recipeId
                              ? "filter-chip active"
                              : "filter-chip"
                          }
                          key={tempRecipe.recipeId}
                          onClick={() => setSelectedTempRecipeId(tempRecipe.recipeId)}
                        >
                          {tempRecipe.title}
                        </button>
                      ))}
                    </div>
                  )}
                  <form
                    className="import-url-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const form = event.currentTarget;
                      const url = new FormData(form).get("recipeUrl");
                      if (typeof url === "string") {
                        const trimmedUrl = url.trim();
                        console.log(
                          "[Cookmarked] Received recipe URL:",
                          trimmedUrl,
                          "Planned action: create a temporary recipe for review.",
                        );
                        void onImportUrl(trimmedUrl);
                      }
                    }}
                  >
                    <label className="editor-field">
                      <span>Recipe URL</span>
                      <input
                        type="url"
                        name="recipeUrl"
                        placeholder="https://example.com/recipe"
                        required
                      />
                    </label>
                    <button className="filter-chip active" type="submit">
                      Import URL
                    </button>
                  </form>
                </section>
              )}
              <ImportPage
                recipeService={recipeService}
                tempRecipe={tempRecipes.find(
                  (tempRecipe) => tempRecipe.recipeId === selectedTempRecipeId,
                )}
                saveRecipe={
                  selectedTempRecipeId !== null && tempRecipeRepository
                    ? (draft) =>
                        convertTempRecipe(
                          recipeService,
                          tempRecipeRepository,
                          selectedTempRecipeId,
                          draft,
                        ).then((result) => {
                          setTempRecipes((current) =>
                            current.filter(
                              (tempRecipe) =>
                                tempRecipe.recipeId !== selectedTempRecipeId,
                            ),
                          );
                          setSelectedTempRecipeId(null);
                          return result;
                        })
                    : undefined
                }
                onSaved={reloadRecipes}
              />
            </>
          )}
          {page === "settings" && (
            <SettingsPage
              username={user.username}
              displayName={displayName}
              darkMode={darkMode}
              onSaveDarkMode={onSaveDarkMode}
              onSaveDisplayName={saveDisplayName}
              onSavePassword={onSavePassword}
            />
          )}
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

const emptyRecipeReader: RecipeReader = { list: async () => [] };

export default function App({
  authService,
  profileService,
  recipeService,
  recipeReader = emptyRecipeReader,
  tempRecipeRepository,
  onImportUrl = () => {},
}: {
  authService: AuthService;
  profileService?: ProfileService;
  recipeService: RecipeService;
  recipeReader?: RecipeReader;
  tempRecipeRepository?: TempRecipeRepository;
  onImportUrl?: (url: string) => void | Promise<void>;
}) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

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
          profileService={profileService}
          onSavePassword={authService.updatePassword}
          recipeService={recipeService}
          key={user.id}
          user={user}
          onLogout={logout}
          pending={loggingOut}
          darkMode={darkMode}
          onSaveDarkMode={setDarkMode}
          recipeReader={recipeReader}
          tempRecipeRepository={tempRecipeRepository}
          onImportUrl={onImportUrl}
        />
      </>
    );

  return (
    <main className={darkMode ? "page-shell dark-theme" : "page-shell"}>
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
