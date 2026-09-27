import { cn } from '../../../lib/utils';

/** A tenant's logo; decorative, because the tenant's name is always next to it. */
export function TenantLogo({
  logoUrl,
  className,
}: {
  logoUrl: string | null;
  className?: string;
}) {
  if (logoUrl === null) {
    return null;
  }
  return (
    <img
      src={logoUrl}
      alt=""
      className={cn('size-8 shrink-0 object-contain', className)}
    />
  );
}
