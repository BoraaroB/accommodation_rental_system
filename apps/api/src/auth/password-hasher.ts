export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');

/** One-way password hashing. */
export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, passwordHash: string): Promise<boolean>;
}
