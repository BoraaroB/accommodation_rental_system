/**
 * The list a page was opened from, when a link passed it as `state.backTo`
 * and it is `base` itself or `base` with a query; `base` otherwise, so the
 * state cannot send the user anywhere else.
 */
export function backToOf(state: unknown, base: string): string {
  if (typeof state === 'object' && state !== null && 'backTo' in state) {
    const { backTo } = state;
    if (
      typeof backTo === 'string' &&
      (backTo === base || backTo.startsWith(`${base}?`))
    ) {
      return backTo;
    }
  }
  return base;
}
