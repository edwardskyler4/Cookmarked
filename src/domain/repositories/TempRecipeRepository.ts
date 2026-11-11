import type { TempRecipe } from "../models/TempRecipe";

export interface TempRecipeRepository {
  list(): Promise<TempRecipe[]>;
  remove(recipeId: number): Promise<void>;
}
