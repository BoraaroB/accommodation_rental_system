import type { PropertyType } from '@ars/shared';
import {
  BedDoubleIcon,
  Building2Icon,
  HouseIcon,
  SofaIcon,
  WarehouseIcon,
  type LucideIcon,
} from 'lucide-react';

/** How each property type is named and pictured; the data has no photos (D-024). */
export const PROPERTY_TYPES: Record<
  PropertyType,
  { label: string; Icon: LucideIcon }
> = {
  apartment: { label: 'Apartment', Icon: Building2Icon },
  studio: { label: 'Studio', Icon: SofaIcon },
  house: { label: 'House', Icon: HouseIcon },
  loft: { label: 'Loft', Icon: WarehouseIcon },
  room: { label: 'Room', Icon: BedDoubleIcon },
};
