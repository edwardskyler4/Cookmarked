import { RecipeError } from "../domain/RecipeRepository.ts";
const fields: Record<string, string> = {
  title: "title",
  prep_time: "prepTime",
  ingredients: "ingredients",
  instructions: "instructions",
  servings: "servings",
  url: "url",
  thumbnail_url: "thumbnailUrl",
  meal_type: "mealType",
  course: "course",
  description: "description",
  note: "note",
  nutrition_info: "nutritionInfo",
  shared_from_platform: "sharedFromPlatform",
};
const constraints: Record<string, string> = {
  recipe_title_content: "title",
  recipe_prep_time_content: "prepTime",
  recipe_ingredients_content: "ingredients",
  recipe_instructions_content: "instructions",
  recipe_servings_required: "servings",
  recipe_url_format: "url",
  recipe_thumbnail_url_format: "thumbnailUrl",
  recipe_meal_type_check: "mealType",
  recipe_course_check: "course",
};
export function throwRecipeStorageError(error: {
  code?: string;
  message?: string;
  hint?: string;
}): never {
  if (error.code === "22023")
    throw new RecipeError(
      "invalid_input",
      Object.hasOwn(fields, error.hint ?? "") ? fields[error.hint!] : undefined,
    );
  if (error.code === "22001") throw new RecipeError("invalid_input");
  if (error.code === "23514") {
    const constraint = error.message?.match(/constraint "([a-z_]+)"/)?.[1];
    if (constraint && Object.hasOwn(constraints, constraint))
      throw new RecipeError("invalid_input", constraints[constraint]);
  }
  throw error;
}
