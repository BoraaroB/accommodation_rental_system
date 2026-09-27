import type { UserProfile } from '@ars/shared';
import { LockIcon } from 'lucide-react';
import { Link } from 'react-router';
import { Button, buttonVariants } from '../../../components/ui/button';
import { signedOut } from '../../../store/authSlice';
import { useAppDispatch } from '../../../store/hooks';

/** The 403 page: signed in, but without the rights for this page. */
export function AccessDenied({ user }: { user: UserProfile }) {
  const dispatch = useAppDispatch();
  return (
    <section className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-16 text-center">
      <span
        aria-hidden="true"
        className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground"
      >
        <LockIcon className="size-5" />
      </span>
      <p className="text-sm font-medium text-muted-foreground">403</p>
      <h1 className="text-2xl font-semibold">
        You don&apos;t have access to this page
      </h1>
      <p className="text-sm text-muted-foreground">
        You are signed in as{' '}
        <span className="font-medium text-foreground">{user.email}</span>.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Link to="/" className={buttonVariants({ variant: 'outline' })}>
          Go to the home page
        </Link>
        {/* Signed out, the protected page sends the user to sign in and back. */}
        <Button onClick={() => dispatch(signedOut())}>
          Sign in with another account
        </Button>
      </div>
    </section>
  );
}
