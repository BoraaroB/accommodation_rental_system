import { Injectable } from '@nestjs/common';
import { compare, hash } from 'bcrypt';
import type { PasswordHasher } from './password-hasher.js';

/**
 * bcrypt cost of new hashes. A hash carries its own cost and salt, so hashes
 * made with another cost still verify.
 */
const BCRYPT_ROUNDS = 12;

/**
 * bcrypt with a salt per hash. Used by the API and by the seed, so every
 * password in the database is hashed the same way.
 */
@Injectable()
export class BcryptPasswordHasher implements PasswordHasher {
  hash(password: string): Promise<string> {
    return hash(password, BCRYPT_ROUNDS);
  }

  verify(password: string, passwordHash: string): Promise<boolean> {
    return compare(password, passwordHash);
  }
}
