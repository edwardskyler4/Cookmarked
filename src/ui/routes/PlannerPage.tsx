
import { useState } from "react";

type Recipe = {
  name: string;
  prepTime: number;
  ingredients: string[];
};

type Meal = {
  type: string;
  recipes: string[];
};

type Day = {
  name: string;
  date: string;
  meals: Meal[];
};

const dayNames = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function createEmptyDay(name: string, date: string): Day {
  return {
    name,
    date,
    meals: [
      { type: "Breakfast", recipes: [] },
      { type: "Lunch", recipes: [] },
      { type: "Dinner", recipes: [] },
    ],
  };
}

export default function PlannerPage({ onAddRecipe = () => {} }: { onAddRecipe?: () => void }) {
  const [days, setDays] = useState<Day[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [calendarView, setCalendarView] = useState<"weekly" | "monthly">("weekly");

  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<string | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<string | null>(null);

  const [recipeMode, setRecipeMode] = useState<"add" | "delete" | null>(null);
  const [newRecipe, setNewRecipe] = useState("");
  const [newPrepTime, setNewPrepTime] = useState("15");
  const [newIngredients, setNewIngredients] = useState("");
  const [recipeToAdd, setRecipeToAdd] = useState("");
  const [recipeToDelete, setRecipeToDelete] = useState("");

  const today = new Date();
  const monday = new Date(today);

  monday.setDate(
    today.getDate() - ((today.getDay() + 6) % 7) + weekOffset * 7
  );
  monday.setHours(0, 0, 0, 0);

  const weekDays = dayNames.map((name, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);

    const dateKey = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");

    const savedDay = days.find((day) => day.date === dateKey);

    return savedDay ?? createEmptyDay(name, dateKey);
  });

  const monthStart = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const monthDays = Array.from(
    { length: new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate() },
    (_, index) => {
      const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), index + 1);
      const dateKey = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
      ].join("-");
      const name = date.toLocaleDateString("en-US", { weekday: "long" });
      const savedDay = days.find((day) => day.date === dateKey);

      return savedDay ?? createEmptyDay(name, dateKey);
    }
  );

  const displayedDays = calendarView === "weekly" ? weekDays : monthDays;

  const currentMeal = displayedDays
    .find((day) => day.date === selectedDay)
    ?.meals.find((meal) => meal.type === selectedMeal);

  const detailsRecipe = recipes.find(
    (recipe) => recipe.name === selectedRecipe
  );

  function closeDetails() {
    setSelectedDay(null);
    setSelectedMeal(null);
    setSelectedRecipe(null);
    setRecipeMode(null);
  }

  function assignRecipe(recipeName: string) {
    if (!selectedDay || !selectedMeal || !recipeName) {
      return;
    }

    const targetDay = displayedDays.find(
      (day) => day.date === selectedDay
    );

    if (!targetDay) {
      return;
    }

    setDays((currentDays) => {
      const savedDay = currentDays.find(
        (day) => day.date === targetDay.date
      );

      const dayToUpdate = savedDay ?? targetDay;

      const updatedDay: Day = {
        ...dayToUpdate,
        meals: dayToUpdate.meals.map((meal) => {
          if (meal.type !== selectedMeal) {
            return meal;
          }

          if (meal.recipes.includes(recipeName)) {
            return meal;
          }

          return {
            ...meal,
            recipes: [...meal.recipes, recipeName],
          };
        }),
      };

      if (savedDay && savedDay.meals.some(
        (meal) =>
          meal.type === selectedMeal &&
          meal.recipes.includes(recipeName)
      )) {
        return currentDays;
      }

      return [
        ...currentDays.filter(
          (day) => day.date !== targetDay.date
        ),
        updatedDay,
      ];
    });

    setSelectedRecipe(recipeName);
    setRecipeMode(null);
    setRecipeToAdd("");
    setNewRecipe("");
    setNewIngredients("");
    setNewPrepTime("15");
  }

  function saveRecipe() {
    const name = newRecipe.trim();

    if (name) {
      const existingRecipe = recipes.find(
        (recipe) => recipe.name.toLowerCase() === name.toLowerCase()
      );

      if (existingRecipe) {
        assignRecipe(existingRecipe.name);
        return;
      }

      const recipe: Recipe = {
        name,
        prepTime: Math.max(0, Number(newPrepTime) || 0),
        ingredients: newIngredients
          .split(",")
          .map((ingredient) => ingredient.trim())
          .filter(Boolean),
      };

      setRecipes((currentRecipes) => [...currentRecipes, recipe]);
      assignRecipe(recipe.name);
      return;
    }

    if (recipeToAdd) {
      assignRecipe(recipeToAdd);
    }
  }

  function deleteRecipe() {
    if (!recipeToDelete) {
      return;
    }

    setRecipes((currentRecipes) =>
      currentRecipes.filter(
        (recipe) => recipe.name !== recipeToDelete
      )
    );

    setDays((currentDays) =>
      currentDays.map((day) => ({
        ...day,
        meals: day.meals.map((meal) => ({
          ...meal,
          recipes: meal.recipes.filter(
            (recipe) => recipe !== recipeToDelete
          ),
        })),
      }))
    );

    if (selectedRecipe === recipeToDelete) {
      setSelectedRecipe(null);
    }

    setRecipeToDelete("");
    setRecipeMode(null);
  }

  return (
    <section
      className="page-panel planner-page"
      aria-labelledby="planner-heading"
    >
      <h2 id="planner-heading">Planner</h2>

      <div className="calendar-tabs">
        <button
          className={calendarView === "weekly" ? "active" : ""}
          onClick={() => {
            setCalendarView("weekly");
            closeDetails();
          }}
        >
          Weekly
        </button>
        <button
          className={calendarView === "monthly" ? "active" : ""}
          onClick={() => {
            setCalendarView("monthly");
            closeDetails();
          }}
        >
          Monthly
        </button>
      </div>

      {calendarView === "weekly" ? (
        <div className="week-navigation">
          <button onClick={() => setWeekOffset((offset) => offset - 1)}>
            Previous Week
          </button>

          <button onClick={() => setWeekOffset(0)}>
            This Week
          </button>

          <button onClick={() => setWeekOffset((offset) => offset + 1)}>
            Next Week
          </button>
        </div>
      ) : (
        <div className="week-navigation">
          <button onClick={() => setMonthOffset((offset) => offset - 1)}>
            Previous Month
          </button>

          <strong>
            {monthStart.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </strong>

          <button onClick={() => setMonthOffset(0)}>
            This Month
          </button>

          <button onClick={() => setMonthOffset((offset) => offset + 1)}>
            Next Month
          </button>
        </div>
      )}

      {calendarView === "weekly" ? (
        <div className="planner-grid" onClick={closeDetails}>
          {weekDays.map((day) => (
            <div className="planner-day" key={day.date}>
              <h3>
                {day.name}
                <span className="planner-date">
                  {new Date(`${day.date}T12:00:00`).toLocaleDateString(
                    "en-US", { month: "short", day: "numeric" }
                  )}
                </span>
              </h3>
              <div className="planner-meals">
                {day.meals.map((meal) => (
                  <div
                    className="planner-meal"
                    key={meal.type}
                    onClick={(event) => event.stopPropagation()}
                    onDoubleClick={(event) => {
                      event.stopPropagation();
                      setSelectedDay(day.date);
                      setSelectedMeal(meal.type);
                      setSelectedRecipe(meal.recipes[0] ?? null);
                      setRecipeMode(null);
                    }}
                  >
                    <strong>{meal.type}</strong>
                    <div className="assigned-recipes">
                      {meal.recipes.map((recipe) => (
                        <div className="assigned-recipe" key={recipe}>{recipe}</div>
                      ))}
                    </div>
                    {meal.recipes.length === 0 && (
                      <p className="empty-meal">Double-click to open</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="monthly-calendar-wrap">
          <div className="monthly-weekdays" aria-hidden="true">
            { ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((name) => (
              <div key={name}>{name}</div>
            )) }
          </div>
          <div className="monthly-planner-grid" onClick={closeDetails}>
            {Array.from({ length: new Date(monthStart.getFullYear(), monthStart.getMonth(), 1).getDay() }, (_, index) => (
              <div className="monthly-empty-day" key={`empty-${index}`} />
            ))}
            {monthDays.map((day) => {
              const recipeCount = day.meals.reduce((total, meal) => total + meal.recipes.length, 0);
              return (
                <button
                  type="button"
                  className={`monthly-day-box${selectedDay === day.date ? " selected" : ""}`}
                  key={day.date}
                  onDoubleClick={(event) => {
                    event.stopPropagation();
                    setSelectedDay(day.date);
                    setSelectedMeal(null);
                    setSelectedRecipe(null);
                    setRecipeMode(null);
                  }}
                  onClick={(event) => event.stopPropagation()}
                  aria-label={`Double-click to plan meals for ${day.name}, ${day.date}`}
                >
                  <span className="monthly-day-number">{new Date(`${day.date}T12:00:00`).getDate()}</span>
                  {recipeCount > 0 && <span className="monthly-recipe-count">{recipeCount} planned</span>}
                  <span className="monthly-day-hint">Double-click to plan</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {calendarView === "monthly" && selectedDay && !selectedMeal && (
        <div className="recipe-panel monthly-meal-picker" onClick={(event) => event.stopPropagation()}>
          <h3>Choose a meal — {new Date(`${selectedDay}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</h3>
          <p>Select which meal you want to plan for this day.</p>
          <div className="recipe-actions">
            {["Breakfast", "Lunch", "Dinner"].map((mealType) => (
              <button key={mealType} onClick={() => {
                const day = monthDays.find((item) => item.date === selectedDay);
                const meal = day?.meals.find((item) => item.type === mealType);
                setSelectedMeal(mealType);
                setSelectedRecipe(meal?.recipes[0] ?? null);
                setRecipeMode(null);
              }}>{mealType}</button>
            ))}
            <button onClick={closeDetails}>Close</button>
          </div>
        </div>
      )}

      {currentMeal && (
        <div
          className="recipe-panel"
          onClick={(event) => event.stopPropagation()}
        >
          <h3>
            {selectedMeal} —{" "}
            {new Date(`${selectedDay}T12:00:00`).toLocaleDateString(
              "en-US",
              {
                weekday: "long",
                month: "short",
                day: "numeric",
              }
            )}
          </h3>

          {currentMeal.recipes.length > 0 ? (
            <>
              <label htmlFor="details-recipe">
                Choose a recipe to view
              </label>

              <select
                id="details-recipe"
                value={selectedRecipe ?? ""}
                onChange={(event) =>
                  setSelectedRecipe(event.target.value)
                }
              >
                {currentMeal.recipes.map((recipe) => (
                  <option value={recipe} key={recipe}>
                    {recipe}
                  </option>
                ))}
              </select>

              {detailsRecipe ? (
                <>
                  <h4>{detailsRecipe.name}</h4>

                  <p>
                    <strong>Prep time:</strong>{" "}
                    {detailsRecipe.prepTime} minutes
                  </p>

                  <h4>Ingredients</h4>

                  {detailsRecipe.ingredients.length > 0 ? (
                    <ul>
                      {detailsRecipe.ingredients.map((ingredient) => (
                        <li key={ingredient}>{ingredient}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>No ingredients added yet.</p>
                  )}
                </>
              ) : (
                <p>Select a recipe to see its details.</p>
              )}
            </>
          ) : (
            <p>No recipes planned for this meal yet.</p>
          )}

          <div className="recipe-actions">
            <button onClick={onAddRecipe}>
              Add Recipe
            </button>

            <button onClick={() => setRecipeMode("delete")}>
              Delete Recipe
            </button>

            <button onClick={closeDetails}>
              Close Details
            </button>
          </div>

          {recipeMode === "add" && (
            <div className="recipe-panel">
              <h4>Add a recipe to {selectedMeal}</h4>

              <label htmlFor="existing-recipe">
                Choose an existing recipe
              </label>

              <select
                id="existing-recipe"
                value={recipeToAdd}
                onChange={(event) =>
                  setRecipeToAdd(event.target.value)
                }
              >
                <option value="">Choose a recipe</option>

                {recipes.map((recipe) => (
                  <option value={recipe.name} key={recipe.name}>
                    {recipe.name}
                  </option>
                ))}
              </select>

              <p>Or create a new recipe:</p>

              <label htmlFor="new-recipe">Recipe name</label>

              <input
                id="new-recipe"
                value={newRecipe}
                onChange={(event) => setNewRecipe(event.target.value)}
                placeholder="e.g. Eggs and Toast"
              />

              <label htmlFor="prep-time">
                Prep time (minutes)
              </label>

              <input
                id="prep-time"
                type="number"
                min="0"
                value={newPrepTime}
                onChange={(event) =>
                  setNewPrepTime(event.target.value)
                }
              />

              <label htmlFor="ingredients">
                Ingredients (separated by commas)
              </label>

              <textarea
                id="ingredients"
                value={newIngredients}
                onChange={(event) =>
                  setNewIngredients(event.target.value)
                }
                placeholder="Eggs, bread, butter"
              />

              <button onClick={saveRecipe}>
                Save and Add to Meal
              </button>

              <button onClick={() => setRecipeMode(null)}>
                Cancel
              </button>
            </div>
          )}

          {recipeMode === "delete" && (
            <div className="recipe-panel">
              <h4>Delete a recipe from your library</h4>

              <select
                value={recipeToDelete}
                onChange={(event) =>
                  setRecipeToDelete(event.target.value)
                }
              >
                <option value="">Choose a recipe to delete</option>

                {recipes.map((recipe) => (
                  <option value={recipe.name} key={recipe.name}>
                    {recipe.name}
                  </option>
                ))}
              </select>

              <button onClick={deleteRecipe}>
                Delete Recipe
              </button>

              <button onClick={() => setRecipeMode(null)}>
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {!currentMeal && recipeMode === "delete" && (
        <div className="recipe-panel">
          <h3>Delete a recipe from your library</h3>

          <select
            value={recipeToDelete}
            onChange={(event) =>
              setRecipeToDelete(event.target.value)
            }
          >
            <option value="">Choose a recipe to delete</option>

            {recipes.map((recipe) => (
              <option value={recipe.name} key={recipe.name}>
                {recipe.name}
              </option>
            ))}
          </select>

          <button onClick={deleteRecipe}>Delete Recipe</button>

          <button onClick={() => setRecipeMode(null)}>Cancel</button>
        </div>
      )}

      {!currentMeal && recipeMode === null && (
        <div className="recipe-actions">
          <button onClick={() => setRecipeMode("delete")}>
            Delete Recipe
          </button>
        </div>
      )}
    </section>
  );
}

