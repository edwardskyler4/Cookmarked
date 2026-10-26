import type {
  Recipe,
  RecipeCreator,
  RecipeInput as LegacyRecipeInput,
} from "../domain/Recipe.ts";
import { RecipeError, type RecipeRepository, type RecipeInput } from "../domain/RecipeRepository.ts";

export function createRecipe(creator: RecipeCreator, authUserId: string, input: LegacyRecipeInput): Promise<Recipe>;
export function createRecipe(repository: RecipeRepository, authUserId: string, input: unknown): Promise<{ recipeId: number }>;
export async function createRecipe(
  source: RecipeCreator | RecipeRepository,
  authUserId: string,
  input: LegacyRecipeInput | unknown,
): Promise<Recipe | { recipeId: number }> {
  if ("create" in source)
    return source.create(authUserId, input as LegacyRecipeInput);

  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new RecipeError("invalid_input");
  const body = input as Record<string, unknown>;
  const text = (field: string, required = false, max?: number): string => {
    const value = body[field] ?? "";
    if (typeof value !== "string") throw new RecipeError("invalid_input", field);
    const trimmed = value.trim();
    if ((required && !trimmed) || (max && trimmed.length > max))
      throw new RecipeError("invalid_input", field);
    return trimmed;
  };
  const title = text("title", true, 45);
  const prepTime = text("prepTime", true, 45);
  const ingredients = text("ingredients", true);
  const instructions = text("instructions", true);
  const servings = body.servings;
  if (typeof servings !== "number" || !Number.isInteger(servings) || servings < -2147483648 || servings > 2147483647)
    throw new RecipeError("invalid_input", "servings");
  const mealType = text("mealType") || "N/A";
  const course = text("course") || "N/A";
  if (!["Breakfast", "Lunch", "Dinner", "Supper", "Snack", "N/A"].includes(mealType))
    throw new RecipeError("invalid_input", "mealType");
  if (!["Dessert", "Entree", "Side", "Beverage", "Appetizer", "N/A"].includes(course))
    throw new RecipeError("invalid_input", "course");
  const url = text("url");
  if (url) {
    try {
      if (!/^https:\/\/[^\/\s]/.test(url) || !new URL(url).hostname) throw new Error();
    } catch {
      throw new RecipeError("invalid_input", "url");
    }
  }
  const userId = await source.findProfileId(authUserId);
  if (userId === null) throw new RecipeError("profile_not_found");
  const validated: RecipeInput & { userId: number } = {
    userId,
    title,
    prepTime,
    servings,
    ingredients,
    instructions,
    mealType,
    course,
    url,
    note: text("note"),
    nutritionInfo: text("nutritionInfo"),
  };
  return source.insert(validated);
}
