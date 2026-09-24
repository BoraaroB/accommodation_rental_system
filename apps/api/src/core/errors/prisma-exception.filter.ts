import {
  type ArgumentsHost,
  Catch,
  ConflictException,
  type ExceptionFilter,
  type HttpException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { AllExceptionsFilter } from './all-exceptions.filter.js';

type PrismaKnownError = Prisma.PrismaClientKnownRequestError;
type PrismaValidationError = Prisma.PrismaClientValidationError;

/**
 * Prisma error codes that are the client's fault, as HTTP exceptions. The
 * messages are fixed: Prisma's own message and `meta` name tables and columns
 * and never reach the client. `meta` is never logged either: for a failed
 * constraint it holds the whole rejected row, a password hash included.
 */
const CLIENT_ERRORS: ReadonlyMap<
  string,
  (cause: PrismaKnownError) => HttpException
> = new Map<string, (cause: PrismaKnownError) => HttpException>([
  // Unique constraint failed.
  [
    'P2002',
    (cause) =>
      new ConflictException('A record with this value already exists', {
        errorCode: 'UNIQUE_VIOLATION',
        cause,
      }),
  ],
  // Foreign key constraint failed: the referenced record is missing, or a
  // record that is still referenced was deleted.
  [
    'P2003',
    (cause) =>
      new ConflictException(
        'The record references a missing record or is still referenced',
        { errorCode: 'FOREIGN_KEY_VIOLATION', cause },
      ),
  ],
  // A record the operation depends on was not found.
  [
    'P2025',
    (cause) =>
      new NotFoundException('The record does not exist', {
        errorCode: 'NOT_FOUND',
        cause,
      }),
  ],
]);

/**
 * A validation error means the code built a wrong query; its message prints
 * the query's arguments (a password hash, for instance). Only its call stack
 * is kept, so the 500 is logged without them.
 */
function withoutArguments(exception: PrismaValidationError): Error {
  const error = new Error('Invalid query arguments (not logged)');
  error.name = exception.name;
  const frames = (exception.stack ?? '')
    .split('\n')
    .filter((line) => /^\s+at /.test(line));
  error.stack = [`${error.name}: ${error.message}`, ...frames].join('\n');
  return error;
}

/**
 * Safety net for database errors a service did not turn into a domain error:
 * known client errors become 404 / 409, anything else stays a 500. The
 * response is written by `AllExceptionsFilter`, so the body, the request id
 * and the 5xx logging are the same as for every other error.
 */
@Catch(Prisma.PrismaClientKnownRequestError, Prisma.PrismaClientValidationError)
export class PrismaExceptionFilter implements ExceptionFilter<
  PrismaKnownError | PrismaValidationError
> {
  constructor(private readonly allExceptions: AllExceptionsFilter) {}

  catch(
    exception: PrismaKnownError | PrismaValidationError,
    host: ArgumentsHost,
  ): void {
    if (exception instanceof Prisma.PrismaClientValidationError) {
      this.allExceptions.catch(withoutArguments(exception), host);
      return;
    }
    const toHttpException = CLIENT_ERRORS.get(exception.code);
    // Possible improvement (not in the plan): answer 503 when the database is unreachable.
    this.allExceptions.catch(
      toHttpException ? toHttpException(exception) : exception,
      host,
    );
  }
}
