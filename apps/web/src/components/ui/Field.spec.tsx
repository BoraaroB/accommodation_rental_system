import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Field } from './Field';
import { Input } from './Input';

describe('Field', () => {
  it('labels the control and describes it with the hint', () => {
    render(
      <Field label="Email" hint="We never share it.">
        {(control) => <Input {...control} />}
      </Field>,
    );
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAccessibleDescription('We never share it.');
    expect(input).not.toBeInvalid();
  });

  it('marks the control invalid and describes it with the error', () => {
    render(
      <Field
        label="Email"
        hint="We never share it."
        error="Enter a valid email."
      >
        {(control) => <Input {...control} />}
      </Field>,
    );
    const input = screen.getByLabelText('Email');
    expect(input).toBeInvalid();
    expect(input).toHaveAccessibleDescription('Enter a valid email.');
    expect(screen.queryByText('We never share it.')).not.toBeInTheDocument();
  });
});
