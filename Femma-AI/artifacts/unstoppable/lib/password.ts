const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string) {
  return EMAIL_RE.test(email.trim());
}

export function passwordHasNumber(password: string) {
  return /\d/.test(password);
}

export function passwordHasSpecial(password: string) {
  return /[^A-Za-z0-9]/.test(password);
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!passwordHasNumber(password)) return 'Password must include a number';
  if (!passwordHasSpecial(password)) return 'Password must include a special character';
  return null;
}
