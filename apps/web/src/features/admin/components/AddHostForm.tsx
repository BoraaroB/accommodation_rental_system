import { hostInputSchema } from '@ars/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, type FieldError } from 'react-hook-form';
import { toast } from 'sonner';
import { getApiError } from '../../../api/errors';
import { FormAlert } from '../../../components/FormAlert';
import { Button } from '../../../components/ui/button';
import { FormField } from '../../../components/ui/form-field';
import { Input } from '../../../components/ui/input';
import { useAddHostMutation } from '../api';

function isAlreadyHost(error: unknown): boolean {
  return getApiError(error)?.code === 'ALREADY_HOST';
}

// The schema's rules in the admin's words.
function nameError(error: FieldError | undefined) {
  if (error === undefined) {
    return undefined;
  }
  switch (error.type) {
    case 'too_small':
      return 'Enter a name';
    case 'too_big':
      return 'Use at most 100 characters';
    default:
      return 'Remove the control characters from the name';
  }
}

function passwordError(error: FieldError | undefined) {
  if (error === undefined) {
    return undefined;
  }
  return error.type === 'too_small'
    ? 'Use at least 8 characters'
    : 'This password is too long';
}

// Possible improvement (not in the plan): invite a new host by e-mail, or make
// them change the first password, so the admin never knows it (D-053).
/**
 * Adds a host to the tenant (challenge item 12). A new e-mail gets an account
 * with this name and password; an existing account only becomes a host and
 * keeps its own name and password (D-053), which the form then says.
 */
export function AddHostForm({ tenantId }: { tenantId: string }) {
  const [addHost, adding] = useAddHostMutation();
  // The last host added with an account that already existed.
  const [existingAccount, setExistingAccount] = useState<string>();
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(hostInputSchema),
    defaultValues: { email: '', name: '', password: '' },
  });

  const submit = handleSubmit(async (host) => {
    setExistingAccount(undefined);
    const added = await addHost({ tenantId, host });
    if (added.error === undefined) {
      reset();
      toast.success(`${added.data.email} added as a host`);
      if (!added.data.accountCreated) {
        setExistingAccount(added.data.email);
      }
    } else if (isAlreadyHost(added.error)) {
      setError('email', {
        type: 'server',
        message: 'This account already hosts this tenant',
      });
    }
  });

  // An account that already hosts the tenant is shown on its field instead.
  const formError = isAlreadyHost(adding.error) ? undefined : adding.error;

  return (
    <form
      noValidate
      onSubmit={(event) => void submit(event)}
      className="flex flex-col gap-4"
    >
      <h3 className="font-medium">Add a host</h3>
      <FormAlert error={formError} />
      {existingAccount !== undefined && (
        <p
          role="status"
          className="rounded-lg bg-muted px-3 py-2 text-sm text-foreground"
        >
          {existingAccount} already had an account. It now hosts this tenant;
          its name and password were not changed.
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        <FormField
          label="E-mail"
          error={
            errors.email &&
            (errors.email.type === 'server'
              ? errors.email.message
              : 'Enter a valid e-mail address')
          }
        >
          {(field) => (
            <Input
              {...field}
              {...register('email')}
              type="email"
              autoComplete="off"
            />
          )}
        </FormField>
        <FormField
          label="Name"
          hint="Used for a new account only"
          error={nameError(errors.name)}
        >
          {(field) => (
            <Input {...field} {...register('name')} autoComplete="off" />
          )}
        </FormField>
        <FormField
          label="Password"
          hint="At least 8 characters; for a new account only"
          error={passwordError(errors.password)}
        >
          {(field) => (
            <Input
              {...field}
              {...register('password')}
              type="password"
              autoComplete="new-password"
            />
          )}
        </FormField>
      </div>
      <Button type="submit" className="md:self-end" disabled={isSubmitting}>
        Add host
      </Button>
    </form>
  );
}
