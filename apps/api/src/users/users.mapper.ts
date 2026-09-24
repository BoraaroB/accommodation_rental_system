import type { UserProfile } from '@ars/shared';
import type { Prisma } from '../generated/prisma/client.js';

/** The columns a profile is built from; the hosted tenants ordered by slug. */
export const userProfileSelect = {
  id: true,
  email: true,
  name: true,
  isSuperadmin: true,
  memberships: {
    select: { tenant: { select: { slug: true, name: true } } },
    orderBy: { tenant: { slug: 'asc' } },
  },
} satisfies Prisma.UserSelect;

export type UserProfileRow = Prisma.UserGetPayload<{
  select: typeof userProfileSelect;
}>;

/** A user row → `UserProfile`: the memberships become `hostOf`; the password hash is never selected. */
export function toUserProfile(row: UserProfileRow): UserProfile {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    isSuperadmin: row.isSuperadmin,
    hostOf: row.memberships.map(({ tenant }) => ({
      slug: tenant.slug,
      name: tenant.name,
    })),
  };
}
