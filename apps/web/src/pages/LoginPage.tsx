import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { LoginForm } from '../features/auth/components/LoginForm';
import { RedirectIfSignedIn } from '../features/auth/components/RedirectIfSignedIn';

/** The one sign-in page for every portal and both panels (D-065). */
// Possible improvement (not in the plan): show the portal of `?redirect=`
// ("Sign in to Adriatic Stays") in its branding.
export function LoginPage() {
  return (
    <div className="mx-auto w-full max-w-sm">
      <RedirectIfSignedIn>
        <Card>
          <CardHeader>
            <CardTitle>
              <h1 className="text-xl font-semibold">Sign in</h1>
            </CardTitle>
            <CardDescription>One account for every portal.</CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
      </RedirectIfSignedIn>
    </div>
  );
}
