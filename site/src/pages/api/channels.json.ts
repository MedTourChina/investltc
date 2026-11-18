import type { APIRoute } from 'astro';
import { getChannels } from '../../lib/data';

export const GET: APIRoute = () => {
  const channels = getChannels().map((c) => ({
    ...c,
    frictionScore:
      Math.round(
        (c.friction.documents * 0.25 +
          c.friction.inPerson * 0.2 +
          c.friction.language * 0.2 +
          c.friction.minimum * 0.2 +
          c.friction.exit * 0.15) *
          100,
      ) / 100,
  }));

  return new Response(JSON.stringify({ generated: new Date().toISOString(), channels }, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    },
  });
};
