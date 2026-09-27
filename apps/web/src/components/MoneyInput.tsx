import { useState, type ComponentProps } from 'react';
import { eurosText, parseEuros } from '../lib/euros';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from './ui/input-group';

export interface MoneyInputProps extends Omit<
  ComponentProps<'input'>,
  'value' | 'defaultValue' | 'onChange' | 'type'
> {
  /** Integer cents; anything else shows as empty. */
  value: unknown;
  /** Cents, `NaN` for text that is not an amount, `undefined` when empty. */
  onChange: (cents: number | undefined) => void;
  /** Classes of the group around the input. */
  className?: string;
}

/**
 * An amount typed in euros and held as integer cents, the only unit of the
 * URL and the API (D-011), converted once with `eurosToCents`.
 */
export function MoneyInput({
  value,
  onChange,
  className,
  ...inputProps
}: MoneyInputProps) {
  const [text, setText] = useState(() => eurosText(value));
  // The value this input last wrote; any other value came from outside
  // (a reset, a new URL) and replaces the text.
  const [ownValue, setOwnValue] = useState<unknown>(value);
  // `Object.is`, because an invalid amount is NaN, which is not `===` itself.
  if (!Object.is(value, ownValue)) {
    setOwnValue(value);
    setText(eurosText(value));
  }

  return (
    <InputGroup className={className}>
      <InputGroupAddon>
        <InputGroupText>€</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput
        {...inputProps}
        inputMode="decimal"
        autoComplete="off"
        value={text}
        onChange={(event) => {
          const cents = parseEuros(event.target.value);
          setText(event.target.value);
          setOwnValue(cents);
          onChange(cents);
        }}
      />
    </InputGroup>
  );
}
