import { drizzle } from 'drizzle-orm/d1';
import * as schema from '~/drizzle/schema';

export default defineEventHandler(async (event) => {
  const db = drizzle(event.context.cloudflare.env.DB, { schema });

  const sources = await db.query.sources.findMany({
    orderBy: (sources, { desc }) => [desc(sources.createdAt)],
  });

  return sources;
});
