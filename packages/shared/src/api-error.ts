import { z } from 'zod';

/**
 * A request id: the value of the `x-request-id` header, echoed in the response
 * header, in every error body and in every log line of the request. A value
 * sent by the client is accepted only in this safe shape; anything else is
 * replaced by a generated UUID.
 */
export const requestIdSchema = z.string().regex(/^[A-Za-z0-9._-]{1,128}$/);

/** A machine-readable error code, e.g. `NOT_FOUND` or `DAY_ALREADY_BOOKED`. */
export const errorCodeSchema = z.string().regex(/^[A-Z][A-Z0-9_]*$/);

/** The body of every error response of the API. */
export const apiErrorSchema = z.object({
  statusCode: z.number().int().min(400).max(599),
  /** The HTTP reason phrase, e.g. `Not Found`. */
  error: z.string(),
  code: errorCodeSchema,
  /** One message, or one message per failed check (validation errors). */
  message: z.union([z.string(), z.array(z.string())]),
  path: z.string(),
  timestamp: z.iso.datetime(),
  requestId: requestIdSchema,
});

export type ApiError = z.infer<typeof apiErrorSchema>;
