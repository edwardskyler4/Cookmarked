import type { ProfileRepository } from "../domain/repositories/ProfileRepository";

export async function updateDisplayName(
  repository: ProfileRepository,
  displayName: string,
) {
  const firstName = displayName.trim();
  if (!firstName) throw new Error("Display name cannot be blank");
  if (firstName.length > 45)
    throw new Error("Display name cannot exceed 45 characters");
  return repository.updateFirstName(firstName);
}
