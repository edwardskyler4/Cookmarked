export interface TempRecipe {
  recipeId: number;
  title: string;
  text: string | null;
  sharedFromPlatform: string | null;
  url: string | null;
  mediaType: string | null;
  thumbnailUrl: string | null;
}

export interface TempRecipeRepository {
  list(authUserId: string): Promise<TempRecipe[]>;
  remove(authUserId: string, recipeId: number): Promise<void>;
}
