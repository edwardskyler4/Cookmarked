import {
  RecipeError,
  type RecipeRepository,
} from "../domain/RecipeRepository.ts";

export async function createRecipe(
  repository: RecipeRepository,
  authUserId: string,
  input: unknown,
) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new RecipeError("invalid_input");
  const body = input as Record<string, unknown>;
  function text(field: string, required = false, max?: number): string {
    const value = body[field] ?? "";
    if (typeof value !== "string")
      throw new RecipeError("invalid_input", field);
    const trimmed = value.trim();
    if ((required && !trimmed) || (max && trimmed.length > max))
      throw new RecipeError("invalid_input", field);
    return trimmed;
  }
  const title = text("title", true, 45);
  const prepTime = text("prepTime", true, 45);
  const ingredients = text("ingredients", true);
  const instructions = text("instructions", true);
  const servings = body.servings;
  if (
    typeof servings !== "number" ||
    !Number.isInteger(servings) ||
    servings < -2147483648 ||
    servings > 2147483647
  )
    throw new RecipeError("invalid_input", "servings");
  const mealType = text("mealType") || "N/A";
  const course = text("course") || "N/A";
  if (
    !["Breakfast", "Lunch", "Dinner", "Supper", "Snack", "N/A"].includes(
      mealType,
    )
  )
    throw new RecipeError("invalid_input", "mealType");
  if (
    !["Dessert", "Entree", "Side", "Beverage", "Appetizer", "N/A"].includes(
      course,
    )
  )
    throw new RecipeError("invalid_input", "course");
  const url = text("url");
  let normalizedUrl = url;
  if (url) {
    const scheme = url.match(/^https?:\/\//i);
    const singleSlashScheme = url.match(/^https?:\/(?!\/)/i);
    normalizedUrl = scheme
      ? url
      : singleSlashScheme
        ? `https://${url.slice(singleSlashScheme[0].length)}`
        : `https://${url}`;
    try {
      const hostname = new URL(normalizedUrl).hostname;
      if (
        !/^https?:\/\/[^/\s]/i.test(normalizedUrl) ||
        !/\.[^.]+$/.test(hostname)
      )
        throw new Error();
    } catch {
      throw new RecipeError("invalid_input", "url");
    }
  }
  const note = text("note");
  const nutritionInfo = text("nutritionInfo");
  const userId = await repository.findProfileId(authUserId);
  if (userId === null) throw new RecipeError("profile_not_found");
  return repository.insert({
    userId,
    title,
    prepTime,
    servings,
    ingredients,
    instructions,
    mealType,
    course,
    url: normalizedUrl,
    note,
    nutritionInfo,
  });
}
