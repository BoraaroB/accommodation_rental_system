import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable } from '@nestjs/common';

interface RequestContextStore {
  requestId: string;
}

/**
 * Per-request context kept in `AsyncLocalStorage`, so the request id reaches
 * the logger and the exception filter without being passed around.
 * Only the request id lives here.
 */
@Injectable()
export class RequestContextService {
  private readonly storage = new AsyncLocalStorage<RequestContextStore>();

  run<T>(store: RequestContextStore, callback: () => T): T {
    return this.storage.run(store, callback);
  }

  /** The id of the request being handled, or `undefined` outside a request. */
  get requestId(): string | undefined {
    return this.storage.getStore()?.requestId;
  }
}
