import { useEffect } from 'react';
import { BRAND_VARIABLES } from '../brandStyle';

/**
 * Gives the whole document a tenant's primary colour while its portal is
 * shown. The document, not the layout element, because the UI kit renders
 * popups (select lists, the date picker, the filter sheet) into
 * `document.body`, outside the portal's markup.
 */
export function useBrandColor(primaryColor: string | null | undefined): void {
  useEffect(() => {
    if (!primaryColor) {
      return;
    }
    const { style } = document.documentElement;
    for (const variable of BRAND_VARIABLES) {
      style.setProperty(variable, primaryColor);
    }
    return () => {
      for (const variable of BRAND_VARIABLES) {
        style.removeProperty(variable);
      }
    };
  }, [primaryColor]);
}
