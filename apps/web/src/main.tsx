import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router/dom';
import { router } from './app/router';
import { makeStore } from './store/store';
import { reportError } from './lib/logger';
import { ErrorBoundary } from './components/ui/error-boundary';
import './styles/index.css';

const store = makeStore();

createRoot(document.getElementById('root')!, {
  onUncaughtError: (error, errorInfo) => reportError(error, errorInfo),
  onCaughtError: (error, errorInfo) => {
    // The widget ErrorBoundary reports what it catches itself.
    if (!(errorInfo.errorBoundary instanceof ErrorBoundary)) {
      reportError(error, errorInfo);
    }
  },
  onRecoverableError: (error, errorInfo) => reportError(error, errorInfo),
}).render(
  <StrictMode>
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  </StrictMode>,
);
