import puppeteer from '@cloudflare/puppeteer';

export async function getRandomSession(endpoint): Promise<string> {
  const sessions = await puppeteer.sessions(endpoint);
  console.log(`Sessions: ${JSON.stringify(sessions)}`);
  const sessionsIds = sessions
    .filter((v) => {
      return !v.connectionId; // remove sessions with workers connected to them
    })
    .map((v) => {
      return v.sessionId;
    });
  if (sessionsIds.length === 0) {
    return '';
  }

  const sessionId = sessionsIds[Math.floor(Math.random() * sessionsIds.length)];

  return sessionId!;
}
