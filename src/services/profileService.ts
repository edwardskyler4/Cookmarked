import type { ProfileRepository } from "../domain/repositories/ProfileRepository";
import { updateDisplayName } from "./updateDisplayName";

export function createProfileService(repository: ProfileRepository) {
  return {
    getCurrent: () => repository.getCurrent(),
    updateDisplayName: (displayName: string) =>
      updateDisplayName(repository, displayName),
  };
}

export type ProfileService = ReturnType<typeof createProfileService>;
