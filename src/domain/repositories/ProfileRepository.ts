import type { Profile } from "../models/Profile";

export interface ProfileRepository {
  getCurrent(): Promise<Profile>;
  updateFirstName(firstName: string): Promise<Profile>;
}
