import { Outlet, ScrollRestoration } from 'react-router';
import { Toaster } from '../../components/ui/sonner';

export function RootLayout() {
  return (
    <>
      <Outlet />
      {/* At most three toasts at a time, so a burst of errors cannot fill the screen. */}
      <Toaster position="bottom-right" visibleToasts={3} closeButton />
      {/* A new page starts at the top; back and forward restore the position. */}
      <ScrollRestoration />
    </>
  );
}
