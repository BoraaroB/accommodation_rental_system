import { loginSchema } from '@ars/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { Button } from '../../../components/ui/button';
import { FormField } from '../../../components/ui/form-field';
import { Input } from '../../../components/ui/input';
import { useLoginMutation } from '../api';
import { useRedirectParam } from '../hooks/useRedirectParam';
import { registerPath } from '../redirects';
import { FormAlert } from './FormAlert';

/**
 * Sign-in with e-mail and password. On success the token is kept and
 * `RedirectIfSignedIn` takes the user on.
 */
export function LoginForm() {
  const redirect = useRedirectParam();
  const [login, { error }] = useLoginMutation();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const submit = handleSubmit(async (input) => {
    await login(input);
  });

  return (
    <form
      noValidate
      onSubmit={(event) => void submit(event)}
      className="flex flex-col gap-4"
    >
      <FormAlert error={error} />
      <FormField
        label="E-mail"
        error={errors.email && 'Enter a valid e-mail address'}
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
        error={errors.password && 'Enter your password'}
      >
        {(control) => (
          <Input
            {...control}
            {...register('password')}
            type="password"
            autoComplete="current-password"
          />
        )}
      </FormField>
      <Button type="submit" size="lg" disabled={isSubmitting}>
        Sign in
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        No account yet?{' '}
        <Link
          to={registerPath(redirect)}
          className="font-medium text-primary hover:underline"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}
