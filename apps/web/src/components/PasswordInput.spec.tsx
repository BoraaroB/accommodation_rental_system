import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FormField } from './ui/form-field';
import { PasswordInput } from './PasswordInput';

function renderPasswordField(onSubmit = vi.fn()) {
  render(
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <FormField label="Password" hint="At least 8 characters">
        {(control) => <PasswordInput {...control} />}
      </FormField>
    </form>,
  );
  return {
    input: screen.getByLabelText('Password'),
    toggle: screen.getByRole('button', { name: 'Show password' }),
  };
}

describe('PasswordInput', () => {
  it('hides the password until the toggle is pressed, and hides it again', async () => {
    const user = userEvent.setup();
    const { input, toggle } = renderPasswordField();
    await user.type(input, 'correct-horse');

    expect(input).toHaveAttribute('type', 'password');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    await user.click(toggle);
    expect(input).toHaveAttribute('type', 'text');
    expect(input).toHaveValue('correct-horse');
    expect(toggle).toHaveAttribute('aria-pressed', 'true');

    await user.click(toggle);
    expect(input).toHaveAttribute('type', 'password');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });

  it('keeps the field label and hint on the input', () => {
    const { input } = renderPasswordField();
    expect(input).toHaveAccessibleName('Password');
    expect(input).toHaveAccessibleDescription('At least 8 characters');
  });

  it('does not submit the form', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const { toggle } = renderPasswordField(onSubmit);

    await user.click(toggle);

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
