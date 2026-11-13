
export type RecipePlatform =
  | "Instagram"
  | "Facebook"
  | "Pinterest";

export interface RecipeMetadata {
  title: string | null;
  description: string | null;
  thumbnailUrl: string | null;
  platform: RecipePlatform;
  sourceUrl: string;
}
