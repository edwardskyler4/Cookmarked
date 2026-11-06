const hasLetter = /[a-zA-Z]/;
const hasNumber = /[0-9]/;
const hasSpecialCharacter = /[!@#$%^&*]/;

export const passwordRequirements =
  "Use at least 8 characters with an uppercase letter, a lowercase letter, a number, and one of !@#$%^&*.";

export function validatePassword(password: string): string | null {
  if (password.length < 8) return passwordRequirements;
  if (!hasLetter.test(password)) return passwordRequirements;
  if (!hasNumber.test(password)) return passwordRequirements;
  if (!hasSpecialCharacter.test(password)) return passwordRequirements;
  return null;
}
