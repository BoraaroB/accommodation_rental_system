import type { UserProfile } from '@ars/shared';

export const USERS_REPOSITORY = Symbol('USERS_REPOSITORY');

/** What sign-in needs to check a password. */
export interface UserCredentials {
  id: string;
  email: string;
  passwordHash: string;
}

/** A new account. There is no `isSuperadmin`: registration only creates clients (D-008). */
export interface NewUser {
  email: string;
  name: string;
  passwordHash: string;
}

/** The facts that decide a user's role in one tenant (D-007). */
export interface UserAccess {
  isSuperadmin: boolean;
  /** Whether the user has a membership in the tenant asked about. */
  isHost: boolean;
}

/** User accounts, the global identity (D-003). E-mails are stored lowercase. */
export interface UsersRepository {
  findByEmail(email: string): Promise<UserCredentials | null>;
  findProfileById(id: string): Promise<UserProfile | null>;
  /** `null` when the user does not exist. Without a tenant, `isHost` is false. */
  findAccess(
    userId: string,
    tenantId: string | null,
  ): Promise<UserAccess | null>;
  create(user: NewUser): Promise<UserProfile>;
}
