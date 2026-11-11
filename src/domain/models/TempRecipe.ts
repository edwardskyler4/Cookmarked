export interface TempRecipe {
  recipeId: number;
  title: string;
  text?: string;
  url?: string;
  sharedFromPlatform?: string;
  mediaType?: string;
  thumbnailUrl?: string;
}
