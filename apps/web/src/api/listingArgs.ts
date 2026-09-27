import { listingIdSchema, tenantSlugSchema } from '@ars/shared';
import { z } from 'zod';

/** The arguments of an endpoint about one listing of a portal. */
export const listingArgsSchema = z.object({
  tenantSlug: tenantSlugSchema,
  id: listingIdSchema,
});
