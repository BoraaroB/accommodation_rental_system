/**
 * The path of a request URL without its query string. Logs and error bodies
 * use it, so query parameters are never written to the log or echoed back.
 */
export function pathOf(url: string): string {
  const queryStart = url.indexOf('?');
  return queryStart === -1 ? url : url.slice(0, queryStart);
}
