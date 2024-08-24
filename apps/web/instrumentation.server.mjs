import * as Sentry from '@sentry/remix';

Sentry.init({
  dsn: 'https://ba9b2b2e4986dd0a6863df487c2bfc57@o981760.ingest.us.sentry.io/4507830266101760',
  tracesSampleRate: 1,
  autoInstrumentRemix: true,
});
