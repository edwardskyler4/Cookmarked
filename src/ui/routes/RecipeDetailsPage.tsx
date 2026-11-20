
import type { Recipe } from "../../domain/models/Recipe";

type RecipeDetailsPageProps = {
  recipe: Recipe;
  onBack: () => void;
};

export default function RecipeDetailsPage({
  recipe,
  onBack,
}: RecipeDetailsPageProps) {
  return (
    <section className="page-panel recipe-details">
      <button
        type="button"
        className="filter-chip"
        onClick={onBack}
      >
        ← Back to Home
      </button>

      <h2>{recipe.title}</h2>

      {recipe.description && <p>{recipe.description}</p>}

      <div className="recipe-details-meta">
        <p>Prep time: {recipe.prepTime || "Not set"}</p>
        <p>Cook time: {recipe.cookTime || "Not set"}</p>
        <p>Servings: {recipe.servings ?? "Not set"}</p>
        <p>Meal type: {recipe.mealType}</p>
        <p>Course: {recipe.course}</p>
      </div>

      <section>
        <h3>Ingredients</h3>
        <p className="recipe-details-text">
          {recipe.ingredients || "No ingredients provided."}
        </p>
      </section>

      <section>
        <h3>Instructions</h3>
        <p className="recipe-details-text">
          {recipe.instructions || "No instructions provided."}
        </p>
      </section>

      {recipe.note && (
        <section>
          <h3>Notes</h3>
          <p className="recipe-details-text">{recipe.note}</p>
        </section>
      )}

      {recipe.nutritionInfo && (
        <section>
          <h3>Nutritional Information</h3>
          <p className="recipe-details-text">
            {recipe.nutritionInfo}
          </p>
        </section>
      )}

      {recipe.url && /^https?:\/\//i.test(recipe.url) && (
        <a
          href={recipe.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          View Original Recipe
        </a>
      )}
    </section>
  );
}
