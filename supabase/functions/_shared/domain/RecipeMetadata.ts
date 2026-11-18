export type RecipePlatform = "Instagram" | "Facebook" | "Pinterest";

export interface RecipeMetadata {
  title: string | null;
  description: string | null;
  thumbnailUrl: string | null;
  platform: RecipePlatform;
  sourceUrl: string;
}

export class RecipeMetadataError extends Error {
  constructor(
    public readonly code: "invalid_source_url" | "unsupported_platform",
  ) {
    super(code);
  }
}
