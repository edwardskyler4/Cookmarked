import type { Recipe } from "../models/Recipe";

export interface RecipeReader {
  list(): Promise<Recipe[]>;
}
