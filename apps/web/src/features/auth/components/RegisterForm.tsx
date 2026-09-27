import { registerSchema } from '@ars/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type FieldError } from 'react-hook-form';
import { Link } from 'react-router';
import { getApiError } from '../../../api/errors';
import { FormAlert } from '../../../components/FormAlert';
import { Button } from '../../../components/ui/button';
import { FormField } from '../../../components/ui/form-field';
import { Input } from '../../../components/ui/input';
import { useLoginMutation, useRegisterMutation } from '../api';
import { useRedirectParam } from '../hooks/useRedirectParam';
import { signInPath } from '../redirects';

function isEmailTaken(error: unknown): boolean {
  return getApiError(error)?.code === 'EMAIL_TAKEN';
}

// The schema's password rules in the visitor's words.
function passwordError(error: FieldError | undefined) {
  if (error === undefined) {
    return undefined;
  }
  return error.type === 'too_small'
    ? 'Use at least 8 characters'
    : 'This password is too long';
}

/**
 * Registration of a client account (D-008). The new account is signed in
 * straight away with the same credentials; `RedirectIfSignedIn` takes the
 * user on.
 */
export function RegisterForm() {
  const redirect = useRedirectParam();
  const [createAccount, registration] = useRegisterMutation();
  const [login, signIn] = useLoginMutation();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const submit = handleSubmit(async (input) => {
    const created = await createAccount(input);
    if (created.error === undefined) {
      await login({ email: input.email, password: input.password });
    } else if (isEmailTaken(created.error)) {
      setError('email', {
        type: 'server',
        message: 'An account with this e-mail already exists',
      });
    }
  });

  // A taken e-mail is shown on its field instead.
  const formError = isEmailTaken(registration.error)
    ? undefined
    : registration.error;

  return (
    <form
      noValidate
      onSubmit={(event) => void submit(event)}
      className="flex flex-col gap-4"
    >
      <FormAlert error={formError} />
      {registration.isSuccess && signIn.isError && (
        // The account exists now; submitting again would say the e-mail is taken.
        <p
          role="alert"
          className="rounded-lg bg-muted px-3 py-2 text-sm text-foreground"
        >
          Your account was created, but signing in failed.{' '}
          <Link
            to={signInPath(redirect)}
            className="font-medium text-primary hover:underline"
          >
            Sign in
          </Link>
        </p>
      )}
      <FormField label="Name" error={errors.name && 'Enter your name'}>
        {(control) => (
          <Input {...control} {...register('name')} autoComplete="name" />
        )}
      </FormField>
      <FormField
        label="E-mail"
        error={
          errors.email &&
          (errors.email.type === 'server'
            ? errors.email.message
            : 'Enter a valid e-mail address')
        }
      >
        {(control) => (
          <Input
            {...control}
            {...register('email')}
            type="email"
            autoComplete="email"
          />
        )}
      </FormField>
      <FormField
        label="Password"
        hint="At least 8 characters"
        error={passwordError(errors.password)}
      >
        {(control) => (
          <Input
            {...control}
            {...register('password')}
            type="password"
            autoComplete="new-password"
          />
        )}
      </FormField>
      <Button type="submit" size="lg" disabled={isSubmitting}>
        Create account
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link
          to={signInPath(redirect)}
          className="font-medium text-primary hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
