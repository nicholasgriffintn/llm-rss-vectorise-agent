import { RemixBrowser } from '@remix-run/react';
import { startTransition, StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';

import { LocaleContextProvider } from './components/providers/locale';

const locales = window.navigator.languages;

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <LocaleContextProvider locales={locales}>
        <RemixBrowser />
      </LocaleContextProvider>
    </StrictMode>
  );
});
