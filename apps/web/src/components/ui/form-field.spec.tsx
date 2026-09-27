import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormField } from './form-field';
import { Input } from './input';

function renderField(props: { error?: string; hint?: string }) {
  render(
    <FormField label="Email" {...props}>
      {(control) => <Input {...control} />}
    </FormField>,
  );
  return screen.getByLabelText('Email');
}

describe('FormField', () => {
  it('links the hint to the control', () => {
    const input = renderField({ hint: 'We never share it.' });
    expect(input).toHaveAccessibleDescription('We never share it.');
    expect(input).toHaveAttribute('aria-invalid', 'false');
  });

  it('shows the error instead of the hint and marks the control invalid', () => {
    const input = renderField({
      hint: 'We never share it.',
      error: 'Required',
    });
    expect(input).toHaveAccessibleDescription('Required');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByText('We never share it.')).not.toBeInTheDocument();
  });
});
