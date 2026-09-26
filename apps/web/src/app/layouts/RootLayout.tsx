import { Outlet } from 'react-router';
import { Toasts } from '../../components/Toasts';

export function RootLayout() {
  return (
    <>
      <Outlet />
      <Toasts />
    </>
  );
}
