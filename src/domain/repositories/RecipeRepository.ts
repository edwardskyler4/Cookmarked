import type { Recipe, RecipeInput } from "../models/Recipe";

export interface RecipeRepository {
  create(userId: number, input: RecipeInput): Promise<Recipe>;
}
