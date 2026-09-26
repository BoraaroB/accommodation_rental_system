import { useId, type ReactNode } from 'react';

/** Props `Field` passes to its control, linking it to the label, hint and error. */
export interface FieldControlProps {
  id: string;
  'aria-invalid': boolean;
  'aria-describedby': string | undefined;
}

export interface FieldProps {
  label: string;
  /** The validation message; shown instead of the hint. */
  error?: string;
  hint?: string;
  children: (control: FieldControlProps) => ReactNode;
}

/**
 * A labelled form control with a hint and a validation message:
 * `<Field label="Email" error={…}>{(control) => <Input {...control} />}</Field>`.
 */
export function Field({ label, error, hint, children }: FieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error ?? hint;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-text">
        {label}
      </label>
      {children({
        id,
        'aria-invalid': error !== undefined,
        'aria-describedby': message === undefined ? undefined : messageId,
      })}
      {message !== undefined && (
        <p
          id={messageId}
          className={
            error === undefined ? 'text-sm text-muted' : 'text-sm text-danger'
          }
        >
          {message}
        </p>
      )}
    </div>
  );
}
