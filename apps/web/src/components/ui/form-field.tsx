import { useId, type ReactNode } from 'react';
import { Field, FieldDescription, FieldError, FieldLabel } from './field';

/** Props `FormField` passes to its control, linking it to the label, hint and error. */
export interface FormFieldControlProps {
  id: string;
  'aria-invalid': boolean;
  'aria-describedby': string | undefined;
}

/** The id of the label of the control `controlId`, for controls that name themselves with more than the label. */
export function fieldLabelId(controlId: string): string {
  return `${controlId}-label`;
}

export interface FormFieldProps {
  label: string;
  /** The validation message; shown instead of the hint. */
  error?: string;
  hint?: string;
  className?: string;
  children: (control: FormFieldControlProps) => ReactNode;
}

/**
 * A labelled form control with a hint and a validation message, on the kit's
 * `Field`: `<FormField label="Email" error={…}>{(control) => <Input {...control} />}</FormField>`.
 * The ids tie the label, hint and error to the control for screen readers.
 */
export function FormField({
  label,
  error,
  hint,
  className,
  children,
}: FormFieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const hasMessage = error !== undefined || hint !== undefined;

  return (
    <Field data-invalid={error !== undefined} className={className}>
      <FieldLabel id={fieldLabelId(id)} htmlFor={id}>
        {label}
      </FieldLabel>
      {children({
        id,
        'aria-invalid': error !== undefined,
        'aria-describedby': hasMessage ? messageId : undefined,
      })}
      {error !== undefined ? (
        <FieldError id={messageId}>{error}</FieldError>
      ) : (
        hint !== undefined && (
          <FieldDescription id={messageId}>{hint}</FieldDescription>
        )
      )}
    </Field>
  );
}
