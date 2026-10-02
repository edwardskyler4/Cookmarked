import "./App.css";

const filters = ["All recipes", "Breakfast", "Dinner", "Dessert"];
const recipes = ["Recipe Name", "Recipe Name", "Recipe Name", "Recipe Name"];

function SearchIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="search-icon"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>;
}

function NavigationIcon({ type }: { type: "home" | "planner" | "import" | "settings" }) {
  if (type === "home") return <span aria-hidden="true" className="nav-symbol">⌂</span>;
  if (type === "planner") return <span aria-hidden="true" className="nav-symbol">□</span>;
  if (type === "import") return <span aria-hidden="true" className="nav-symbol">↓</span>;
  return <span aria-hidden="true" className="nav-symbol">⚙</span>;
}

export default function App() {
  return (
    <main className="page-shell">
      <section className="app-shell" aria-label="Cookmarked home">
        <header className="app-header">
          <div className="header-brand">
            <img src="/logo.jpg" className="logo" alt="" />
            <h1>Cookmarked</h1>
          </div>
          <p className="location-label">Home / Library</p>
        </header>
        <div className="content-area">
          <div className="search-row">
            <label className="search-bar"><SearchIcon /><span className="sr-only">Search recipes</span><input type="search" placeholder="Search recipes" /></label>
          </div>
          <div className="filter-row" aria-label="Recipe filters">
            {filters.map((filter, index) => <button className={index === 0 ? "filter-chip active" : "filter-chip"} key={filter}>{filter}</button>)}
          </div>
          <div className="recipe-list" aria-label="Recipe list">
            {recipes.map((recipe, index) => (
              <article className="recipe-card" key={`${recipe}-${index}`}>
                <div className="recipe-image-placeholder" aria-hidden="true">{index === 0 && <img src="/logo.jpg" alt="" />}</div>
                <div className="recipe-card-content"><p className="recipe-kicker">{index === 0 ? "Featured recipe" : "Saved recipe"}</p><h2>{recipe}</h2><p className="recipe-meta">Prep time · 30 min</p></div>
                <button className="more-button" aria-label={`More options for ${recipe}`}>···</button>
              </article>
            ))}
          </div>
        </div>
        <nav className="bottom-nav" aria-label="Main navigation">
          {[["home", "Home"], ["planner", "Planner"], ["import", "Import"], ["settings", "Settings"]].map(([type, label], index) => (
            <button className={index === 0 ? "nav-item active" : "nav-item"} key={label}><NavigationIcon type={type as "home" | "planner" | "import" | "settings"} /><span>{label}</span></button>
          ))}
        </nav>
      </section>
    </main>
  );
}
