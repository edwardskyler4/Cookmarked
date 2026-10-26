export type MealType =
  | "Breakfast"
  | "Lunch"
  | "Dinner"
  | "Supper"
  | "Snack"
  | "N/A";

export type Course =
  | "Dessert"
  | "Entree"
  | "Side"
  | "Beverage"
  | "Appetizer"
  | "N/A";

export interface RecipeInput {
  title: string;
  description?: string;
  note?: string;
  ingredients?: string;
  instructions?: string;
  prepTime?: string;
  cookTime?: string;
  servings?: number;
  mealType: MealType;
  course: Course;
  sharedFromPlatform?: string;
  url?: string;
  mediaType?: string;
  thumbnailUrl?: string;
  nutritionInfo?: string;
}

export interface Recipe extends RecipeInput {
  recipeId: number;
  userId: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecipeCreator {
  create(authUserId: string, input: RecipeInput): Promise<Recipe>;
}

export interface RecipeReader {
  list(authUserId: string): Promise<Recipe[]>;
}
