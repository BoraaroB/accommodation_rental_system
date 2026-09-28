import { useState, type ComponentProps } from 'react';
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from './ui/input-group';

export interface PasswordInputProps extends Omit<
  ComponentProps<'input'>,
  'type'
> {
  /** Classes of the group around the input. */
  className?: string;
}

/**
 * A password input with a toggle button that shows the password as plain
 * text and hides it again.
 */
export function PasswordInput({
  className,
  ...inputProps
}: PasswordInputProps) {
  // Possible improvement (not in the plan): hide the password again when its form is submitted, so it is never sent from a plain text field.
  const [visible, setVisible] = useState(false);

  return (
    <InputGroup className={className}>
      <InputGroupInput
        {...inputProps}
        type={visible ? 'text' : 'password'}
        // Shown as text, the password must not be capitalised or corrected by phone keyboards.
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
      />
      <InputGroupAddon align="inline-end">
        {/* A toggle keeps one label; `aria-pressed` tells whether it is on. */}
        <InputGroupButton
          size="icon-xs"
          aria-label="Show password"
          aria-pressed={visible}
          disabled={inputProps.disabled}
          onClick={() => setVisible((shown) => !shown)}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}
