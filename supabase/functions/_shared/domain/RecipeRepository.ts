export interface RecipeInput {
  title: string;
  prepTime: string;
  servings: number;
  ingredients: string;
  instructions: string;
  mealType: string;
  course: string;
  url: string;
  note: string;
  nutritionInfo: string;
}

export interface RecipeRepository {
  findProfileId(authUserId: string): Promise<number | null>;
  insert(
    recipe: RecipeInput & { userId: number },
  ): Promise<{ recipeId: number }>;
}

export class RecipeError extends Error {
  constructor(
    public readonly code:
      "invalid_input" | "unauthorized" | "profile_not_found" | "unavailable",
    public readonly field?: string,
  ) {
    super(code);
  }
}
