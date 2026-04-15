type AppEnv = {
  ENVIRONMENT?: string | null;
  USE_FIXTURES?: string | boolean | null;
};

function isEnabledFlag(value: string | boolean | null | undefined): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value !== 'string') {
    return false;
  }

  return value.toLowerCase() === 'true';
}

export function isDevelopmentEnvironment(env?: AppEnv | null): boolean {
  return (
    env?.ENVIRONMENT === 'development' ||
    (typeof process !== 'undefined' &&
      process.env?.ENVIRONMENT === 'development')
  );
}

export function shouldUseFixtures(env?: AppEnv | null): boolean {
  return (
    isEnabledFlag(env?.USE_FIXTURES) ||
    (typeof process !== 'undefined' && isEnabledFlag(process.env?.USE_FIXTURES))
  );
}
