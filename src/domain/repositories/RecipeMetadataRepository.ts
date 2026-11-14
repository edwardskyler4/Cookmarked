
import type { RecipeMetadata } from "../models/RecipeMetaData";

export interface RecipeMetadataRepository {
  getMetadata(url: string): Promise<RecipeMetadata>;
}
