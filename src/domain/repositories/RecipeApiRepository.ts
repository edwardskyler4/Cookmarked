// Browser request contract. Recipe rules are enforced by the Edge Function.
export interface RecipeDraft {
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

export interface RecipeApiRepository {
  create(recipe: RecipeDraft): Promise<{ recipeId: number }>;
}

export class RecipeSaveError extends Error {
  constructor(
    public readonly code: string,
    public readonly field?: string,
  ) {
    super(code);
  }
}
