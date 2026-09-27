import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { RedirectIfSignedIn } from '../features/auth/components/RedirectIfSignedIn';
import { RegisterForm } from '../features/auth/components/RegisterForm';

/** Registration: always a client account, used on every portal (D-003, D-008). */
export function RegisterPage() {
  return (
    <div className="mx-auto w-full max-w-sm">
      <RedirectIfSignedIn>
        <Card>
          <CardHeader>
            <CardTitle>
              <h1 className="text-xl font-semibold">Create an account</h1>
            </CardTitle>
            <CardDescription>One account for every portal.</CardDescription>
          </CardHeader>
          <CardContent>
            <RegisterForm />
          </CardContent>
        </Card>
      </RedirectIfSignedIn>
    </div>
  );
}
