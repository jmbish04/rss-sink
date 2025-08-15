import { drizzle } from 'drizzle-orm/d1';
import { eq, desc, lt } from 'drizzle-orm';
import { z } from 'zod';
import * as schema from '~/drizzle/schema';

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(24),
  cursor: z.coerce.number().int().optional(),
});

export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, querySchema.parse);

  const db = drizzle(event.context.cloudflare.env.DB, { schema });

  const posts = await db.query.posts.findMany({
    where: (posts, { and }) => and(
      eq(posts.isSaved, true),
      query.cursor ? lt(posts.id, query.cursor) : undefined
    ),
    orderBy: [desc(schema.posts.id)],
    limit: query.limit,
    with: {
      source: true,
      postTags: {
        with: {
          tag: true,
        },
      },
    },
  });

  let nextCursor = null;
  if (posts.length === query.limit) {
    nextCursor = posts[posts.length - 1].id;
  }

  return {
    posts,
    cursor: nextCursor,
  };
});
